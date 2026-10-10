// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://byronfor25.com',
  base: '/',
  // Show Up merged into /volunteer (Oct 2026). Old /events/ links land on the
  // Show Up block; the .ics files under /events/ are real routes and unaffected.
  redirects: {
    '/events': '/volunteer/#show-up',
  },
});
