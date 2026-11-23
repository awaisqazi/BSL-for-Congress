/**
 * Render.gs: pure functions. No Apps Script services are used in this file, so the same
 * code runs in the Node harness (../test/run.mjs).
 *
 *   decide(formKey, answers, ctx) -> { send, reason, subject, html, text, attachments,
 *                                       variant, lang, email, eventId, fingerprint }
 *     answers: { key: string | string[] } (keys from FORM_TITLES in Config.gs)
 *     ctx: { feed: object | null, history: [log rows], now: 'YYYY-MM-DDTHH:mm:ss-06:00',
 *            options: overrides for OPTIONS }
 *   gate(decision, props, quota) -> applies the Script Property switches
 *
 * "now" is always an ISO string in Chicago time with its offset, so the date part is the
 * Chicago date. Feed start/end strings carry the Chicago offset too.
 */

// ------------------------------------------------------------------ small helpers

function isArr_(v) { return Object.prototype.toString.call(v) === '[object Array]'; }

function asList_(v) {
  if (v == null) return [];
  var arr = isArr_(v) ? v : [v];
  var out = [];
  arr.forEach(function (x) {
    if (x == null) return;
    if (isArr_(x)) { x.forEach(function (y) { if (y != null && String(y).trim()) out.push(String(y).trim()); }); return; }
    var s = String(x).trim();
    if (s) out.push(s);
  });
  return out;
}

function asText_(v) { return asList_(v).join(', '); }

function fmt_(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, function (m, k) {
    return vars && vars[k] != null ? String(vars[k]) : m;
  });
}

function cap_(s) { s = String(s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
}

function hash_(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

function normTitle_(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase(); }

function joinList_(items, andWord) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + andWord + items[items.length - 1];
}

function makeNow_(iso) {
  return { iso: iso, ms: Date.parse(iso), ymd: String(iso).slice(0, 10) };
}

// ------------------------------------------------------------------ answers

/** Google's item responses ([{title, response}]) to keyed answers. */
function mapAnswers(formKey, pairs) {
  var lookup = {};
  var titles = FORM_TITLES[formKey] || {};
  Object.keys(titles).forEach(function (t) { lookup[normTitle_(t)] = titles[t]; });
  var out = {};
  (pairs || []).forEach(function (p) {
    var n = normTitle_(p.title);
    if (lookup[n]) out[lookup[n]] = p.response;
    else if (n.indexOf('language') === 0) out.language = p.response;
  });
  return out;
}

function firstName_(s) {
  var w = String(s || '').trim().split(/\s+/)[0] || '';
  if (w.length < 2 || /[\d@]/.test(w)) return '';
  return w;
}

function readPerson_(formKey, a) {
  var p = FORM_PEOPLE[formKey];
  return {
    email: asText_(a.email).toLowerCase(),
    names: p.names.map(function (k) { return asText_(a[k]); }),
    first: firstName_(asText_(a[p.first]))
  };
}

var RX_EMAIL_ = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
var RX_NAME_LINK_ = /(https?:|www\.|:\/\/|<|>|\.(com|net|org|info|ru|xyz|io|co|biz|top|link|site|online|club|cn)\b)/i;

function junkReason_(person) {
  var e = person.email;
  if (!e) return 'no_email';
  if (!RX_EMAIL_.test(e)) return 'invalid_email';
  var domain = e.split('@')[1];
  if (APP.TEST_DOMAINS.indexOf(domain) >= 0) return 'test_address';
  for (var i = 0; i < APP.TEST_TLDS.length; i++) {
    if (domain.slice(-APP.TEST_TLDS[i].length) === APP.TEST_TLDS[i]) return 'test_address';
  }
  if (!person.names[0]) return 'no_name';
  for (var j = 0; j < person.names.length; j++) {
    var n = person.names[j];
    if (/^test/i.test(n)) return 'test_name';
    if (RX_NAME_LINK_.test(n)) return 'junk_name_link';
    if (n.length > APP.NAME_MAX) return 'junk_name_long';
  }
  return '';
}

function pickLang_(formKey, a) {
  var l = asText_(a.language).toLowerCase();
  if (/^(en|english|ingl[eé]s)$/.test(l)) return 'en';
  if (/^(es|spanish|espa[nñ]ol)$/.test(l)) return 'es';
  if (formKey === 'canvass') {
    var s = asText_(a.langs);
    if (s === 'Spanish') return 'es';
    if (s === 'English') return 'en';
  }
  return 'both';
}

function eventIdOf_(a) {
  var m = asText_(a.event).match(/\[([^\]]+)\]\s*$/);
  return m ? m[1].trim() : '';
}

function clampGuests_(v) {
  var n = parseInt(asText_(v), 10);
  if (isNaN(n) || n < 0) return 0;
  return n > 5 ? 5 : n;
}

function englishHalf_(v) { return asText_(v).split(' / ')[0].trim(); }

function fingerprint(formKey, a) {
  var basis;
  if (formKey === 'rsvp') basis = [eventIdOf_(a), clampGuests_(a.bringing)];
  else if (formKey === 'lobbyday') basis = [englishHalf_(a.seat), englishHalf_(a.u18), englishHalf_(a.chip)];
  else basis = Object.keys(a).sort().map(function (k) { return k + '=' + asList_(a[k]).join('|'); });
  return hash_(JSON.stringify(basis).toLowerCase());
}

// ------------------------------------------------------------------ rich text

/** Parse **bold** and [text](url) first, then fill {vars} inside each piece. */
function rich_(tpl, vars) {
  var segs = [];
  var re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  var last = 0, m;
  tpl = String(tpl);
  while ((m = re.exec(tpl))) {
    if (m.index > last) segs.push({ t: tpl.slice(last, m.index) });
    if (m[1] != null) segs.push({ t: m[1], b: true });
    else segs.push({ t: m[2], href: m[3] });
    last = re.lastIndex;
  }
  if (last < tpl.length) segs.push({ t: tpl.slice(last) });
  segs.forEach(function (s) {
    s.t = fmt_(s.t, vars);
    if (s.href) s.href = fmt_(s.href, vars);
  });
  return richFrom_(segs);
}

