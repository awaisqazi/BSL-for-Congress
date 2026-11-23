/**
 * Mail.gs: the trigger handler. Every form's installable trigger calls onFormSubmit(e).
 * Decisions come from decide() in Render.gs; this file only reads the event, the log,
 * the feed and the switches, then sends with MailApp and writes one log row.
 */

function onFormSubmit(e) {
  var formKey = null, email = '';
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    formKey = formKeyForId_(props, e && e.source ? e.source.getId() : '');
    if (!formKey) return;
    var pairs = e.response.getItemResponses().map(function (ir) {
      return { title: ir.getItem().getTitle(), response: ir.getResponse() };
    });
    var answers = mapAnswers(formKey, pairs);
    email = asText_(answers.email).toLowerCase();
    processSubmission_(formKey, answers, props);
  } catch (err) {
    recordError_(formKey, email, err);
  }
}

function formKeyForId_(props, formId) {
  if (!formId) return null;
  for (var i = 0; i < FORM_KEYS.length; i++) {
    if (props[PROP.formId(FORM_KEYS[i])] === formId) return FORM_KEYS[i];
  }
  return null;
}

// REPLY_TO and OWNER_EMAIL are set by setup() from Local.gs. Without them, MailApp's
// default (the sending account) is used, which is the same campaign address.
function replyTo_(props) {
  return props[PROP.REPLY_TO] || props[PROP.OWNER_EMAIL] || '';
}

function processSubmission_(formKey, answers, props) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getLogSheet();
    var email = asText_(answers.email).toLowerCase();
    var history = readHistory(sheet, email);
    var feed = getFeed();
    var d = decide(formKey, answers, { feed: feed, history: history, now: nowChicagoIso() });
    if (d.send && !feed && d.form === 'rsvp') d.reason = d.reason || 'feed_unavailable';
    var g = gate(d, props, d.send ? MailApp.getRemainingDailyQuota() : null);
    var reason = g.reason;
    if (g.send) {
      var att = fetchAttachments(g.attachments);
      if (att.failed) reason = (reason ? reason + '; ' : '') + 'ics_not_attached';
      var msg = { to: g.to, subject: g.subject, body: g.text, htmlBody: g.html, name: APP.FROM_NAME, attachments: att.blobs };
      if (replyTo_(props)) msg.replyTo = replyTo_(props);
      MailApp.sendEmail(msg);
    }
    appendLog(sheet, [new Date(), formKey, d.variant, d.lang, d.email, d.eventId, g.status, reason, d.fingerprint]);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Log the failure (the sheet is the record) and, at most once an hour, tell the campaign
 * address how many submissions failed. The email names forms and counts only.
 */
function recordError_(formKey, email, err) {
  var msg = String(err && err.message ? err.message : err).slice(0, 300);
  try {
    appendLog(getLogSheet(), [new Date(), formKey || 'unknown', '', '', email || '', '', 'error', msg, '']);
  } catch (e) { /* the sheet itself failed; nothing more to do safely */ }
  try {
    var sp = PropertiesService.getScriptProperties();
    var pending = JSON.parse(sp.getProperty(PROP.PENDING_ERRORS) || '{}');
    pending[formKey || 'unknown'] = (pending[formKey || 'unknown'] || 0) + 1;
    var last = Number(sp.getProperty(PROP.LAST_ERROR_MAIL) || 0);
    if (Date.now() - last < APP.ERROR_MAIL_EVERY_MS) {
      sp.setProperty(PROP.PENDING_ERRORS, JSON.stringify(pending));
      return;
    }
    var props = sp.getProperties();
    var to = replyTo_(props);
    if (!to) return;
    var lines = Object.keys(pending).map(function (k) { return '- ' + (FORM_LABELS[k] || k) + ': ' + pending[k]; });
    var url = props[PROP.LOG_SHEET_ID] ? 'https://docs.google.com/spreadsheets/d/' + props[PROP.LOG_SHEET_ID] + '/edit' : '(log sheet not created)';
    MailApp.sendEmail({
      to: to,
      subject: 'Form confirmations: some submissions were not processed',
      body: 'Some form submissions could not be processed since the last notice:\n\n' + lines.join('\n') +
        '\n\nThe rows marked "error" in the log sheet have the details:\n' + url + '\n',
      name: APP.FROM_NAME
    });
    sp.setProperty(PROP.LAST_ERROR_MAIL, String(Date.now()));
    sp.setProperty(PROP.PENDING_ERRORS, '{}');
  } catch (e) { /* never let the notice itself throw */ }
}
