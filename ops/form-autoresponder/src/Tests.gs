/**
 * Tests.gs: sendSamplesToSelf() sends one email of each kind to the campaign account
 * itself (OWNER_EMAIL from setup), built from the fictional people in Fixtures.gs and the
 * live event feed. It ignores ENABLED and TEST_RECIPIENT, never writes to the log sheet,
 * and never mails anyone else. Subjects start with "[SAMPLE] ".
 */

function sendSamplesToSelf() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var me = props[PROP.OWNER_EMAIL];
  if (!me) throw new Error('OWNER_EMAIL is not set: fill LOCAL_CAMPAIGN_ADDRESS in Local.gs and run setup() first.');
  var feed = getFeed();
  var sent = 0, skipped = 0;
  FIXTURES.forEach(function (f) {
    if (!f.sample) return;
    var answers = Object.assign({}, f.answers);
    var d = decide(f.form, answers, {
      feed: f.feedDown ? null : feed,
      history: hydrateHistory(f.history, f.now, asText_(answers.email)),
      now: f.now
    });
    if (!d.send) { skipped++; return; }
    var att = fetchAttachments(d.attachments);
    MailApp.sendEmail({
      to: me, subject: '[SAMPLE] ' + d.subject, body: d.text, htmlBody: d.html,
      name: APP.FROM_NAME, replyTo: me, attachments: att.blobs
    });
    sent++;
  });
  Logger.log('Sent ' + sent + ' sample email(s) to ' + me + (skipped ? '; ' + skipped + ' fixture(s) did not produce an email with today\'s feed' : '') + '.');
}
