// Canvas tally-mark wall: paints one stroke per signature in an eased wave.
// Deterministic (seeded PRNG), append-only painting (no per-frame clears),
// adaptive density so 22,788 marks read as tally clusters on desktop and
// pointillist grain on phones.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INK_BLUE = 'rgba(3, 109, 153, 0.8)';
const INK_ORANGE = 'rgba(230, 136, 28, 0.85)';

function layout(canvas, count) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(rect.width, 280);
  const h = Math.max(rect.height, 240);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cell = Math.max(2.5, Math.floor(Math.sqrt((w * h) / count) * 10) / 10);
  const cols = Math.floor(w / cell);
  return { ctx, cell, cols, w, h };
}

function paintRange(state, from, to) {
  const { ctx, cell, cols } = state;
  const rand = mulberry32(22788 + from);
  const tally = cell >= 5;
  ctx.lineCap = 'round';
  for (let i = from; i < to; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cell + cell / 2 + (rand() - 0.5) * 3;
    const y = row * cell + cell / 2 + (rand() - 0.5) * 3;
    const tilt = (rand() - 0.5) * 0.25;
    ctx.strokeStyle = rand() < 0.08 ? INK_ORANGE : INK_BLUE;
    ctx.lineWidth = Math.min(1.25, cell / 3);
    ctx.beginPath();
    if (tally && (i + 1) % 5 === 0) {
      // every fifth mark slashes the group of five
      ctx.moveTo(x - cell * 1.9, y + cell * 0.45);
      ctx.lineTo(x + cell * 0.45, y - cell * 0.45);
    } else {
      const half = cell * 0.42;
      ctx.moveTo(x + Math.sin(tilt) * half, y - Math.cos(tilt) * half);
      ctx.lineTo(x - Math.sin(tilt) * half, y + Math.cos(tilt) * half);
    }
    ctx.stroke();
  }
}

export function initSigWall(reduced) {
  document.querySelectorAll('[data-sigwall]').forEach((canvas) => {
    const count = parseInt(canvas.dataset.sigwallCount ?? '22788', 10);
    const duration = +(canvas.dataset.sigwallDuration ?? 2400);
    let state = layout(canvas, count);
    let painted = 0;
    let started = false;

    function wave() {
      const start = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const target = Math.round(ease(p) * count);
        if (target > painted) {
          paintRange(state, painted, target);
          painted = target;
        }
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            io.unobserve(canvas);
            if (reduced.matches) {
              paintRange(state, 0, count);
              painted = count;
            } else {
              wave();
            }
          }
        });
      },
      { threshold: 0.35 }
    );
    io.observe(canvas);

    let resizeTimer;
    addEventListener(
      'resize',
      () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const done = painted;
          state = layout(canvas, count);
          painted = 0;
          paintRange(state, 0, done);
          painted = done;
        }, 150);
      },
      { passive: true }
    );
  });
}
