// One month-grid implementation for every calendar on the site: the /volunteer
// calendar (MiniCalendar.astro, size "full"), the desktop nav popover and the
// mobile drawer (Navbar.astro, size "compact"). Data is the compact payload
// from src/data/calendar-data.js, inlined once per page as
// <script type="application/json" id="bsl-cal-data">. Styles live in
// src/styles/calendar.css (global, prefix calg- and caln-), because the grid
// is written with innerHTML and scoped Astro styles would not reach it.
import en from '../i18n/en.json';
import es from '../i18n/es.json';

export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
// Weeks start on Sunday, in both languages.
export const weekStart = (s) => addDays(s, -parse(s).getDay());
export const todayISO = () => iso(new Date());
export const monthOf = (s) => {
  const d = parse(s);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export function lang() {
  try {
    return localStorage.getItem('bsl-lang') === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

// The events namespace in the current language (English as the fallback).
export function t() {
  return (lang() === 'es' ? es : en).events;
}
const list = (key) => (t()[key] || en.events[key]).split(',');

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let cached = null;
export function readData() {
  if (cached) return cached;
  const raw = document.getElementById('bsl-cal-data')?.textContent;
  cached = raw ? JSON.parse(raw) : null;
  return cached;
}

export const SHIFT_KINDS = ['canvass', 'wardnight', 'meetup'];
export const isShift = (it) => SHIFT_KINDS.includes(it.k);
export const kindClass = (k) => (k === 'wardnight' ? 'ward' : k === 'deadline' || k === 'election' || k === 'runoff' ? 'date' : 'shift');

// Day index: dated entries (ranges mark every day; shifts drop once expired),
// the weekly shifts from today through Election Day, the runoff marker.
export function buildIndex(data, today = todayISO()) {
  const byDay = new Map();
  const put = (day, item) => {
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(item);
  };
  for (const e of data.dated) {
    if (isShift(e) && e.x < today) continue;
    for (let d = e.d; d <= e.to; d = addDays(d, 1)) put(d, e);
  }
  for (let d = today; d <= data.until; d = addDays(d, 1)) {
    const dow = parse(d).getDay();
    for (const w of data.weekly) if (w.dow === dow) put(d, { ...w, weekly: true });
  }
  put(data.last, { k: 'runoff' });
  byDay.forEach((items) => items.sort((a, b) => Number(!!a.weekly) - Number(!!b.weekly)));
  return byDay;
}

export const shiftCount = (byDay, day) => (byDay.get(day) || []).filter(isShift).length;

// First day on or after `from` with a shift, inside the calendar's range.
export function nextShiftDay(byDay, from, until) {
  const keys = [...byDay.keys()].filter((k) => k >= from && k <= until && shiftCount(byDay, k) > 0).sort();
  return keys[0] || null;
}

// Months the grids can show: the current month through the runoff month.
export function bounds(data, today = todayISO()) {
  return { first: monthOf(today), last: monthOf(data.last) };
}
export function inBounds(day, b) {
  const t0 = parse(day);
  if (isNaN(t0.getTime())) return false;
  const m = monthOf(day);
  return m >= b.first && m <= b.last;
}

export function monthTitle(view) {
  const name = list('cal_months')[view.getMonth()];
  return lang() === 'es' ? `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${view.getFullYear()}` : `${name} ${view.getFullYear()}`;
}

export function dayLabel(day, withWeekday = false) {
  const d = parse(day);
  const m = list('cal_months')[d.getMonth()];
  const w = list('cal_weekdays_long')[d.getDay()];
  if (lang() === 'es') return `${withWeekday ? w + ' ' : ''}${d.getDate()} de ${m}`;
  return `${withWeekday ? w + ', ' : ''}${m} ${d.getDate()}`;
}

export function countLabel(n) {
  const d = t();
  if (n === 0) return d.cal_none;
  return (n === 1 ? d.cal_one : d.cal_many).replace('{n}', String(n));
}

// Renders weekday labels and the day cells into `host`.
//   size: 'full' | 'compact'
//   selected: a YYYY-MM-DD day (filled brand blue) or null
//   range: [from, to] days drawn as a band (a selected week) or null
//   hrefFor(day): when given, cells are links (popover, drawer) not buttons
//   focusDay: the one cell in the tab order (roving tabindex)
export function renderMonth(host, o) {
  const { view, size = 'full', byDay, today = todayISO(), selected = null, range = null, hrefFor = null } = o;
  const compact = size === 'compact';
  const viewKey = iso(view).slice(0, 7);
  const focusDay = o.focusDay && o.focusDay.startsWith(viewKey)
    ? o.focusDay
    : selected && selected.startsWith(viewKey)
      ? selected
      : today.startsWith(viewKey) ? today : `${viewKey}-01`;
  const names = list('cal_weekdays').map((w) => (compact ? w.slice(0, 2) : w));
  const start = new Date(view);
  start.setDate(1 - start.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (i >= 35 && d.getMonth() !== view.getMonth()) break;
    const key = iso(d);
    const items = byDay.get(key) || [];
    const outside = d.getMonth() !== view.getMonth();
    const inRange = range && key >= range[0] && key <= range[1];
    const dots = items.slice(0, 3).map((it) => `<span class="calg-dot calg-dot-${kindClass(it.k)}"></span>`).join('');
    const cls = [
      'calg-day',
      outside && 'is-outside',
      key === today && 'is-today',
      key < today && 'is-past',
      key === selected && 'is-selected',
      inRange && 'is-inrange',
      inRange && key === range[0] && 'is-range-start',
      inRange && key === range[1] && 'is-range-end',
      items.length && 'has-events',
    ].filter(Boolean).join(' ');
    const aria = `${dayLabel(key)}, ${countLabel(items.length)}${key === today ? `, ${t().today}` : ''}`;
    const common = `class="${cls}" data-day="${key}" aria-label="${esc(aria)}" tabindex="${key === focusDay ? 0 : -1}"${key === today ? ' aria-current="date"' : ''}`;
    const inner = `<span class="calg-num" aria-hidden="true">${d.getDate()}</span><span class="calg-dots" aria-hidden="true">${dots}</span>`;
    cells.push(hrefFor
      ? `<a ${common} href="${esc(hrefFor(key))}">${inner}</a>`
      : `<button type="button" ${common} aria-pressed="${key === selected || !!inRange}">${inner}</button>`);
  }
  host.innerHTML =
    `<div class="calg calg-${size}"><div class="calg-weekdays" aria-hidden="true">${names.map((w) => `<span>${esc(w)}</span>`).join('')}</div>` +
    `<div class="calg-grid">${cells.join('')}</div></div>`;
}

// Arrow keys move a day or a week; Home/End jump to the week's ends.
// Returns the target day, or null when the key is not ours.
export function keyTarget(ev, day) {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key];
  if (step) return addDays(day, step);
  if (ev.key === 'Home') return weekStart(day);
  if (ev.key === 'End') return addDays(weekStart(day), 6);
  return null;
}

// The next n shifts from today for the one-line "next up" rows. A weekly
// entry is skipped on a day that already has a dated shift of the same kind
// (the dated one is the specific shift).
export function nextShifts(byDay, today, until, n = 3) {
  const out = [];
  const keys = [...byDay.keys()].filter((k) => k >= today && k <= until).sort();
  for (const day of keys) {
    const items = byDay.get(day).filter(isShift);
    for (const it of items) {
      if (it.weekly && items.some((o) => !o.weekly && o.k === it.k)) continue;
      out.push({ day, it });
      if (out.length >= n) return out;
    }
  }
  return out;
}

export function rowsHtml(rows) {
  const L = lang();
  const wd = list('cal_weekdays');
  const months = list('cal_months');
  return rows.map(({ day, it }) => {
    const d = parse(day);
    const mon = months[d.getMonth()].slice(0, 3);
    const date = L === 'es' ? `${d.getDate()} ${mon}` : `${mon} ${d.getDate()}`;
    const when = it.weekly ? it.w[L] : it.time ? it.time[L] : '';
    const ext = it.ext ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<li class="caln-row caln-${kindClass(it.k)}">` +
      `<span class="caln-day"><span class="caln-wd">${esc(wd[d.getDay()])}</span><span class="caln-date">${esc(date)}</span></span>` +
      `<span class="caln-what"><span class="caln-title">${esc(it.t[L])}</span>${when ? `<span class="caln-time">${esc(when)}</span>` : ''}</span>` +
      `<a class="caln-act" href="${esc(it.href)}"${ext}>${esc(it.act[L])}<span aria-hidden="true"> →</span></a></li>`;
  }).join('');
}
