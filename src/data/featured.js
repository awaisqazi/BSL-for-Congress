// The one shift on the flyer in circulation ("RSVP: link in bio"). It gets the
// short link sigchofor25.com/rsvp (src/pages/rsvp.astro, with its own link
// share card) and the first strip on /links.
//
// For the next flyer: change `id` to that entry's id in events.json, and
// point `share` at its 1200x630 share card in public/images (or leave the
// site default, '/images/og-card.png'). Nothing else needs editing.
export const FEATURED = {
  id: 'canvass-2026-11-28-ipo',
  share: '/images/og-canvass-2026-11-28.jpg',
  shareAlt: 'Knock Doors for Byron and Brandon. Saturday, November 28, 9:30 AM, 25th Ward IPO, 2102 W Cermak Rd. Photo: Alderman Byron Sigcho-Lopez and Mayor Brandon Johnson.',
};
