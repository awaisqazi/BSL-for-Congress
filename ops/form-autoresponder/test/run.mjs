#!/usr/bin/env node
// Harness for the form confirmation emails. No dependencies.
//
//   node ops/form-autoresponder/test/run.mjs            checks + previews + PNGs
//   node ops/form-autoresponder/test/run.mjs --no-shots checks + previews, no PNGs
//
// 1. Regenerates src/Shell.gs from shell/shell.html and shell/shell.txt.
// 2. Loads the .gs files into a Node vm (they are plain JavaScript; Apps Script services
//    are only touched inside functions this harness never calls).
// 3. Runs every fixture in src/Fixtures.gs against the local dist/events/feed.json,
//    asserts the expected variant or skip reason, and checks every rendered email.
// 4. Writes each email as .html and .txt, PNGs at 375 px (600 px for a few) and a
//    gallery index.html into the review folder (PREVIEWS_DIR, default: ops/form-autoresponder/previews).

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REPO = path.resolve(ROOT, '..', '..');
const SRC = path.join(ROOT, 'src');
const OUT = process.env.PREVIEWS_DIR || path.join(ROOT, 'previews');
const PROFILES = path.join(os.tmpdir(), 'form-autoresponder-prof');
const SHOTS = !process.argv.includes('--no-shots');
// Playwright's separate headless shell only (never the installed Chrome app).
const BIN = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell');

let failures = 0, checks = 0, listsChecked = 0;
const fail = (msg) => { failures++; console.log('  FAIL ' + msg); };
const ok = (cond, msg) => { checks++; if (!cond) fail(msg); return cond; };

// ---------------------------------------------------------------- 1. Shell.gs
const shellHtml = fs.readFileSync(path.join(ROOT, 'shell', 'shell.html'), 'utf8');
const shellTxt = fs.readFileSync(path.join(ROOT, 'shell', 'shell.txt'), 'utf8');
const shellGs = '/**\n * Shell.gs: GENERATED from ../shell/shell.html and ../shell/shell.txt by test/run.mjs.\n' +
  ' * Do not edit here: edit the shell files and run the harness, then paste this file.\n */\n\n' +
  'var SHELL_HTML = ' + JSON.stringify(shellHtml) + ';\n\nvar SHELL_TXT = ' + JSON.stringify(shellTxt) + ';\n';
const shellPath = path.join(SRC, 'Shell.gs');
if (!fs.existsSync(shellPath) || fs.readFileSync(shellPath, 'utf8') !== shellGs) {
  fs.writeFileSync(shellPath, shellGs);
  console.log('Shell.gs regenerated from shell/.');
}

// ---------------------------------------------------------------- 2. load the .gs files
const ORDER = ['Config.gs', 'Copy.gs', 'Shell.gs', 'Render.gs', 'Feed.gs', 'Log.gs', 'Mail.gs', 'Triggers.gs', 'Tests.gs', 'Fixtures.gs'];
const present = fs.readdirSync(SRC).filter((f) => f.endsWith('.gs') && !f.startsWith('Local'));
for (const f of present) if (!ORDER.includes(f)) ORDER.push(f);
const ctx = vm.createContext({ console });
for (const f of ORDER) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
const G = ctx;
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'appsscript.json'), 'utf8'));

// ---------------------------------------------------------------- feed
const feedPath = path.join(REPO, 'dist', 'events', 'feed.json');
if (!fs.existsSync(feedPath)) { console.error('Missing ' + feedPath + ': run `npm run build` first.'); process.exit(2); }
const rawFeed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));

