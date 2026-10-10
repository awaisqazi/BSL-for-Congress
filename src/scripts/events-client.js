// Browser side of the events surface. The site is static and only rebuilt on
// deploy, so the cards re-check their own dates here: past shifts come off
// the wall, the first N that remain show, and each card gets a "Today" /
// "Tomorrow" / "In 5 days" chip in the current language.
import en from '../i18n/en.json';
import es from '../i18n/es.json';

function daysUntil(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const now = new Date();
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

export function isPast(iso) {
  return Date.now() > new Date(iso + 'T23:59:59').getTime();
}

// Remove past cards inside `list`, show the first `limit` (all when null).
// Returns how many cards remain. Other components' scripts may already have
// removed an expired card (they key off data-expires too); that is fine.
export function pruneList(list, limit = null) {
  if (!list) return 0;
  list.querySelectorAll('[data-expires]').forEach((el) => {
    if (isPast(el.getAttribute('data-expires'))) el.remove();
  });
  const cards = Array.from(list.querySelectorAll('.ev-card'));
  cards.forEach((el, i) => {
    el.hidden = limit != null && i >= limit;
  });
  return cards.length;
}

function lang() {
  try {
    return localStorage.getItem('bsl-lang') === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export function paintCountdowns(root = document) {
  const dict = (lang() === 'es' ? es : en).events;
  root.querySelectorAll('[data-ev-countdown]').forEach((chip) => {
    const n = daysUntil(chip.getAttribute('data-ev-countdown'));
    let text = '';
    if (n === 0) text = dict.today;
    else if (n === 1) text = dict.tomorrow;
    else if (n > 1 && n <= 14) text = dict.in_days.replace('{n}', String(n));
    chip.textContent = text;
    chip.hidden = !text;
  });
}

export function watchCountdowns() {
  paintCountdowns();
  document.addEventListener('bsl:langchange', () => paintCountdowns());
}
