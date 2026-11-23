/**
 * Log.gs: the "Form auto-responses log" spreadsheet, created on first run in the account
 * that owns this project. It is the only record of who submitted what and what was sent.
 * Nothing about supporters goes to the execution log (console) or to error emails.
 */

var LOG_HEADERS = ['time', 'form', 'variant', 'language', 'email', 'event id', 'status', 'reason', 'fingerprint'];
var LOG_HISTORY_MAX_ = 50;

function getLogSheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP.LOG_SHEET_ID);
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(APP.LOG_SHEET_NAME);
    props.setProperty(PROP.LOG_SHEET_ID, ss.getId());
    var sh = ss.getSheets()[0];
    sh.setName('log');
    sh.appendRow(LOG_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, LOG_HEADERS.length).setFontWeight('bold');
  }
  return ss.getSheets()[0];
}

/** This address's earlier rows (most recent last), as plain objects for decide(). */
function readHistory(sheet, email) {
  if (!email) return [];
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var cells = sheet.getRange(2, 5, last - 1, 1).createTextFinder(email).matchEntireCell(true).matchCase(false).findAll();
  return cells.slice(-LOG_HISTORY_MAX_).map(function (c) {
    var r = sheet.getRange(c.getRow(), 1, 1, LOG_HEADERS.length).getValues()[0];
    return {
      time: new Date(r[0]).getTime(), form: String(r[1]), variant: String(r[2]), lang: String(r[3]),
      email: String(r[4]).toLowerCase(), eventId: String(r[5]), status: String(r[6]), reason: String(r[7]),
      fp: String(r[8])
    };
  });
}

function appendLog(sheet, row) {
  // A cell that starts with = + - @ would be read as a formula; keep it as text.
  sheet.appendRow(row.map(function (v) {
    return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
  }));
}