// ---------------------------------------------------------------- helpers
const inv = {};
for (const k of Object.keys(G.FORM_TITLES)) { inv[k] = {}; for (const [t, key] of Object.entries(G.FORM_TITLES[k])) inv[k][key] = t; }
function toPairs(form, answers) {
  // Back to Google's shape, with stray spaces around the titles, so the title map is tested too.
  return Object.entries(answers).map(([key, v]) => ({
    title: key === 'language' ? '  Language / Idioma ' : '  ' + inv[form][key].replace(/ /g, '  ') + ' ',
    response: v
  }));
}
const decodeEntities = (s) => s.replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function visibleText(html) {
  return decodeEntities(html.replace(/<head>[\s\S]*?<\/head>/i, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
}
const OWN = /^(www\.)?sigchofor25\.com$/i;
function thirdPartyInText(text, allowUrls) {
  const bad = [];
  for (const m of text.matchAll(/\bhttps?:\/\/([^\/\s)]+)(\S*)/g)) {
    const host = m[1].toLowerCase();
    if (OWN.test(host)) continue;
    if (allowUrls && host === 'calendar.google.com') continue;
    if (allowUrls && host === 'www.google.com' && m[2].startsWith('/maps')) continue;
    bad.push(m[0]);
  }
  const stripped = text.replace(/\bhttps?:\/\/\S+/g, ' ');
  for (const m of stripped.matchAll(/\b((?:[a-z0-9-]+\.)+(?:com|org|net|gov|io|co|us|edu))\b/gi)) {
    const d = m[1].toLowerCase();
    if (OWN.test(d) || d === 'elections.il.gov') continue; // the State Board notice names its site, as the site footer does
    bad.push(d);
  }
  return bad;
}
// Footer lines by language: the start of every footer string in Copy.gs, up to its first merge field.
const FOOT_PREFIX = { en: [], es: [] };
for (const L of ['en', 'es']) {
  const C = G.COPY.common[L];
  const strs = [C.paid_for, C.state_board, C.not_you, G.COPY.general[L].texting, G.COPY.rsvp[L].texting];
  for (const k of ['rsvp', 'lobbyday', 'volunteer', 'petition', 'canvass']) strs.push(G.COPY[k][L].why);
  for (const s of strs) FOOT_PREFIX[L].push(String(s).split('{')[0].slice(0, 30));
}
const footerLang = (t) => ['en', 'es'].find((L) => FOOT_PREFIX[L].some((p) => t.trim().startsWith(p))) || '';
// True when no English line comes after a Spanish one, and both languages are present.
const grouped = (cls) => cls.includes('en') && cls.includes('es') && cls.lastIndexOf('en') < cls.indexOf('es');
function checkRendered(label, d) {
  const vis = visibleText(d.html);
  const all = [d.subject, d.preheader, d.html, d.text].join('\n');
  ok(!/\u2014/.test(all), label + ': emdash found');
  ok(!/\{\{\w+\}\}/.test(all), label + ': unfilled {{placeholder}}');
  ok(!/<!-- (BEGIN|END|IF|ENDIF) \w+ -->/.test(d.html + d.text), label + ': leftover block marker');
  ok(!/\{\w+\}/.test(vis + '\n' + d.text + d.subject), label + ': unfilled {merge field}');
  ok(!/\b(undefined|null|NaN)\b/.test(vis + '\n' + d.text + '\n' + d.subject), label + ': "undefined" or "null" in output');
  ok(!/\*\*|\]\(/.test(vis + d.text), label + ': unparsed markup');
  const badHtml = thirdPartyInText(vis, false);
  ok(!badHtml.length, label + ': third-party URL in visible HTML text: ' + badHtml.join(', '));
  const badTxt = thirdPartyInText(d.text, true);
  ok(!badTxt.length, label + ': third-party URL in plain text: ' + badTxt.join(', '));
  for (const line of d.text.split('\n')) {
    if (/calendar\.google\.com|google\.com\/maps/.test(line)) ok(/^https:\/\//.test(line.trim()), label + ': long URL not on its own line');
  }
  for (const m of d.html.matchAll(/href="([^"]*)"/g)) ok(/^https:\/\//.test(m[1]), label + ': non-https href ' + m[1]);
  ok(d.subject.length < 60, label + ': subject is ' + d.subject.length + ' chars: ' + d.subject);
  ok(!/\b(Claude|AI|bot|bots|automation|automated)\b/i.test(vis + d.text), label + ': forbidden word');
  const kb = Buffer.byteLength(d.html) / 1024;
  if (d.lang === 'both') ok(kb < 80, label + ': both-mode HTML is ' + kb.toFixed(1) + ' KB');
  ok(kb < 100, label + ': HTML is ' + kb.toFixed(1) + ' KB (Gmail clips at 102 KB)');
  for (const a of d.attachments) ok(/^https:\/\/sigchofor25\.com\/events\/[\w-]+\.ics$/.test(a.url) && /\.ics$/.test(a.filename), label + ': bad attachment ' + JSON.stringify(a));
  // No web address left as bare text in the HTML (mail apps would auto-link it in their own color).
  const outsideLinks = visibleText(d.html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' '));
  const bare = outsideLinks.match(/\b(?:[a-z0-9-]+\.)+(?:com|org|net|gov|edu|us)\b/gi);
  ok(!bare, label + ': domain shown as text outside a link: ' + (bare || []).join(', '));
  // Every footer link has an inline color that reads on the blue band.
  const footer = d.html.slice(d.html.indexOf('<!-- FOOTER -->'));
  for (const m of footer.matchAll(/<a\b[^>]*>/g)) ok(/style="[^"]*color:#fbe2ba/i.test(m[0]), label + ': footer link without the cream color: ' + m[0]);
  // Both-language footer: the whole English footer, then the whole Spanish one (no interleaving).
  if (d.lang === 'both') {
    const langs = [...footer.matchAll(/<(?:div|p) lang="(en|es)"[^>]*>([\s\S]*?)<\/(?:div|p)>/g)].map((m) => ({ L: m[1], t: decodeEntities(m[2].replace(/<[^>]+>/g, '')) }));
    const htmlCls = langs.map((x) => footerLang(x.t));
    ok(langs.length >= 4 && langs.every((x, i) => htmlCls[i] === x.L), label + ': footer HTML line with a wrong or unknown language: ' + langs.filter((x, i) => htmlCls[i] !== x.L).map((x) => x.t.slice(0, 40)).join(' / '));
    ok(grouped(htmlCls), label + ': footer HTML interleaves English and Spanish: ' + htmlCls.join(' '));
    const tFoot = d.text.slice(d.text.lastIndexOf('------------------------------\nsigchofor25.com\n'));
    const paras = tFoot.split(/\n\n+/).slice(1).map((s) => s.trim()).filter((s) => s && !/^-+$/.test(s));
    const txtCls = paras.map(footerLang);
    ok(paras.length >= 4 && txtCls.every(Boolean), label + ': footer text line with an unknown language: ' + paras.filter((p, i) => !txtCls[i]).map((p) => p.slice(0, 40)).join(' / '));
    ok(grouped(txtCls), label + ': footer text interleaves English and Spanish: ' + txtCls.join(' '));
    ok(txtCls.filter((x) => x === 'en').length === txtCls.filter((x) => x === 'es').length, label + ': footer text has unequal English and Spanish lines');
  }
  // Every event row links its own place: its calendar card on our site, or the Lobby Day page.
  const rowHrefs = [...d.html.matchAll(/<p class="h"[^>]*><a class="h" href="([^"]+)"/g)].map((m) => m[1]);
  ok(rowHrefs.length === (d.meta.rows || 0) * (d.lang === 'both' ? 2 : 1), label + ': row link count ' + rowHrefs.length + ' vs ' + d.meta.rows + ' rows');
  for (const h of rowHrefs) ok(/^https:\/\/sigchofor25\.com\/volunteer\/#cal-\d{4}-\d\d-\d\d$/.test(h) || h === 'https://sigchofor25.com/lobbyday/', label + ': event row links ' + h);
  for (const h of d.meta.rowUrls) ok(rowHrefs.includes(h), label + ': row URL lost in the HTML (fragment stripped?) ' + h);
  // The Lobby Day card date has no stray period.
  ok(!/(December 2|2 de diciembre)\./i.test(vis), label + ': "December 2." with a trailing period in the HTML');
  // Every list of events reads in date order (a Socialist Slate row may only come last).
  for (const list of eventLists(d.text)) {
    listsChecked++;
    const main = list.filter((x) => !x.slate);
    ok(main.every((x, i) => i === 0 || x.key >= main[i - 1].key), label + ': list out of date order: ' + list.map((x) => x.line).join(' / '));
    ok(list.findIndex((x) => x.slate) < 0 || list.findIndex((x) => x.slate) === list.length - 1, label + ': slate row not last');
  }
  return kb;
}
// Lists of dated events in the plain-text email: "* Sat Dec 5, ..." rows and "- Sat Dec 5, ..." items.
const MONTHS = { jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, oct: 10, nov: 11, dec: 12, dic: 12 };
function dateKey(s) {
  let m = s.match(/^[*-] \S+ ([A-Za-z]{3}) (\d{1,2}),/), mon, day;
  if (m) { mon = MONTHS[m[1].toLowerCase()]; day = +m[2]; }
  else if ((m = s.match(/^[*-] \S+ (\d{1,2}) ([a-z]{3}),/))) { mon = MONTHS[m[2]]; day = +m[1]; }
  if (!mon) return null;
  return (mon < 7 ? mon + 12 : mon) * 100 + day; // the campaign runs Oct 2026 to Feb 2027
}
function eventLists(text) {
  const lists = [];
  let cur = null, slateNext = false;
  for (const line of text.split('\n')) {
    const key = /^[*-] /.test(line) ? dateKey(line) : null;
    if (key != null) {
      if (!cur) { cur = []; lists.push(cur); }
      cur.push({ key, line, slate: slateNext });
      slateNext = false;
    } else if (/^\[.+\]$/.test(line)) {
      slateNext = true;
    } else if (!(line === '' || /^ {2}/.test(line))) {
      cur = null;
    }
  }
  return lists;
}

// ---------------------------------------------------------------- 3. fixtures
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const results = [];
console.log('Fixtures');
for (const f of G.FIXTURES) {
  const answers = G.mapAnswers(f.form, toPairs(f.form, f.answers));
  ok(JSON.stringify(Object.keys(answers).sort()) === JSON.stringify(Object.keys(f.answers).sort()), f.form + '/' + f.id + ': title map lost a question');
  const feed = f.feedDown ? null : G.slimFeed(rawFeed, f.now.slice(0, 10));
  const history = G.hydrateHistory(f.history, f.now, String(f.answers.email || ''));
  let d;
  try { d = G.decide(f.form, answers, { feed, history, now: f.now }); }
  catch (e) { fail(f.form + '/' + f.id + ': threw ' + e.stack); continue; }
  const label = f.form + '/' + f.id;
  const ex = f.expect;
  if (ex.skip) {
    ok(!d.send && d.reason === ex.skip, label + ': expected skip ' + ex.skip + ', got ' + (d.send ? 'send ' + d.variant : 'skip ' + d.reason));
    console.log('  skip  ' + label.padEnd(28) + ' ' + d.reason);
    results.push({ f, d, skip: true });
    continue;
  }
  if (!ok(d.send, label + ': expected a send, got skip ' + d.reason)) continue;
  ok(d.variant === ex.variant, label + ': expected variant ' + ex.variant + ', got ' + d.variant);
  ok(d.lang === ex.lang, label + ': expected lang ' + ex.lang + ', got ' + d.lang);
  if (ex.reason) ok(d.reason === ex.reason, label + ': expected reason ' + ex.reason + ', got ' + d.reason);
  if (ex.also != null) ok(d.meta.also === ex.also, label + ': expected ' + ex.also + ' "also" rows, got ' + d.meta.also);
  if (ex.rows != null) ok(d.meta.rows === ex.rows, label + ': expected ' + ex.rows + ' "more ways" rows, got ' + d.meta.rows);
  if (ex.told != null) ok(d.meta.told === ex.told, label + ': expected ' + ex.told + ' told blocks, got ' + d.meta.told);
  const kb = checkRendered(label, d);
  const name = [f.form, d.variant, f.id, d.lang].join('-');
  // Preview only: the email logo is not live yet, so the preview uses the repo's copy.
  const localLogo = path.join(REPO, 'public', 'email', 'logo.png');
  const previewHtml = fs.existsSync(localLogo) ? d.html.replace('https://sigchofor25.com/email/logo.png', 'file://' + localLogo) : d.html;
  fs.writeFileSync(path.join(OUT, name + '.html'), previewHtml);
  fs.writeFileSync(path.join(OUT, name + '.txt'), d.text);
  console.log('  send  ' + label.padEnd(28) + ' ' + d.variant.padEnd(12) + d.lang.padEnd(5) + ' ' + kb.toFixed(1).padStart(5) + ' KB  ' + d.subject);
  results.push({ f, d, name, kb });
}

// ---------------------------------------------------------------- spec rules checked directly
console.log('Rules');
{
  ok(listsChecked >= 40, 'date order: only ' + listsChecked + ' event lists found in the emails');
  const feed = G.slimFeed(rawFeed, '2026-11-23');
  const sent = results.filter((r) => !r.skip);
  // At most one Socialist Slate row per email, and only last.
  for (const r of sent) {
    const tags = (r.d.html.match(/Socialist Slate|Planilla Socialista/g) || []).length;
    ok(tags <= (r.d.lang === 'both' ? 2 : 1), r.name + ': more than one slate row');
  }
  // The more-ways list never repeats the event just signed up for.
  const c = sent.find((r) => r.f.id === 'canvass');
  ok(c && c.d.meta.rowUrls.indexOf('https://sigchofor25.com/volunteer/#cal-2026-12-06') < 0, 'canvass: its own event appears in "more ways"');
  const sec = sent.find((r) => r.f.id === 'second');
  ok(sec && !sec.d.meta.rowUrls.some((u) => /#cal-2026-12-0[68]$/.test(u)), '1G: an event they signed up for appears in "more ways"');
  // Lobby Day 2B has no calendar buttons and no attachment; 2A attaches the bus file.
  const own = sent.find((r) => r.d.variant === '2B'), bus = sent.find((r) => r.d.variant === '2A');
  ok(own && !/Add to Google Calendar/.test(own.d.html) && own.d.attachments.length === 0, '2B: calendar buttons or attachment present');
  ok(bus && bus.d.attachments.length === 1 && /springfield-lobby-day/.test(bus.d.attachments[0].url), '2A: bus .ics not attached');
  // 2C leaves out the under-18 line; texting line only where consent was shown.
  const cant = sent.find((r) => r.d.variant === '2C');
  ok(cant && !/permission form/.test(cant.d.text), '2C: under-18 line present');
  for (const r of sent) {
    const texting = /(Text|Envía) STOP/.test(r.d.text);
    const want = r.f.form === 'volunteer' || r.f.form === 'canvass' || (r.f.form === 'rsvp' && !!r.f.answers.phone);
    ok(texting === want, r.name + ': texting line ' + (texting ? 'present' : 'missing'));
    ok(!/petition/i.test(r.f.form === 'petition' ? r.d.text : ''), r.name + ': Knock Doors email says "petition"');
    ok(!/Plans changed|Not you\?/.test(r.d.text), r.name + ': reply line present while inviteReplies is off');
  }
  // Switches.
  const one = sent.find((r) => r.f.form === 'volunteer').d;
  const props = { ENABLED: 'false', FORM_VOLUNTEER_ENABLED: 'true', FORM_PETITION_ENABLED: 'false' };
  ok(G.gate(one, props, 1000).reason === 'log_only', 'gate: ENABLED=false must be log only');
  ok(G.gate(one, { ENABLED: 'true' }, 1000).reason === 'form_off', 'gate: a missing per-form switch must mean off');
  const pet = sent.find((r) => r.f.form === 'petition').d;
  ok(G.gate(pet, Object.assign({}, G.PROP_DEFAULTS, { ENABLED: 'true' }), 1000).reason === 'form_off', 'gate: petition form must ship off');
  ok(G.gate(one, { ENABLED: 'true', FORM_VOLUNTEER_ENABLED: 'true' }, 5).reason === 'quota_low', 'gate: low quota must stop sending');
  const t = G.gate(one, { ENABLED: 'true', FORM_VOLUNTEER_ENABLED: 'true', TEST_RECIPIENT: 'tester@example.net' }, 1000);
  ok(t.send && t.to === 'tester@example.net' && t.subject.startsWith('[TEST] ') && /test_recipient/.test(t.reason), 'gate: TEST_RECIPIENT');
  const live = G.gate(one, { ENABLED: 'true', FORM_VOLUNTEER_ENABLED: 'true' }, 1000);
  ok(live.send && live.to === one.email, 'gate: live send goes to the supporter');
  ok(G.PROP_DEFAULTS.ENABLED === 'false', 'defaults: ENABLED must ship false');
  // Repeat window: same answers 11 minutes later sends again.
  const fx = G.FIXTURES.find((x) => x.id === 'skip-repeat' && x.form === 'rsvp');
  const later = G.hydrateHistory([Object.assign({}, fx.history[0], { ago_min: 11 })], fx.now, fx.answers.email);
  ok(G.decide('rsvp', fx.answers, { feed, history: later, now: fx.now }).send, 'repeat: 11 minutes later should send');
  // Unknown "Language" answers fall back to both; the canvass language question is used.
  ok(G.decide('volunteer', Object.assign({}, G.FIXTURES.find((x) => x.form === 'volunteer').answers, { language: 'fr' }), { feed, history: [], now: fx.now }).lang === 'both', 'language: unknown value should be both');
  // Feed slimming keeps the cache under 100 KB.
  ok(JSON.stringify(feed).length < 95000, 'feed: slim feed is ' + JSON.stringify(feed).length + ' bytes');
  // Manifest.
  ok(manifest.runtimeVersion === 'V8' && manifest.timeZone === 'America/Chicago', 'manifest: V8 and Chicago');
  ok(JSON.stringify(manifest.oauthScopes) === JSON.stringify([
    'https://www.googleapis.com/auth/forms', 'https://www.googleapis.com/auth/script.send_mail',
    'https://www.googleapis.com/auth/script.external_request', 'https://www.googleapis.com/auth/script.scriptapp',
    'https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/gmail.compose']), 'manifest: scopes changed');
  // No emdash anywhere in the sources.
  for (const f of fs.readdirSync(SRC)) ok(!/\u2014/.test(fs.readFileSync(path.join(SRC, f), 'utf8')), 'source ' + f + ': emdash');
}

// ---------------------------------------------------------------- 4. PNGs and gallery
const run = (cmd, args, timeout) => new Promise((resolve) => execFile(cmd, args, { timeout }, (err, so, se) => resolve({ err, so, se })));
async function shoot(htmlFile, pngFile, width, worker) {
  const tmp = pngFile + '.tmp.png';
  await run(BIN, ['--user-data-dir=' + path.join(PROFILES, 'prof-' + worker), '--hide-scrollbars', '--window-size=' + width + ',9000',
    '--force-device-scale-factor=1', '--virtual-time-budget=6000', '--screenshot=' + tmp, 'file://' + htmlFile], 60000);
  const py = 'import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("RGB");w,h=im.size\nbg=im.getpixel((2,h-2));px=im.load();y=h-1\n' +
    'while y>0 and all(px[x,y]==bg for x in range(0,w,3)): y-=1\nim.crop((0,0,w,min(h,y+24))).save(sys.argv[2]);print(min(h,y+24))';
  const r = await run('python3', ['-c', py, tmp, pngFile], 60000);
  fs.rmSync(tmp, { force: true });
  return parseInt(r.so, 10) || 0;
}
const heights = {};
if (SHOTS) {
  if (!fs.existsSync(BIN)) { console.log('Headless shell not found at ' + BIN + '; skipping PNGs.'); }
  else {
    const jobs = [];
    for (const r of results) {
      if (r.skip) continue;
      jobs.push([r.name, 375]);
      if (r.f.shot600) jobs.push([r.name, 600]);
    }
    let i = 0;
    await Promise.all([0, 1, 2, 3].map(async (w) => {
      while (i < jobs.length) {
        const [name, width] = jobs[i++];
        const h = await shoot(path.join(OUT, name + '.html'), path.join(OUT, name + '-' + width + '.png'), width, w);
        heights[name + '-' + width] = h;
      }
    }));
    console.log('PNGs: ' + jobs.length + ' written.');
  }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FORM_ORDER = ['rsvp', 'lobbyday', 'volunteer', 'petition', 'canvass'];
// index.html is the local review page; gallery.html is the same page in the published-page
// form (no document wrapper, no links to the .html emails, theme tokens and safe-area gutters).
function galleryPage(pub) {
  const DARK = '--bg:#1c1915;--card:#26221c;--ink:#f3e6cf;--muted:#c9bda8;--line:#4a3d2c;--blue:#7fd0f0';
  const css = `:root{--bg:#fbf4e8;--card:#fff;--ink:#1f2937;--muted:#5b616b;--line:#e6d6b8;--blue:#036d99;color-scheme:light}
${pub ? `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK};color-scheme:dark}}
:root[data-theme="dark"]{${DARK};color-scheme:dark}` : `@media (prefers-color-scheme:dark){:root{${DARK}}}`}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
main{max-width:1100px;margin:0 auto;padding:20px 16px 60px;${pub ? 'padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));' : ''}}h1{font-size:26px;margin:0 0 4px}h2{font-size:21px;margin:36px 0 10px;color:var(--blue);border-top:2px dashed var(--line);padding-top:18px}
p.lead{color:var(--muted);margin:0 0 12px}nav a{display:inline-block;margin:0 12px 8px 0;color:var(--blue)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;overflow:hidden;overflow-wrap:anywhere}
.card h3{margin:0 0 6px;font-size:16px}.tag{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:99px;background:var(--blue);color:var(--card);margin-right:4px}
.meta{font-size:14px;margin:6px 0}.meta b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.when{font-size:14px;color:var(--muted);margin:8px 0}.shot{display:block;margin-top:10px;max-height:560px;overflow:hidden;border:1px solid var(--line);border-radius:6px}
.shot img{display:block;width:100%;height:auto}.links a{margin-right:12px;color:var(--blue);font-size:14px}
.tablewrap{overflow-x:auto}table{border-collapse:collapse;width:100%;background:var(--card);font-size:14px}td,th{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}`;
  let g = pub
    ? `<title>Confirmation Email Previews</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${css}
</style>
<main>`
    : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Confirmation emails: previews</title>
<style>
${css}
</style></head><body><main>`;
  g += `
<h1>Confirmation emails: previews</h1>
<p class="lead">Every variant, rendered from fictional people and the site's event feed as of the build. Times are as if each form were sent on Monday Nov 23, 2026 at 10 AM (Dec 3 for the "after Lobby Day" cases). Tap a picture to open it full size; "text" is the plain-text version sent alongside it.</p>
<nav>${FORM_ORDER.map((k) => `<a href="#${k}">${esc(G.FORM_LABELS[k])}</a>`).join('')}<a href="#nothing">Sends nothing</a></nav>`;
  for (const k of FORM_ORDER) {
    g += `<h2 id="${k}">${esc(G.FORM_LABELS[k])}</h2><div class="grid">`;
    for (const r of results.filter((x) => x.f.form === k && !x.skip)) {
      const png = r.name + '-375.png', big = r.name + '-600.png';
      const h = heights[r.name + '-375'];
      g += `<div class="card"><h3><span class="tag">${esc(r.d.variant)}</span><span class="tag">${esc(r.d.lang)}</span> ${esc(r.f.id)}</h3>
<div class="meta"><b>Subject</b>${esc(r.d.subject)}</div><div class="meta"><b>Preheader</b>${esc(r.d.preheader)}</div>
<div class="when"><strong>Sends when:</strong> ${esc(r.f.note)}${r.d.attachments.length ? ' Attaches ' + esc(r.d.attachments[0].filename) + '.' : ''}</div>
<div class="links">${pub ? '' : `<a href="${r.name}.html">email</a>`}<a href="${r.name}.txt">text</a>${fs.existsSync(path.join(OUT, big)) ? `<a href="${big}">600 px</a>` : ''}<span style="font-size:13px;color:var(--muted)">${r.kb.toFixed(0)} KB${h ? ', ' + h + ' px tall at 375' : ''}</span></div>
${fs.existsSync(path.join(OUT, png)) ? `<a class="shot" href="${png}"><img src="${png}" alt="${esc(r.d.subject)}" loading="lazy"></a>` : ''}</div>`;
    }
    g += '</div>';
  }
  g += `<h2 id="nothing">Sends nothing (logged with a reason)</h2><div class="tablewrap"><table><tr><th>Form</th><th>Case</th><th>Reason</th><th>Why</th></tr>`;
  for (const r of results.filter((x) => x.skip)) g += `<tr><td>${esc(r.f.form)}</td><td>${esc(r.f.id)}</td><td><code>${esc(r.d.reason)}</code></td><td>${esc(r.f.note)}</td></tr>`;
  g += '</table></div></main>' + (pub ? '' : '</body></html>') + '\n';
  return g;
}
fs.writeFileSync(path.join(OUT, 'index.html'), galleryPage(false));
const galleryHtml = galleryPage(true);
fs.writeFileSync(path.join(OUT, 'gallery.html'), galleryHtml);
// The published gallery: no document wrapper, no links to the .html emails, every file it names exists.
ok(!/<!doctype|<html|<head|<body/i.test(galleryHtml), 'gallery.html: document wrapper present');
ok(!/href="[^"]+\.html"/.test(galleryHtml), 'gallery.html: links an .html email');
for (const m of galleryHtml.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) ok(fs.existsSync(path.join(OUT, m[1])), 'gallery.html: missing file ' + m[1]);

// ---------------------------------------------------------------- summary
const sends = results.filter((r) => !r.skip).length, skips = results.filter((r) => r.skip).length;
console.log(`\n${G.FIXTURES.length} fixtures (${sends} emails, ${skips} skips), ${checks} checks, ${failures} failed.`);
console.log('Previews: ' + path.join(OUT, 'index.html'));
if (SHOTS && Object.keys(heights).length) {
  const tall = Object.entries(heights).filter(([k]) => k.endsWith('-375')).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log('Tallest at 375 px: ' + tall.map(([k, h]) => k.replace(/-375$/, '') + ' ' + h).join(', '));
}
process.exit(failures ? 1 : 0);
