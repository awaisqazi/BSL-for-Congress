/**
 * Triggers.gs: run these by hand from the Apps Script editor (pick the function, press Run).
 *
 *   setup()           copy the form ids and the campaign address from Local.gs into
 *                     Script Properties, write missing defaults, create the log sheet
 *   installTriggers() one onFormSubmit trigger per form id that is set
 *   removeTriggers()  delete every trigger this project has (the fast off switch)
 *   turnOff()         set ENABLED to false (log only, nothing is sent)
 *   status()          per form: id set, can this account open it, titles found, trigger on
 */

function setup() {
  if (typeof LOCAL_FORM_IDS === 'undefined') throw new Error('Local.gs is missing: copy Local.example.gs to a file named Local and fill it in.');
  var sp = PropertiesService.getScriptProperties();
  var props = sp.getProperties();
  FORM_KEYS.forEach(function (k) {
    var id = String(LOCAL_FORM_IDS[k] || '').trim();
    if (id && id.indexOf('PASTE') < 0) sp.setProperty(PROP.formId(k), id);
  });
  if (typeof LOCAL_CAMPAIGN_ADDRESS !== 'undefined' && LOCAL_CAMPAIGN_ADDRESS) {
    sp.setProperty(PROP.OWNER_EMAIL, LOCAL_CAMPAIGN_ADDRESS);
    if (!props[PROP.REPLY_TO]) sp.setProperty(PROP.REPLY_TO, LOCAL_CAMPAIGN_ADDRESS);
  }
  Object.keys(PROP_DEFAULTS).forEach(function (name) {
    if (props[name] == null || props[name] === '') sp.setProperty(name, PROP_DEFAULTS[name]);
  });
  var sheet = getLogSheet();
  Logger.log('Setup done. Log sheet: ' + sheet.getParent().getUrl());
  status();
}

function installTriggers() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var existing = ScriptApp.getProjectTriggers();
  FORM_KEYS.forEach(function (k) {
    var id = props[PROP.formId(k)];
    if (!id) { Logger.log(k + ': no form id, skipped'); return; }
    existing.forEach(function (t) {
      if (t.getHandlerFunction() === 'onFormSubmit' && t.getTriggerSourceId() === id) ScriptApp.deleteTrigger(t);
    });
    try {
      ScriptApp.newTrigger('onFormSubmit').forForm(id).onFormSubmit().create();
      Logger.log(k + ': trigger installed');
    } catch (e) {
      Logger.log(k + ': could not install the trigger (' + e.message + '). This account needs edit access to that form.');
    }
  });
}

function removeTriggers() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); n++; });
  Logger.log('Removed ' + n + ' trigger(s). Nothing will run until installTriggers() is run again.');
}

function turnOff() {
  PropertiesService.getScriptProperties().setProperty(PROP.ENABLED, 'false');
  Logger.log('ENABLED is now false: submissions are logged, nothing is sent.');
}

function status() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var triggers = ScriptApp.getProjectTriggers();
  var out = [];
  out.push('ENABLED=' + (props[PROP.ENABLED] || '(not set)') +
    '  TEST_RECIPIENT=' + (props[PROP.TEST_RECIPIENT] ? 'set' : '(not set)') +
    '  REPLY_TO=' + (props[PROP.REPLY_TO] || '(not set)'));
  try { out.push('Mail quota left today: ' + MailApp.getRemainingDailyQuota() + ' (reserve ' + APP.QUOTA_RESERVE + ')'); } catch (e) { out.push('Mail quota: not authorized yet'); }
  out.push('Log sheet: ' + (props[PROP.LOG_SHEET_ID] ? 'https://docs.google.com/spreadsheets/d/' + props[PROP.LOG_SHEET_ID] + '/edit' : '(not created; run setup)'));
  FORM_KEYS.forEach(function (k) {
    var id = props[PROP.formId(k)];
    var line = k + ' (' + FORM_LABELS[k] + '): ';
    if (!id) { out.push(line + 'id NOT set'); return; }
    line += 'id set; ';
    try {
      var form = FormApp.openById(id);
      var have = {};
      form.getItems().forEach(function (it) { have[normTitle_(it.getTitle())] = true; });
      var missing = Object.keys(FORM_TITLES[k]).filter(function (t) { return !have[normTitle_(t)]; });
      line += 'opens OK ("' + form.getTitle() + '"); ' + (missing.length ? 'MISSING titles: ' + missing.join(' | ') + '; ' : 'all titles found; ');
    } catch (e) {
      line += 'CANNOT open (' + e.message + '); ';
    }
    var on = triggers.some(function (t) { return t.getHandlerFunction() === 'onFormSubmit' && t.getTriggerSourceId() === id; });
    line += on ? 'trigger ON; ' : 'trigger OFF; ';
    line += PROP.formEnabled(k) + '=' + (props[PROP.formEnabled(k)] || '(not set)');
    out.push(line);
  });
  Logger.log(out.join('\n'));
  return out.join('\n');
}
