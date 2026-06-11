// Shared motion engine: one reveal observer for .animate-in, count-ups,
// the scroll-linked ballot timeline, marquee offscreen pausing, and the
// day-counter chip. The signature wall is code-split and only loads on
// pages that contain [data-sigwall].
import { initCountups } from './countup.js';

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

const reveal = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        reveal.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
);

export function observeNew(el) {
  reveal.observe(el);
}

function initTimeline(reduced) {
  const list = document.querySelector('[data-bt]');
  if (!list) return;
  const fill = list.querySelector('[data-bt-fill]');
  const items = [...list.querySelectorAll('.bt-item')];
  if (reduced.matches) {
    if (fill) fill.style.transform = 'scaleY(1)';
    items.forEach((item) => item.classList.add('reached'));
    return;
  }
  let ticking = false;
  function update() {
    ticking = false;
    const rect = list.getBoundingClientRect();
    const anchor = innerHeight * 0.6;
    const progress = Math.min(Math.max((anchor - rect.top) / rect.height, 0), 1);
    if (fill) fill.style.transform = `scaleY(${progress})`;
    items.forEach((item) => {
      item.classList.toggle('reached', item.getBoundingClientRect().top < anchor);
    });
  }
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();
}

function initTickers() {
  const tickers = document.querySelectorAll('[data-ticker]');
  if (!tickers.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
    });
  });
  tickers.forEach((ticker) => io.observe(ticker));
}

function initUrgency() {
  document.querySelectorAll('[data-days-since]').forEach((el) => {
    const since = new Date(el.dataset.daysSince + 'T00:00:00');
    const days = Math.max(1, Math.floor((Date.now() - since.getTime()) / 86400000) + 1);
    el.textContent = String(days);
  });
}

export function initMotion() {
  document.querySelectorAll('.animate-in').forEach((el) => reveal.observe(el));
  initCountups(REDUCED);
  initTimeline(REDUCED);
  initTickers();
  initUrgency();
  if (document.querySelector('[data-sigwall]')) {
    import('./signature-wall.js').then((mod) => mod.initSigWall(REDUCED));
  }
}
