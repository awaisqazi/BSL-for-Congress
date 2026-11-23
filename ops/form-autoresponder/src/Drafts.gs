/**
 * Drafts.gs: test emails as Gmail DRAFTS in the campaign account, instead of sending them.
 * Nothing here sends anything. Each draft is built by decide() (Render.gs), the same path
 * onFormSubmit uses, from the fictional people in Fixtures.gs and the live event feed.
 *
 *   draftFewSamples()  three drafts: event sign-up canvass (1A, both languages),
 *                      Springfield Lobby Day seat on the bus (2A, both), volunteer
 *                      (doors + Spanish + social media, both)
 *   draftAllSamples()  one draft per sample fixture (the same set sendSamplesToSelf uses)
 *
 * Drafts are addressed to OWNER_EMAIL with subjects starting "[SAMPLE] ". They need the
 * gmail.compose permission and the Advanced Gmail service (appsscript.json). Production
 * sending (MailApp in Mail.gs) does not use any of this.
 */

var DRAFT_FEW_ = [
  { form: 'rsvp', id: 'canvass' },
  { form: 'lobbyday', id: 'bus' },
  { form: 'volunteer', id: 'doors-social' }
];

function draftFewSamples() {
  var picked = DRAFT_FEW_.map(function (want) {
    var f = FIXTURES.filter(function (x) { return x.form === want.form && x.id === want.id && !x.fileLang; })[0];
    if (!f) throw new Error('Fixture not found: ' + want.form + '/' + want.id);
    return f;
  });
  draftFixtures_(picked);
}

function draftAllSamples() {
  draftFixtures_(FIXTURES.filter(function (f) { return f.sample; }));
}

function draftFixtures_(list) {
  var props = PropertiesService.getScriptProperties().getProperties();
  var me = props[PROP.OWNER_EMAIL];
  if (!me) throw new Error('OWNER_EMAIL is not set: fill LOCAL_CAMPAIGN_ADDRESS in Local.gs and run setup() first.');
  var replyTo = replyTo_(props) || me;
  var feed = getFeed();
  var made = 0, skipped = 0;
  list.forEach(function (f) {
    var answers = Object.assign({}, f.answers);
    var d = decide(f.form, answers, {
      feed: f.feedDown ? null : feed,
      history: hydrateHistory(f.history, f.now, asText_(answers.email)),
      now: f.now
    });
    if (!d.send) { skipped++; return; }
    var att = fetchAttachments(d.attachments);
    var raw = buildRawMessage_({
      to: me, fromName: APP.FROM_NAME, from: me, replyTo: replyTo,
      subject: '[SAMPLE] ' + d.subject, text: d.text, html: d.html, attachments: att.blobs
    });
    Gmail.Users.Drafts.create({ message: { raw: raw } }, 'me');
    made++;
  });
  Logger.log('Created ' + made + ' draft(s) for ' + me + (skipped ? '; ' + skipped + ' fixture(s) did not produce an email with today\'s feed' : '') + '. Nothing was sent.');
}

/**
 * An RFC 5322 message, base64url-encoded for the Gmail API:
 * multipart/mixed [ multipart/alternative [ text/plain, text/html ], text/calendar ... ].
 */
function buildRawMessage_(m) {
  var stamp = String(Date.now()) + String(Math.floor(Math.random() * 1e6));
  var mixed = 'mixed_' + stamp, alt = 'alt_' + stamp;
  var CRLF = '\r\n';
  var lines = [
    'MIME-Version: 1.0',
    'To: ' + m.to,
    'From: "' + m.fromName.replace(/["\\]/g, '') + '" <' + m.from + '>',
    'Reply-To: ' + m.replyTo,
    'Subject: ' + encodeHeaderWord_(m.subject),
    'Content-Type: multipart/mixed; boundary="' + mixed + '"',
    '',
    '--' + mixed,
    'Content-Type: multipart/alternative; boundary="' + alt + '"',
    '',
    '--' + alt,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76_(Utilities.base64Encode(m.text, Utilities.Charset.UTF_8)),
    '--' + alt,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76_(Utilities.base64Encode(m.html, Utilities.Charset.UTF_8)),
    '--' + alt + '--'
  ];
  (m.attachments || []).forEach(function (blob) {
    var name = String(blob.getName()).replace(/["\\\r\n]/g, '');
    lines.push(
      '--' + mixed,
      'Content-Type: text/calendar; charset=UTF-8; name="' + name + '"',
      'Content-Disposition: attachment; filename="' + name + '"',
      'Content-Transfer-Encoding: base64',
      '',
      wrap76_(Utilities.base64Encode(blob.getBytes()))
    );
  });
  lines.push('--' + mixed + '--', '');
  return Utilities.base64EncodeWebSafe(lines.join(CRLF), Utilities.Charset.UTF_8);
}

/** RFC 2047 =?UTF-8?B?...?= words of at most 45 UTF-8 bytes each, folded onto new lines. */
function encodeHeaderWord_(s) {
  var words = [], chunk = '', bytes = 0;
  Array.from(String(s)).forEach(function (ch) {
    var cp = ch.codePointAt(0);
    var n = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + n > 45) { words.push(chunk); chunk = ''; bytes = 0; }
    chunk += ch; bytes += n;
  });
  if (chunk) words.push(chunk);
  return words.map(function (w) {
    return '=?UTF-8?B?' + Utilities.base64Encode(w, Utilities.Charset.UTF_8) + '?=';
  }).join('\r\n ');
}

function wrap76_(b64) {
  return String(b64).replace(/(.{76})/g, '$1\r\n').replace(/\r\n$/, '');
}
