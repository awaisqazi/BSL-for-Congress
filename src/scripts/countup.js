// Animated count-up for [data-countup] spans. The SSR'd text is the final
// value, so no-JS, SEO, and reduced-motion all see the real number. Numbers
// always live OUTSIDE data-i18n spans (the i18n swap would overwrite them);
// en.json and es.json use identical comma formatting, so en-US grouping is
// correct in both languages.
const fmt = new Intl.NumberFormat('en-US');

function render(el, value) {
  el.textContent = (el.dataset.countupPrefix ?? '') + fmt.format(value) + (el.dataset.countupSuffix ?? '');
}

function run(el) {
  const target = parseInt(el.dataset.countup, 10);
  const duration = +(el.dataset.countupDuration ?? 1600);
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(2, -10 * t);
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    render(el, Math.round(ease(p) * target));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function initCountups(reduced) {
  const els = document.querySelectorAll('[data-countup]');
  if (!els.length) return;
  if (reduced.matches) {
    els.forEach((el) => render(el, parseInt(el.dataset.countup, 10)));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          io.unobserve(entry.target);
          run(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  els.forEach((el) => io.observe(el));
}