// Link styles. Every web address shown as text is an explicit <a> with one of these, so mail
// apps have nothing left to auto-link in their own colors (Gmail's blue vanishes on the footer).
var LINK_BODY_ = 'color:#036d99;text-decoration:underline;text-underline-offset:2px;';
var LINK_FOOT_ = 'color:#fbe2ba;text-decoration:underline;text-underline-offset:2px;';
// Street addresses link to their map in the body text color, as designed (no auto-link blue).
var LINK_ADDR_ = 'color:#374151;text-decoration:none;';
var RX_DOMAIN_TEXT_ = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:com|org|net|gov|edu|us)\b(?:\/[^\s<>"')]*)?/gi;

function anchor_(href, text, style, cls) {
  return '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + esc_(href) + '" style="' + style + '">' + esc_(text) + '</a>';
}

/** Plain text to HTML: escaped, with each domain or URL in it made an explicit link. */
function linkText_(s, style, cls) {
  s = String(s == null ? '' : s);
  var out = '', last = 0, m;
  RX_DOMAIN_TEXT_.lastIndex = 0;
  while ((m = RX_DOMAIN_TEXT_.exec(s))) {
    if (m.index > 0 && s.charAt(m.index - 1) === '@') continue; // part of an email address
    var t = m[0].replace(/[.,;:!?]+$/, '');
    var href = /^https?:\/\//i.test(t) ? t.replace(/^http:/i, 'https:') : 'https://' + t + (t.indexOf('/') < 0 ? '/' : '');
    out += esc_(s.slice(last, m.index)) + anchor_(href, t, style, cls);
    last = m.index + t.length;
    RX_DOMAIN_TEXT_.lastIndex = last;
  }
  return out + esc_(s.slice(last));
}

/** A plain string as a rich value whose HTML has explicit links (style: LINK_BODY_ or LINK_FOOT_). */
function linked_(s, style, cls) {
  return { __rich: true, html: linkText_(s, style, cls), text: String(s == null ? '' : s) };
}

/** An address shown as text, linked to its map so no mail app restyles it. */
function addrRich_(prefix, addr, mapUrl) {
  return {
    __rich: true,
    html: esc_(prefix) + (mapUrl ? anchor_(mapUrl, addr, LINK_ADDR_, 't') : esc_(addr)),
    text: prefix + addr
  };
}

function richFrom_(segs) {
  return {
    __rich: true,
    html: segs.map(function (s) {
      if (s.href) return anchor_(s.href, s.t, LINK_BODY_, 'h');
      if (s.b) return '<strong>' + linkText_(s.t, LINK_BODY_, 'h') + '</strong>';
      return linkText_(s.t, LINK_BODY_, 'h');
    }).join(''),
    text: segs.map(function (s) {
      if (!s.href) return s.t;
      if (/sigchofor25\.com/.test(s.t) || /^@/.test(s.t) || !/^https:\/\/sigchofor25\.com/.test(s.href)) return s.t;
      return s.t + ' (' + s.href.replace(/^https?:\/\//, '') + ')';
    }).join('')
  };
}

// ------------------------------------------------------------------ template fill

var RX_REP_ = /<!-- BEGIN (\w+) -->\n?([\s\S]*?)<!-- END \1 -->\n?/g;
var RX_IF_ = /<!-- IF (\w+) -->\n?([\s\S]*?)<!-- ENDIF \1 -->\n?/g;
var RX_PH_ = /\{\{(\w+)\}\}/g;

function truthy_(v) { return isArr_(v) ? v.length > 0 : !!v; }

function val_(v, mode) {
  if (v && typeof v === 'object' && v.__rich) return mode === 'html' ? v.html : v.text;
  var s = v == null ? '' : String(v);
  return mode === 'html' ? esc_(s) : s.replace(/\{\{/g, '{ {');
}

function fillTpl_(tpl, d, mode) {
  var s = tpl.replace(RX_REP_, function (m, name, body) {
    var items = d[name] || [];
    if (!isArr_(items)) items = [items];
    return items.map(function (it) {
      var ctx = Object.assign({}, d);
      if (it && typeof it === 'object' && !it.__rich) Object.assign(ctx, it);
      else ctx[name] = it;
      return fillTpl_(body, ctx, mode);
    }).join('');
  });
  var prev;
  do {
    prev = s;
    s = s.replace(RX_IF_, function (m, name, body) { return truthy_(d[name]) ? body : ''; });
  } while (s !== prev);
  return s.replace(RX_PH_, function (m, k) { return (k in d) ? val_(d[k], mode) : m; });
}

function renderEmail_(top) {
  var html = fillTpl_(SHELL_HTML, top, 'html');
  var text = fillTpl_(SHELL_TXT, top, 'text')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  [html, text].forEach(function (out) {
    var left = out.match(RX_PH_);
    if (left) throw new Error('unfilled placeholders: ' + left.join(' '));
    if (/<!-- (BEGIN|END|IF|ENDIF) \w+ -->/.test(out)) throw new Error('leftover block marker');
  });
  return { html: html, text: text };
}

// ------------------------------------------------------------------ feed helpers

var ES_WK3_ = { lunes: 'lun', martes: 'mar', 'miércoles': 'mié', jueves: 'jue', viernes: 'vie', 'sábado': 'sáb', domingo: 'dom' };

function wk3_(ev, L) {
  var w = ev[L].weekday;
  return L === 'es' ? (ES_WK3_[w] || w.slice(0, 3)) : w.slice(0, 3);
}
function dayShort_(ev, L) { return wk3_(ev, L) + ' ' + ev[L].day; }
function dayLong_(ev, L) {
  var d = ev[L].dateLong || '';
  return L === 'es' ? d.replace(/\s+de\s+\d{4}$/, '') : d.replace(/,\s*\d{4}$/, '');
}
function esTimePhrase_(t) {
  if (/\sa\s/.test(t)) return 'de ' + t;
  if (/^1(:\d\d)?\s/.test(t)) return 'a la ' + t;
  return 'a las ' + t;
}
function esArt_(place) { return /^(Oficina|Biblioteca|Iglesia|Escuela|Casa)\b/.test(place) ? 'la ' + place : place; }

function startMs_(ev) { return Date.parse(ev.start); }
function endMs_(ev) { return ev.end ? Date.parse(ev.end) : startMs_(ev) + 2 * 3600 * 1000; }
function overlaps_(a, b) { return startMs_(a) < endMs_(b) && endMs_(a) > startMs_(b); }

function sortedEvents_(feed) {
  return (feed && feed.events ? feed.events.slice() : []).sort(function (a, b) { return startMs_(a) - startMs_(b); });
}
function findEvent_(feed, id) {
  if (!feed || !feed.events || !id) return null;
  for (var i = 0; i < feed.events.length; i++) if (feed.events[i].id === id) return feed.events[i];
  return null;
}

/** Keep what the emails use (the cache holds at most ~100 KB). Past 60 days are kept for 1E. */
function slimFeed(feed, ymd) {
  var cutoff = new Date(Date.parse(ymd + 'T12:00:00Z') - 60 * 86400 * 1000).toISOString().slice(0, 10);
  return {
    generated: feed.generated,
    events: (feed.events || []).filter(function (e) { return e.expires >= cutoff; }).map(function (e) {
      return {
        id: e.id, kind: e.kind, host: e.host, slate: !!e.slate, start: e.start, end: e.end || null,
        date: e.date, expires: e.expires, en: e.en, es: e.es, address: e.address || null,
        mapUrl: e.mapUrl || null, url: e.url, ics: e.ics, gcal: e.gcal
      };
    })
  };
}

function icsFilename_(ev) {
  var slug = ev.kind === 'canvass' ? 'canvass' : ev.kind === 'wardnight' ? 'ward-night'
    : ev.id.replace(/^[a-z]+-\d{4}-\d\d-\d\d-?/, '') || ev.kind;
  return slug + '-' + ev.en.day.toLowerCase().replace(/\s+/g, '-') + '.ics';
}

/** Event words for one language, used by every event email. */
function evVars_(ev, L) {
  var w = ev[L];
  var P = COPY.rsvp;
  var over = (P.events[ev.id] || {});
  var short = function (lang) {
    return (over[lang] && over[lang].short_title) || (P.short_titles[ev.kind] && P.short_titles[ev.kind][lang]) || ev[lang].title.split(':')[0];
  };
  var timePhrase = L === 'es' ? esTimePhrase_(w.time) : w.time;
  return {
    event_title: w.title,
    event_line: w.line,
    event_day: dayLong_(ev, L),
    event_time: w.time,
    event_time_phrase: timePhrase,
    event_time_phrase_cap: cap_(timePhrase),
    day_short: dayShort_(ev, L),
    day_short_en: dayShort_(ev, 'en'),
    day_short_es: dayShort_(ev, 'es'),
    place: w.place,
    place_art: L === 'es' ? esArt_(w.place) : w.place,
    address: ev.address || '',
    address_sfx: ev.address ? ', ' + ev.address : '',
    event_page: ev.url,
    sponsor: w.sponsor || '',
    short_title: short(L),
    short_title_en: short('en'),
    short_title_es: short('es')
  };
}

function cardFromEvent_(ev, L) {
  var w = ev[L], C = COPY.common[L], v = evVars_(ev, L);
  var dayCap = cap_(v.event_day);
  // When the place name is the street address (CEDA: "2100 W Cermak Rd"), show it once.
  var addr = ev.address && ev.address.indexOf(w.place) !== 0 ? ev.address : '';
  return {
    event_card: true,
    ev_weekday: wk3_(ev, L), ev_day: w.day,
    ev_when_label: C.when, ev_when_main: w.time, ev_when_sub: dayCap,
    ev_when_text: L === 'es' ? dayCap + ', ' + v.event_time_phrase : dayCap + ', ' + w.time,
    ev_title: w.title, ev_title_caps: w.title.toUpperCase(),
    ev_where_label: C.where, ev_place: w.place, ev_address: addr ? addrRich_('', addr, ev.mapUrl) : '',
    ev_where_text: addr ? w.place + ', ' + addr : (ev.address || w.place),
    ev_map: !!(ev.address && ev.mapUrl), ev_map_url: ev.mapUrl || '', ev_map_label: C.directions,
    ev_note: w.line ? linked_(w.line, LINK_BODY_, 'h') : '',
    ev_host: w.sponsor ? fmt_(C.hosted_by, { sponsor: w.sponsor }) : ''
  };
}

function calendarFromEvent_(ev, L) {
  var C = COPY.common[L];
  return { calendar: true, cal_google_url: ev.gcal[L], cal_google_label: C.cal_google, cal_ics_url: ev.ics[L], cal_ics_label: C.cal_ics };
}

var LOBBY_PAGE_ = 'https://sigchofor25.com/lobbyday/';
var RX_CAL_URL_ = /^https:\/\/sigchofor25\.com\/volunteer\/#cal-\d{4}-\d\d-\d\d$/;

/**
 * Where an event's row links: Lobby Day has its own page; every other event links its card
 * on the site's calendar (the feed's url, /volunteer/#cal-YYYY-MM-DD), never an outside
 * RSVP page and never bare /volunteer/.
 */
function eventLink_(ev) {
  if (ev.id === LOBBY.id) return LOBBY_PAGE_;
  if (RX_CAL_URL_.test(ev.url || '')) return ev.url;
  return APP.SITE + '/volunteer/#cal-' + String(ev.date || ev.start).slice(0, 10);
}

/**
 * Picked events in date order for display. The pickers choose which events appear; this
 * only orders them. A Socialist Slate row stays last (spec: never above a campaign shift).
 */
function chrono_(list) {
  var by = function (a, b) { return startMs_(a) - startMs_(b); };
  var main = list.filter(function (e) { return !e.slate; }).sort(by);
  return main.concat(list.filter(function (e) { return !!e.slate; }).sort(by));
}

function rowFromEvent_(ev, L, withAddress) {
  var w = ev[L];
  return {
    oe_weekday: wk3_(ev, L), oe_day: w.day, oe_title: w.title, oe_time: w.time,
    oe_place: withAddress && ev.address ? addrRich_(w.place + ', ', ev.address, ev.mapUrl) : w.place,
    oe_url: eventLink_(ev), oe_link_label: w.action, oe_tag: ev.slate ? COPY.common[L].slate_tag : ''
  };
}

// ------------------------------------------------------------------ "more ways" (content-events.md, section 3)

function isCampCanvass_(e) { return e.kind === 'canvass' && e.host === 'campaign' && !e.slate; }
function isWardNight_(e) { return e.kind === 'wardnight'; }
function isCampMeetup_(e) { return e.kind === 'meetup' && e.host === 'campaign'; }
function isSlateCanvass_(e) { return e.kind === 'canvass' && !!e.slate; }

function eventPool_(feed, now, signedEv, excludeIds, afterMs) {
  return sortedEvents_(feed).filter(function (e) {
    if (['canvass', 'wardnight', 'meetup'].indexOf(e.kind) < 0) return false;
    if (startMs_(e) <= now.ms) return false;
    if (afterMs && startMs_(e) <= afterMs) return false;
    if (excludeIds.indexOf(e.id) >= 0) return false;
    if (signedEv && overlaps_(e, signedEv)) return false;
    return e.host === 'campaign' || e.host === 'ward' || !!e.slate;
  });
}

function pickMoreWays_(pool, rule, signedEv, opt) {
  var used = [];
  var f = function (pred, afterEv) {
    for (var i = 0; i < pool.length; i++) {
      var e = pool[i];
      if (used.indexOf(e.id) >= 0 || !pred(e)) continue;
      if (afterEv && startMs_(e) <= startMs_(afterEv)) continue;
      return e;
    }
    return null;
  };
  var RULES = {
    A: [function () { return f(isCampCanvass_); }, function (s) { return f(isCampCanvass_, s[0]); }, function () { return f(isWardNight_); }],
    B: [function () { return f(isCampCanvass_); }, function (s) { return f(isCampMeetup_) || f(isCampCanvass_, s[0]); }, function () { return f(isWardNight_, signedEv); }],
    C: [function () { return f(isWardNight_); }, function () { return f(isCampCanvass_); }, function (s) { return f(isCampCanvass_, s[1]); }],
    L: [function () { return f(isCampCanvass_); }, function () { return f(isWardNight_); }, function () { return f(isCampMeetup_) || f(isCampCanvass_); }],
    E: [function () { return f(isCampCanvass_); }, function () { return f(isWardNight_); }, function (s) { return f(isCampCanvass_, s[0]); }]
  };
  var slots = [];
  RULES[rule].forEach(function (pick, i) {
    var e = pick(slots) || f(isCampCanvass_) || f(isWardNight_) || f(isCampMeetup_);
    slots[i] = e;
    if (e) used.push(e.id);
  });
  var out = slots.filter(Boolean);
  if (out.length < 3 && opt.slateFiller) {
    var s = f(isSlateCanvass_);
    if (s) out.push(s);
  }
  return chrono_(out);
}

// ------------------------------------------------------------------ general forms' shift lists (content-general.md)

function eligibleGeneral_(e, now) {
  return e.expires >= now.ymd && startMs_(e) >= now.ms + 2 * 3600 * 1000;
}
function within28_(e, now) { return startMs_(e) <= now.ms + 28 * 86400 * 1000; }

function pickGeneral_(feed, now, filter, opt) {
  var evs = sortedEvents_(feed).filter(function (e) { return eligibleGeneral_(e, now) && within28_(e, now) && filter(e); });
  var out = evs.filter(function (e) {
    return e.host === 'campaign' && !e.slate && (e.kind === 'canvass' || e.kind === 'meetup');
  }).slice(0, 3);
  if (out.length < 3 && opt.slateFiller) {
    var s = evs.filter(isSlateCanvass_)[0];
    if (s) out.push(s);
  }
  return chrono_(out);
}

function wardNightNext_(feed, now) {
  return sortedEvents_(feed).filter(function (e) { return e.kind === 'wardnight' && eligibleGeneral_(e, now); })[0] || null;
}

function wardNightText_(ev, L) {
  var w = ev[L];
  return L === 'es'
    ? w.weekday + ' ' + w.day + ', ' + w.time + (ev.address ? ', ' + ev.address : '')
    : w.weekday + ', ' + w.day + ', ' + w.time + (ev.address ? ', ' + ev.address : '');
}

// ------------------------------------------------------------------ history

function countedRow_(h) {
  return h.status === 'sent' || (h.status === 'skipped' && /^(log_only|form_off|quota_low)/.test(h.reason || ''));
}

/** Fixture history ({ago_min, form, ...}) to log rows. Used by the harness and Tests.gs. */
function hydrateHistory(rows, nowIso, email) {
  var now = makeNow_(nowIso);
  return (rows || []).map(function (h) {
    return {
      time: now.ms - (h.ago_min || 0) * 60000, form: h.form, variant: h.variant || '', lang: h.lang || 'both',
      email: (h.email || email || '').toLowerCase(), eventId: h.eventId || '', status: h.status || 'sent',
      reason: h.reason || '', fp: h.answers ? fingerprint(h.form, h.answers) : (h.fp || 'none')
    };
  });
}

// ------------------------------------------------------------------ planners: one per form

function planRsvp_(c) {
  var a = c.a, P = COPY.rsvp;
  var label = asText_(a.event);
  var id = eventIdOf_(a);
  var labelTitle = label.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
  if (!labelTitle && !id) return { skip: 'no_event', eventId: '' };
  var guests = clampGuests_(a.bringing);
  var phone = !!asText_(a.phone);
  var ev = findEvent_(c.feed, id);
  var variant, sub = '', note = '';
  if (!c.feed) { variant = '1E'; sub = 'notfound'; note = 'feed_unavailable'; }
  else if (!ev) { variant = '1E'; sub = 'notfound'; note = id ? 'event_not_in_feed' : 'no_event_id'; }
  else if (c.now.ymd > ev.expires) { variant = '1E'; sub = 'over'; }
  else variant = ev.kind === 'canvass' ? '1A' : ev.kind === 'wardnight' ? '1B' : (ev.kind === 'meetup' && !ev.address) ? '1C' : '1D';

  if (ev && ev.host === 'ward' && !c.opt.wardEventConfirmations) return { skip: 'ward_event_off', eventId: id };

  var rsvpRows = c.hist.filter(function (h) { return h.form === 'rsvp'; });
  var updated = variant !== '1E' && rsvpRows.some(function (h) {
    return h.eventId === id && h.status === 'sent' && h.fp !== c.fp;
  });

  // Everything this address is already signed up for (both sheets).
  var signed = [id];
  rsvpRows.forEach(function (h) { if (countedRow_(h) && h.eventId && signed.indexOf(h.eventId) < 0) signed.push(h.eventId); });
  c.hist.forEach(function (h) { if (h.form === 'lobbyday' && countedRow_(h) && /^2[AB]/.test(h.variant) && signed.indexOf(LOBBY.id) < 0) signed.push(LOBBY.id); });

  var also = [];
  if (variant !== '1E') {
    signed.forEach(function (sid) {
      if (sid === id || sid === LOBBY.id) return;
      var e = findEvent_(c.feed, sid);
      if (e && startMs_(e) > c.now.ms) also.push(e);
    });
    also.sort(function (x, y) { return startMs_(x) - startMs_(y); });
  }
  var upcomingCanvasses = signed.map(function (sid) { return findEvent_(c.feed, sid); }).filter(function (e) {
    return e && e.kind === 'canvass' && startMs_(e) > c.now.ms;
  }).length;
  var roll = variant !== '1E' && upcomingCanvasses >= 3;

  var rows = [];
  if (!updated && c.feed) {
    var pool = eventPool_(c.feed, c.now, variant === '1E' ? null : ev, signed, 0);
    if (roll) {
      var one = pool.filter(function (e) { return isWardNight_(e) || isCampMeetup_(e); })[0];
      rows = one ? [one] : [];
    } else {
      rows = pickMoreWays_(pool, { '1A': 'A', '1B': 'B', '1C': 'C', '1D': 'C', '1E': 'E' }[variant], ev, c.opt);
    }
  }

  var V = P[variant], E = (ev && P.events[ev.id]) || {};
  var full = updated ? '1F' : variant;
  var vars = function (L) {
    var v = ev ? evVars_(ev, L) : {};
    v.label_title = labelTitle;
    v.guests = guests;
    return v;
  };
  var plusText = function (L) {
    if (guests === 0) return '';
    return fmt_(guests === 1 ? P[L].plus_1 : P[L].plus_n, { guests: guests });
  };

  var subject = {}, preheader = {};
  ['en', 'es'].forEach(function (L) {
    var v = vars(L);
    if (updated) {
      subject[L] = fmt_(P['1F'][L].subject, v);
      preheader[L] = P['1F'][L].preheader;
    } else {
      subject[L] = fmt_((E[L] && E[L].subject) || V[L].subject, v);
      preheader[L] = fmt_(V[L].preheader, v);
    }
  });
  if (updated) {
    var ve = vars('en'), vs = vars('es');
    subject.both = fitSubject_([
      'Updated: ' + ve.short_title + ', ' + ve.day_short + ' | Actualizado: ' + vs.short_title + ', ' + vs.day_short,
      'Updated: ' + ve.short_title + ' ' + ve.day_short + ' | Actualizado: ' + vs.day_short,
      'Updated: ' + ve.day_short + ' | Actualizado: ' + vs.day_short
    ]);
  } else {
    var vb = vars('en');
    subject.both = fitSubject_([
      fmt_(E.both_subject || V.both_subject, vb),
      "You're in: " + vb.day_short_en + ' | Ya estás: ' + vb.day_short_es
    ]);
  }

  var block = function (L) {
    var v = vars(L), b = { paragraph: [], know: [], after: [] }, C = COPY.common[L];
    b.headline = V[L].headline;
    if (variant === '1C' && ev && !/town hall/i.test(ev.en.title)) b.headline = P['1D'][L].headline;
    if (variant === '1E') {
      var conf = sub === 'over' ? V[L].confirm_over : V[L].confirm_notfound;
      b.paragraph.push(rich_(conf, v));
    } else if (updated) {
      v.plus = plusText(L) || P[L].just_you;
      b.paragraph.push(rich_(P['1F'][L].confirm, v));
    } else {
      b.paragraph.push(rich_(P[L].confirm, v));
      if (guests > 0) b.paragraph.push(rich_('**' + plusText(L).replace(/\*/g, '') + '**', {}));
    }
    if (variant === '1A' && V[L].thanks) b.paragraph.push(rich_(V[L].thanks, v));
    if (ev && variant !== '1E') {
      Object.assign(b, cardFromEvent_(ev, L), calendarFromEvent_(ev, L));
      if (also.length) {
        b.also = true;
        b.also_heading = rich_(P[L].also_heading, {});
        b.also_item = also.slice(0, 3).map(function (e) { return rich_(P[L].also_item, evVars_(e, L)); });
      }
    }
    var know = (E[L] && E[L].know) || V[L].know;
    if (know) b.know.push(rich_(know, v));
    if (!updated) {
      var heading = roll ? P[L].roll_intro : V[L].more_intro;
      if (rows.length) {
        b.other_events = true;
        b.other_events_heading = heading;
        b.other_event = rows.map(function (e) { return rowFromEvent_(e, L, false); });
      } else {
        b.other_events_empty = true;
        b.oe_empty = rich_(C.wardnight_standing, {});
      }
    }
    var secondary = (E[L] && E[L].secondary) || V[L].secondary || (variant === '1E' ? '' : P[L].bring_neighbor);
    if (secondary) b.after.push(rich_(secondary, v));
    if (variant === '1A' && c.opt.donationLine) b.after.push(rich_(P[L].donate, v));
    if (c.opt.inviteReplies) b.after.push(rich_(C.plans_changed, {}));
    b.signoff = P[L].signoff;
    return b;
  };

  var footer = function (L) {
    var v = vars(L);
    var lines = [fmt_(P[L].why, { event_title: ev ? v.event_title : labelTitle })];
    if (phone) lines.push(P[L].texting);
    return lines;
  };

  var attachments = [];
  if (ev && variant !== '1E') {
    attachments.push({ url: ev.ics[c.lang === 'es' ? 'es' : 'en'], filename: icsFilename_(ev) });
  }
  return {
    variant: full, sub: sub, eventId: id, note: note, subject: subject, preheader: preheader,
    block: block, footer: footer, attachments: attachments, general: false
  };
}

function planLobby_(c) {
  var a = c.a, P = COPY.lobbyday;
  var seat = englishHalf_(a.seat);
  var variant = seat.indexOf(VALUES.lobbySeat.bus) === 0 ? '2A' : seat.indexOf(VALUES.lobbySeat.own) === 0 ? '2B'
    : seat.indexOf(VALUES.lobbySeat.cant) === 0 ? '2C' : '';
  var ev = findEvent_(c.feed, LOBBY.id);
  var lobbyDay = ev ? ev.expires : LOBBY.date;
  if (c.now.ymd > lobbyDay) variant = '2D';
  if (!variant) return { skip: 'lobby_seat_unknown', eventId: LOBBY.id };
  var u18 = englishHalf_(a.u18).indexOf(VALUES.lobbyU18Yes) === 0;
  var chip = englishHalf_(a.chip);
  var chipYes = chip.indexOf(VALUES.lobbyChipYes) === 0, chipNo = chip.indexOf(VALUES.lobbyChipNo) === 0;
  var V = P[variant];

  var signed = [LOBBY.id];
  c.hist.forEach(function (h) { if (h.form === 'rsvp' && countedRow_(h) && h.eventId) signed.push(h.eventId); });
  var rows = [];
  if (c.feed) {
    var lobbyEnd = Date.parse(lobbyDay + 'T23:59:59-06:00');
    var after = (variant === '2A' || variant === '2B') ? lobbyEnd : 0;
    var pool = eventPool_(c.feed, c.now, null, signed, after);
    rows = pickMoreWays_(pool, { '2A': 'L', '2B': 'L', '2C': 'A', '2D': 'E' }[variant], null, c.opt);
  }

  var subject = { en: V.en.subject, es: V.es.subject, both: V.both_subject };
  var preheader = { en: V.en.preheader, es: V.es.preheader };

  var block = function (L) {
    var b = { paragraph: [rich_(V[L].confirm, {})], know: [], after: [] }, C = COPY.common[L];
    b.headline = V[L].headline;
    if (variant === '2A' || variant === '2B') {
      // 2A leaves from the IPO office: use the feed's place name, as every other email does.
      var place = variant === '2A' && ev && ev[L].place ? ev[L].place : V[L].card_place;
      var mapUrl = (ev && ev.mapUrl) || LOBBY.mapUrl;
      Object.assign(b, {
        event_card: true,
        ev_weekday: L === 'es' ? 'mié' : 'Wed', ev_day: L === 'es' ? '2 dic' : 'Dec 2',
        ev_when_label: C.when, ev_when_main: V[L].card_when, ev_when_sub: V[L].card_when_sub || '',
        ev_when_text: V[L].card_when + (V[L].card_when_sub ? '. ' + V[L].card_when_sub : ''),
        ev_title: P[L].card_title, ev_title_caps: P[L].card_title.toUpperCase(),
        ev_where_label: C.where, ev_place: place,
        ev_address: V[L].card_address ? addrRich_('', V[L].card_address, mapUrl) : '',
        ev_where_text: place + (V[L].card_address ? ', ' + V[L].card_address : ''),
        ev_map: !!V[L].card_address, ev_map_url: mapUrl, ev_map_label: C.directions,
        ev_note: V[L].card_line, ev_host: ''
      });
    }
    if (variant === '2A') {
      Object.assign(b, {
        calendar: true,
        cal_google_url: ev ? ev.gcal[L] : LOBBY.gcal[L], cal_google_label: C.cal_google,
        cal_ics_url: ev ? ev.ics[L] : LOBBY.ics[L], cal_ics_label: C.cal_ics
      });
      b.know.push(rich_(V[L].know, {}));
    }
    if ((variant === '2A' || variant === '2B') && u18) b.know.push(rich_(P[L].u18, {}));
    if (variant !== '2D' && chipYes) b.know.push(rich_(P[L].chip_yes, {}));
    if (variant === '2A' && chipNo) b.know.push(rich_(P[L].chip_no, {}));
    if (variant === '2A') b.know.push(rich_(P[L].bring_someone, {}));
    if (V[L].button) {
      b.button_top = true;
      b.bt_label = V[L].button;
      b.bt_url = V[L].button_url;
      b.bt_caption = V[L].button_caption ? rich_(V[L].button_caption, {}) : '';
    }
    // "Knock doors with us:" only above canvasses; Ward Night or a meetup gets the neutral heading.
    var allCanvass = rows.every(function (e) { return e.kind === 'canvass'; });
    var heading = V[L].more_intro || (allCanvass ? P[L].lobby_back : COPY.rsvp['1D'][L].more_intro);
    if (rows.length) {
      b.other_events = true;
      b.other_events_heading = heading;
      b.other_event = rows.map(function (e) { return rowFromEvent_(e, L, false); });
    } else {
      b.other_events_empty = true;
      b.oe_empty = rich_(C.wardnight_standing, {});
    }
    if (V[L].secondary) b.after.push(rich_(V[L].secondary, {}));
    if (c.opt.inviteReplies) b.after.push(rich_(C.plans_changed, {}));
    b.signoff = V[L].signoff || P[L].signoff;
    return b;
  };
  var footer = function (L) { return [P[L].why]; };
  var attachments = variant === '2A' ? [{ url: (ev ? ev.ics : LOBBY.ics)[c.lang === 'es' ? 'es' : 'en'], filename: 'springfield-lobby-day-dec-2.ics' }] : [];
  return { variant: variant, eventId: LOBBY.id, subject: subject, preheader: preheader, block: block, footer: footer, attachments: attachments, general: false };
}

function generalShiftsBlock_(b, L, shifts) {
  var G = COPY.general[L];
  if (shifts.length) {
    b.other_events = true;
    b.other_events_heading = G.shifts_intro;
    b.other_event = shifts.map(function (e) { return rowFromEvent_(e, L, true); });
  } else {
    b.other_events_empty = true;
    b.oe_empty = rich_(G.shifts_empty, {});
  }
}

function planVolunteer_(c) {
  var a = c.a, P = COPY.volunteer;
  var interests = asList_(a.interests);
  var has = function (vals) { return vals.some(function (x) { return interests.indexOf(x) >= 0; }); };
  var qualifying = P.blocks.filter(function (bl) {
    if (bl.onlyAlone) return interests.length === 1 && interests[0] === bl.when[0];
    return has(bl.when);
  });
  var shown = qualifying.slice(0, P.cap), extra = qualifying.slice(P.cap);
  var canvOnly = has(P.canvassOnlyWhen);
  var shifts = c.feed ? pickGeneral_(c.feed, c.now, function (e) { return !canvOnly || e.kind === 'canvass'; }, c.opt) : [];
  var lobbyEv = findEvent_(c.feed, LOBBY.id);
  var lobbyOpen = lobbyEv ? eligibleGeneral_(lobbyEv, c.now) : (c.now.ymd <= LOBBY.date && Date.parse(LOBBY.start) >= c.now.ms + 2 * 3600 * 1000);
  var hsTicked = interests.indexOf(P.studentsU18When) >= 0;
  var wn = c.feed ? wardNightNext_(c.feed, c.now) : null;
  var onlyPetition = shown.length === 1 && shown[0].id === 'petition';

  var block = function (L) {
    var T = P[L], G = COPY.general[L];
    var b = { paragraph: [rich_(T.confirm, {})], know: [], after: [] };
    b.headline = T.headline;
    if (shown.length) {
      b.told = true;
      b.told_intro = onlyPetition ? '' : G.told_intro;
      b.told_item = shown.map(function (bl) {
        var x = bl[L], t = x.text;
        if (bl.id === 'doors' && shifts.length) t += x.with_shifts;
        if (bl.id === 'students' && lobbyOpen) t += x.lobby + (hsTicked ? x.lobby_u18 : '');
        return rich_(t, {});
      });
      b.told_after = extra.length ? [rich_(T.also, { list: joinList_(extra.map(function (bl) { return bl[L].title; }), G.and) })] : [];
    }
    generalShiftsBlock_(b, L, shifts);
    b.button_bottom = true; b.bb_label = G.button; b.bb_url = G.button_url;
    b.after.push(rich_(G.wardnight + (wn ? G.wardnight_next : ''), { wardnight_next: wn ? wardNightText_(wn, L) : '' }));
    b.after.push(rich_(G.bring, {}));
    b.signoff = G.signoff;
    return b;
  };
  var footer = function (L) { return [P[L].why, COPY.general[L].texting]; };
  return {
    variant: 'V', subject: { en: P.en.subject, es: P.es.subject, both: P.both_subject },
    preheader: { en: P.en.preheader, es: P.es.preheader }, block: block, footer: footer, attachments: [], general: true
  };
}

function planPetition_(c) {
  var a = c.a, P = COPY.petition;
  var intent = asList_(a.intent), acts = asList_(a.activities);
  var variant = (intent.indexOf(VALUES.petitionShift) >= 0 || acts.length) ? 'K-SHIFT' : 'K-POSTED';
  var qualifying = P.blocks.filter(function (bl) { return bl.when.some(function (x) { return acts.indexOf(x) >= 0; }); });
  var shown = qualifying.slice(0, P.cap), extra = qualifying.slice(P.cap);
  var canvOnly = P.canvassOnlyWhen.some(function (x) { return acts.indexOf(x) >= 0; });
  var shifts = c.feed ? pickGeneral_(c.feed, c.now, function (e) { return !canvOnly || e.kind === 'canvass'; }, c.opt) : [];
  var wn = c.feed ? wardNightNext_(c.feed, c.now) : null;
  var eventsShown = shown.some(function (bl) { return bl.id === 'events'; });
  var key = variant === 'K-SHIFT' ? 'shift' : 'posted';

  var block = function (L) {
    var T = P[L], G = COPY.general[L];
    var b = { paragraph: [rich_(T['confirm_' + key], {})], know: [], after: [] };
    b.headline = T.headline;
    if (shown.length) {
      b.told = true;
      b.told_intro = G.told_intro;
      b.told_item = shown.map(function (bl) {
        var x = bl[L], t = x.text;
        if (bl.id === 'doors' && shifts.length) t += x.with_shifts;
        if (bl.id === 'events' && wn) t += x.with_wardnight;
        return rich_(t, { wardnight_next: wn ? wardNightText_(wn, L) : '' });
      });
      b.told_after = extra.length ? [rich_(T.also, { list: joinList_(extra.map(function (bl) { return bl[L].title; }), G.and) })] : [];
    }
    generalShiftsBlock_(b, L, shifts);
    b.button_bottom = true; b.bb_label = G.button; b.bb_url = G.button_url;
    if (!eventsShown) b.after.push(rich_(G.wardnight + (wn ? G.wardnight_next : ''), { wardnight_next: wn ? wardNightText_(wn, L) : '' }));
    b.after.push(rich_(G.bring, {}));
    b.signoff = G.signoff;
    return b;
  };
  var footer = function (L) { return [P[L].why]; };
  return {
    variant: variant, subject: { en: P.en.subject, es: P.es.subject, both: P.both_subject },
    preheader: { en: P.en['preheader_' + key], es: P.es['preheader_' + key] }, block: block, footer: footer, attachments: [], general: true
  };
}

/** Day lines for the canvass team email: compact runs, then "Other" text in quotes. */
function availability_(a) {
  return VALUES.canvassDays.map(function (dk, di) {
    var items = asList_(a[dk]);
    var idx = [], other = [];
    items.forEach(function (it) {
      var i = VALUES.canvassSlots.indexOf(it);
      if (i >= 0) { if (idx.indexOf(i) < 0) idx.push(i); }
      else if (it !== '__other_option__') other.push(it.length > APP.OTHER_TEXT_MAX ? it.slice(0, APP.OTHER_TEXT_MAX).trim() : it);
    });
    idx.sort(function (x, y) { return x - y; });
    return { day: dk, dayIndex: di, slots: idx, other: other };
  }).filter(function (d) { return d.slots.length || d.other.length; });
}

function availabilityLine_(d, L) {
  var T = COPY.canvass[L], H = COPY.canvass.hourLabel, S = COPY.canvass.slotLabel[L];
  var parts = '';
  if (d.slots.length === 6) parts = T.all_times;
  else if (d.slots.length) {
    var runs = [], run = [d.slots[0]];
    for (var i = 1; i < d.slots.length; i++) {
      if (d.slots[i] === run[run.length - 1] + 1) run.push(d.slots[i]);
      else { runs.push(run); run = [d.slots[i]]; }
    }
    runs.push(run);
    parts = runs.map(function (r) {
      if (r.length === 1) return S[r[0]];
      return fmt_(T.range, { a: H[VALUES.canvassSlotHours[r[0]][0]], b: H[VALUES.canvassSlotHours[r[r.length - 1]][1]] });
    }).join(', ');
  }
  var others = d.other.map(function (o) { return fmt_(T.other, { other: o }); }).join(T.other_join);
  var body = parts && others ? parts + T.other_join + others : (parts || others);
  return T.days[d.dayIndex] + ': ' + body;
}

function canvassMatches_(feed, now, avail, opt) {
  var hoursByDay = {};
  avail.forEach(function (d) { if (d.slots.length) hoursByDay[d.dayIndex] = d.slots.map(function (i) { return VALUES.canvassSlotHours[i]; }); });
  var evs = sortedEvents_(feed).filter(function (e) {
    if (e.kind !== 'canvass' || !eligibleGeneral_(e, now) || !within28_(e, now)) return false;
    var p = e.date.split('-');
    var dow = (new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay() + 6) % 7; // Monday = 0
    var slots = hoursByDay[dow];
    if (!slots) return false;
    var s = e.start.slice(11, 16).split(':'), sMin = (+s[0]) * 60 + (+s[1]);
    var eMin;
    if (e.end) { var t = e.end.slice(11, 16).split(':'); eMin = (+t[0]) * 60 + (+t[1]); } else eMin = sMin + 120;
    return slots.some(function (h) { return sMin < h[1] * 60 && eMin > h[0] * 60; });
  });
  var out = evs.filter(function (e) { return e.host === 'campaign' && !e.slate; }).slice(0, 3);
  if (out.length < 3 && opt.slateFiller) {
    var s = evs.filter(isSlateCanvass_)[0];
    if (s) out.push(s);
  }
  return chrono_(out);
}

function planCanvass_(c) {
  var a = c.a, P = COPY.canvass;
  var avail = availability_(a);
  var matches = c.feed ? canvassMatches_(c.feed, c.now, avail, c.opt) : [];
  var host = asText_(a.host), langs = asText_(a.langs);
  var variant = !avail.length ? 'C-NOTIMES' : matches.length ? 'C-MATCH' : 'C-NOMATCH';
  var key = matches.length ? 'match' : 'nomatch';

  var block = function (L) {
    var T = P[L], G = COPY.general[L];
    var b = { paragraph: [rich_(T.confirm, {})], know: [], after: [] };
    b.headline = T.headline;
    b.told = true;
    b.told_intro = avail.length ? T.told_intro : '';
    b.told_item = avail.map(function (d) { return availabilityLine_(d, L); });
    b.told_after = [];
    if (!avail.length) b.told_after.push(rich_(T.no_times, {}));
    if (/^Yes/.test(host)) b.told_after.push(rich_(T.host_yes, {}));
    else if (/^Not sure/.test(host)) b.told_after.push(rich_(T.host_maybe, {}));
    if (T.langs[langs]) b.told_after.push(rich_(T.languages, { langs: T.langs[langs] }));
    if (matches.length) {
      b.other_events = true;
      b.other_events_heading = T.matches_intro;
      b.other_event = matches.map(function (e) { return rowFromEvent_(e, L, true); });
    } else {
      b.other_events_empty = true;
      b.oe_empty = rich_(T.no_matches, {});
    }
    b.button_bottom = true; b.bb_label = T.button; b.bb_url = T.button_url;
    b.after.push(rich_(T.bring, {}));
    b.signoff = T.signoff;
    return b;
  };
  var footer = function (L) { return [P[L].why, COPY.general[L].texting]; };
  return {
    variant: variant, subject: { en: P.en.subject, es: P.es.subject, both: P.both_subject },
    preheader: { en: P.en['preheader_' + key], es: P.es['preheader_' + key] }, block: block, footer: footer, attachments: [], general: true
  };
}

var PLANNERS_ = { rsvp: planRsvp_, lobbyday: planLobby_, volunteer: planVolunteer_, petition: planPetition_, canvass: planCanvass_ };

function fitSubject_(cands) {
  for (var i = 0; i < cands.length; i++) if (cands[i].length < 60) return cands[i];
  return cands[cands.length - 1];
}

// ------------------------------------------------------------------ decide

function decide(formKey, answers, ctx) {
  ctx = ctx || {};
  var opt = Object.assign({}, OPTIONS, ctx.options || {});
  var now = makeNow_(ctx.now);
  var feed = ctx.feed && ctx.feed.events ? ctx.feed : null;
  var a = answers || {};
  var person = readPerson_(formKey, a);
  var out = {
    send: false, reason: '', subject: '', html: '', text: '', attachments: [], variant: '', lang: '',
    form: formKey, email: person.email, eventId: formKey === 'rsvp' ? eventIdOf_(a) : formKey === 'lobbyday' ? LOBBY.id : '',
    fingerprint: ''
  };
  var junk = junkReason_(person);
  if (junk) { out.reason = junk; return out; }
  out.fingerprint = fingerprint(formKey, a);
  var hist = (ctx.history || []).filter(function (h) { return h.email === person.email; });
  var repeat = hist.some(function (h) {
    return h.form === formKey && h.fp === out.fingerprint && h.status !== 'error' && now.ms - h.time < APP.REPEAT_WINDOW_MS;
  });
  if (repeat) { out.reason = 'repeat_10min'; return out; }

  var lang = pickLang_(formKey, a);
  out.lang = lang;
  var plan = PLANNERS_[formKey]({ a: a, person: person, now: now, feed: feed, hist: hist, opt: opt, lang: lang, fp: out.fingerprint });
  if (plan.skip) { out.reason = plan.skip; out.eventId = plan.eventId || out.eventId; return out; }
  out.variant = plan.variant + (plan.sub ? '-' + plan.sub : '');
  out.eventId = plan.eventId || out.eventId;

  var Ls = lang === 'both' ? ['en', 'es'] : [lang];
  var blocks = Ls.map(function (L, i) {
    var b = plan.block(L), C = COPY.common[L];
    b.lang = L;
    b.lang_divider = i > 0;
    b.divider_label = COPY.common.divider;
    b.greeting = person.first ? fmt_(C.greeting, { first_name: person.first }) : C.greeting_none;
    b.headline_caps = String(b.headline).toUpperCase();
    b.signoff_name = C.team;
    b.signoff_quote = C.quote;
    return b;
  });

  var per = Ls.map(function (L) {
    var C = COPY.common[L], lines = plan.footer(L).slice();
    if (plan.general && opt.inviteReplies) lines.push(C.not_you);
    if (opt.stateBoardNotice) lines.push(C.state_board);
    return lines.map(function (s) { return linked_(s, LINK_FOOT_, ''); });
  });
  // One footer group per language: the whole English footer, a thin rule, the whole Spanish one.
  var footerGroups = Ls.map(function (L, i) {
    return {
      lang: L, group_divider: i > 0, paid_for: COPY.common[L].paid_for,
      footer_line: per[i].map(function (t) { return { footer_text: t }; })
    };
  });

  var subject = lang === 'both' ? plan.subject.both : plan.subject[lang];
  var preheader = lang === 'both' ? plan.preheader.en + ' ' + plan.preheader.es : plan.preheader[lang];
  var rendered = renderEmail_({
    html_lang: lang === 'es' ? 'es' : 'en',
    subject: subject,
    preheader: preheader,
    lang_note: lang === 'both' ? COPY.common.lang_note : '',
    lang_note_lang: 'es',
    lang_block: blocks,
    footer_group: footerGroups
  });

  out.send = true;
  out.reason = plan.note || '';
  out.subject = subject;
  out.preheader = preheader;
  out.html = rendered.html;
  out.text = rendered.text;
  out.attachments = plan.attachments;
  out.meta = {
    rows: (blocks[0].other_event || []).length,
    rowUrls: (blocks[0].other_event || []).map(function (r) { return r.oe_url; }),
    also: (blocks[0].also_item || []).length,
    told: (blocks[0].told_item || []).length
  };
  return out;
}

// ------------------------------------------------------------------ switches

/**
 * Apply the Script Property switches to a decision.
 * props: plain object of Script Properties. quota: MailApp.getRemainingDailyQuota() or null.
 */
function gate(d, props, quota) {
  var g = Object.assign({}, d, { to: '', status: d.send ? 'sent' : 'skipped' });
  if (!d.send) return g;
  var stop = function (reason) { g.send = false; g.status = 'skipped'; g.reason = reason + (d.reason ? '; ' + d.reason : ''); return g; };
  if (String(props[PROP.formEnabled(d.form)] || '').toLowerCase() !== 'true') return stop('form_off');
  if (String(props[PROP.ENABLED] || '').toLowerCase() !== 'true') return stop('log_only');
  if (quota != null && quota < APP.QUOTA_RESERVE) return stop('quota_low');
  var test = String(props[PROP.TEST_RECIPIENT] || '').trim();
  if (test) {
    g.to = test;
    g.subject = '[TEST] ' + d.subject;
    g.reason = 'test_recipient' + (d.reason ? '; ' + d.reason : '');
  } else {
    g.to = d.email;
  }
  return g;
}
