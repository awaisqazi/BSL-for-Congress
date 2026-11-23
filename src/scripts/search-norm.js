// Shared by the build (src/data/events.js writes each shift's search words)
// and the /volunteer calendar search (MiniCalendar.astro), so both sides fold
// text the same way: accents off ("sábado" -> "sabado"), lower case,
// punctuation to spaces. Same idea as the /news search.
export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const words = (s) => norm(s).split(' ').filter(Boolean);

// Every query word must match (AND). A number must equal a word ("5" finds
// Dec 5, not 15 or 2058); anything else matches the start of a word
// ("cerm" finds Cermak, "sab" finds sábado).
export function matches(haystack, query) {
  if (!query.length) return true;
  return query.every((q) => (/^\d+$/.test(q) ? haystack.includes(q) : haystack.some((w) => w.startsWith(q))));
}
