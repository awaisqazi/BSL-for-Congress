/**
 * Fixtures.gs: fictional submissions, one or more per email variant, plus the cases that
 * must send nothing. Used by sendSamplesToSelf() (Tests.gs) and by the Node harness.
 * Everyone here is made up: example.net addresses, 555 phone numbers.
 *
 * Fields: id, form, now (Chicago time), answers (keys from FORM_TITLES), history (earlier
 * log rows: minutes ago, form, event id, status, answers), feedDown, expect, note
 * (when it sends, for the preview gallery), sample (include in sendSamplesToSelf).
 */

var FX_NOW_ = '2026-11-23T10:00:00-06:00';    // a Monday morning
var FX_AFTER_LOBBY_ = '2026-12-03T09:00:00-06:00';

var FX_ROSA_ = { name: 'Rosa Ejemplo', phone: '312-555-0101', email: 'rosa.ejemplo@example.net', zip: '60608' };
var FX_LUIS_ = { name: 'Luis Prueba', phone: '', email: 'luis.prueba@example.net', zip: '60623' };

function fxRsvp_(who, label, date, bringing, extra) {
  return Object.assign({ name: who.name, phone: who.phone, email: who.email, zip: who.zip, event: label, date: date, bringing: bringing }, extra || {});
}

var FX_L_ = {
  dec5: 'Canvass for Byron: Phase 2 Launch, 25th Ward IPO office [canvass-2026-12-05-phase-2-launch]',
  dec6: 'Canvass for Byron, 25th Ward IPO office [canvass-2026-12-06-ipo]',
  dec12: 'Canvass for Byron, 25th Ward IPO office [canvass-2026-12-12-ipo]',
  dec13: 'Canvass for Byron, 25th Ward IPO office [canvass-2026-12-13-ipo]',
  dec19: 'Canvass for Byron, 25th Ward IPO office [canvass-2026-12-19-ipo]',
  dec20: 'Canvass for Byron, 25th Ward IPO office [canvass-2026-12-20-ipo]',
  wn1: 'Ward Night, 25th Ward office [wardnight-2026-12-01]',
  wn8: 'Ward Night, 25th Ward office [wardnight-2026-12-08]',
  townhall: '25th Ward Town Hall, Location to be announced [meetup-2026-12-11-ward-town-hall]',
  ceda: 'CEDA Utility Bill Assistance, 2100 W Cermak Rd [meetup-2026-11-24-ceda-utility-bill-help]',
  past: "People's Town Hall: Who Decides Chicago?, 25th Ward IPO office [meetup-2026-11-20-peoples-town-hall]",
  unknown: 'Winter Potluck, 25th Ward IPO office [meetup-2026-12-24-winter-potluck]'
};

var FX_LOBBY_ = {
  bus: 'Yes, save me a seat on the bus / Sí, resérvenme un asiento en el autobús',
  own: "I'll get to Springfield on my own / Llegaré a Springfield por mi cuenta",
  cant: "I can't go, but keep me updated / No puedo ir, pero manténganme informado/a",
  u18yes: 'Yes, a parent or guardian will need to sign a permission form / Sí, mi madre, padre o tutor deberá firmar un permiso',
  chipYes: 'Yes, I can donate / Sí, puedo donar',
  chipNo: 'Not right now / Por ahora no'
};

function fxLobby_(seat, u18, chip, extra) {
  return Object.assign({
    name: 'Marisol Ejemplo', phone: '773-555-0144', email: 'marisol.ejemplo@example.net', address: '60608',
    seat: seat, iam: ['Student / Estudiante'], u18: u18 || 'No', chip: chip || '', notes: ''
  }, extra || {});
}

var FX_ALL11_ = ['Collect Petition Signatures', 'Knock on Doors', 'Phone/Text Banking', 'Host a Meet & Greet',
  'Bilingual Outreach (I speak Spanish / Yo hablo español)', 'Post on Social Media', 'Precinct Captain / Volunteer',
  'High School Ambassador', 'College Campus Captain / Volunteer', 'Help Create Marketing Collateral (Graphic Design)',
  'Help Create Campaign Videos (Videography / Video Editing)'];

function fxVol_(interests, extra) {
  return Object.assign({ first: 'Ana', last: 'Muestra', email: 'ana.muestra@example.net', phone: '312-555-0177', city: 'Chicago', zip: '60608', interests: interests }, extra || {});
}

function fxCanvass_(days, host, langs, extra) {
  var a = { first: 'Jorge', last: 'Ficticio', phone: '773-555-0190', email: 'jorge.ficticio@example.net', address: '2100 S Example Ave', host: host, langs: langs };
  Object.keys(days).forEach(function (k) { a[k] = days[k]; });
  return Object.assign(a, extra || {});
}

var FIXTURES = [
  // ---------------------------------------------------------------- event sign-up
  { id: 'canvass', form: 'rsvp', now: FX_NOW_, sample: true, shot600: true,
    answers: fxRsvp_(FX_ROSA_, FX_L_.dec6, 'Sunday, December 6', '1'),
    expect: { variant: '1A', lang: 'both' },
    note: 'Sign-up for a dated canvass. Bringing 1, phone given (texting line in the footer).' },
  { id: 'launch', form: 'rsvp', now: FX_NOW_, sample: true,
    answers: fxRsvp_(FX_LUIS_, FX_L_.dec5, 'Saturday, December 5', '0', { language: 'en' }),
    expect: { variant: '1A', lang: 'en' },
    note: 'Dec 5 Phase 2 Launch, its own subject. English only because a future hidden "Language" question said en. No phone, so no texting line.' },
  { id: 'guests3', form: 'rsvp', now: FX_NOW_, sample: true,
    answers: fxRsvp_(FX_ROSA_, FX_L_.dec12, 'Saturday, December 12', '3', { language: 'es' }),
    expect: { variant: '1A', lang: 'es' },
    note: 'Spanish only (hidden "Language" question said es). Bringing 3.' },
  { id: 'wardnight', form: 'rsvp', now: FX_NOW_, sample: true,
    answers: fxRsvp_(FX_LUIS_, FX_L_.wn1, 'Tuesday, December 1', '0'),
    expect: { variant: '1B', lang: 'both' },
    note: 'Sign-up for a Ward Night (a ward-office event; sent while wardEventConfirmations is true).' },
  { id: 'townhall', form: 'rsvp', now: FX_NOW_, sample: true,
    answers: fxRsvp_(FX_ROSA_, FX_L_.townhall, 'Friday, December 11', '0'),
    expect: { variant: '1C', lang: 'both' },
    note: 'A meetup whose place is "Location to be announced" (Dec 11 Town Hall).' },
  { id: 'ceda', form: 'rsvp', now: FX_NOW_, sample: true, shot600: true,
    answers: fxRsvp_(FX_ROSA_, FX_L_.ceda, 'Tuesday, November 24', '2'),
    expect: { variant: '1D', lang: 'both' },
    note: 'A meetup with an address (CEDA bill help): "Bring with you" block and the host line. Bringing 2.' },
  { id: 'over', form: 'rsvp', now: FX_NOW_, sample: true,
    answers: fxRsvp_(FX_LUIS_, FX_L_.past, 'Friday, November 20', '0'),
    expect: { variant: '1E-over', lang: 'both' },
    note: 'Sign-up arrives after the event day (feed "expires" is past). No card, no calendar.' },
  { id: 'notfound', form: 'rsvp', now: FX_NOW_, sample: true,
    answers: fxRsvp_(FX_LUIS_, FX_L_.unknown, 'Thursday, December 24', '0'),
    expect: { variant: '1E-notfound', lang: 'both' },
    note: 'The bracketed event id is not in the feed.' },
  { id: 'feeddown', form: 'rsvp', now: FX_NOW_, feedDown: true,
    answers: fxRsvp_(FX_ROSA_, FX_L_.dec6, 'Sunday, December 6', '0'),
    expect: { variant: '1E-notfound', lang: 'both', reason: 'feed_unavailable' },
    note: 'The feed could not be read: the no-card email still goes out, with the standing Ward Night line instead of a list.' },
  { id: 'updated', form: 'rsvp', now: FX_NOW_, sample: true,
    answers: fxRsvp_(FX_ROSA_, FX_L_.dec13, 'Sunday, December 13', '2'),
    history: [{ ago_min: 90, form: 'rsvp', eventId: 'canvass-2026-12-13-ipo', variant: '1A', answers: { event: FX_L_.dec13, bringing: '0' } }],
    expect: { variant: '1F', lang: 'both' },
    note: 'Same address, same event, new guest count (was 0, now 2). No "more ways" list.' },
  { id: 'second', form: 'rsvp', now: FX_NOW_, sample: true,
    answers: fxRsvp_(FX_ROSA_, FX_L_.dec19, 'Saturday, December 19', '0'),
    history: [
      { ago_min: 2880, form: 'rsvp', eventId: 'canvass-2026-12-06-ipo', variant: '1A', answers: { event: FX_L_.dec6, bringing: '0' } },
      { ago_min: 1440, form: 'rsvp', eventId: 'wardnight-2026-12-08', variant: '1B', answers: { event: FX_L_.wn8, bringing: '0' } }
    ],
    expect: { variant: '1A', lang: 'both', also: 2 },
    note: 'Second and third sign-ups (1G): "You\'re also on the list for" block; their own events are left out of "more ways".' },
  { id: 'roll', form: 'rsvp', now: FX_NOW_, sample: true,
    answers: fxRsvp_(FX_ROSA_, FX_L_.dec20, 'Sunday, December 20', '0'),
    history: [
      { ago_min: 600, form: 'rsvp', eventId: 'canvass-2026-12-12-ipo', variant: '1A', answers: { event: FX_L_.dec12, bringing: '0' } },
      { ago_min: 300, form: 'rsvp', eventId: 'canvass-2026-12-13-ipo', variant: '1A', answers: { event: FX_L_.dec13, bringing: '0' } }
    ],
    expect: { variant: '1A', lang: 'both', also: 2, rows: 1 },
    note: 'Three upcoming canvasses: "You\'re on a roll" and one more way to show up.' },
  { id: 'skip-noemail', form: 'rsvp', now: FX_NOW_,
    answers: fxRsvp_({ name: 'Rosa Ejemplo', phone: '312-555-0101', email: '', zip: '60608' }, FX_L_.dec6, 'Sunday, December 6', '0'),
    expect: { skip: 'no_email' }, note: 'Phone-only sign-up: no email, by design.' },
  { id: 'skip-invalid', form: 'rsvp', now: FX_NOW_,
    answers: fxRsvp_({ name: 'Rosa Ejemplo', phone: '', email: 'rosa.ejemplo@', zip: '' }, FX_L_.dec6, '', '0'),
    expect: { skip: 'invalid_email' }, note: 'Email fails the basic check.' },
  { id: 'skip-junk', form: 'rsvp', now: FX_NOW_,
    answers: fxRsvp_({ name: 'Free prizes http://prizes.example.net', phone: '', email: 'winner@example.net', zip: '' }, FX_L_.dec6, '', '0'),
    expect: { skip: 'junk_name_link' }, note: 'A link in the name field.' },
  { id: 'skip-testname', form: 'rsvp', now: FX_NOW_,
    answers: fxRsvp_({ name: 'TEST - site form check', phone: '', email: 'staff.check@example.net', zip: '' }, FX_L_.dec6, '', '0'),
    expect: { skip: 'test_name' }, note: 'The campaign\'s own test rows.' },
  { id: 'skip-testdomain', form: 'rsvp', now: FX_NOW_,
    answers: fxRsvp_({ name: 'Rosa Ejemplo', phone: '', email: 'rosa@example.com', zip: '' }, FX_L_.dec6, '', '0'),
    expect: { skip: 'test_address' }, note: 'example.com, example.org and .test addresses never get mail.' },
  { id: 'skip-repeat', form: 'rsvp', now: FX_NOW_,
    answers: fxRsvp_(FX_ROSA_, FX_L_.dec6, 'Sunday, December 6', '1'),
    history: [{ ago_min: 3, form: 'rsvp', eventId: 'canvass-2026-12-06-ipo', variant: '1A', answers: { event: FX_L_.dec6, bringing: '1' } }],
    expect: { skip: 'repeat_10min' }, note: 'Same form, same address, same event and guests, 3 minutes later.' },

  // ---------------------------------------------------------------- Springfield Lobby Day
  { id: 'bus', form: 'lobbyday', now: FX_NOW_, sample: true, shot600: true,
    answers: fxLobby_(FX_LOBBY_.bus, FX_LOBBY_.u18yes, FX_LOBBY_.chipYes),
    expect: { variant: '2A', lang: 'both' },
    note: 'Seat on the bus. Under 18 and "Yes, I can donate" add their lines.' },
  { id: 'bus-chipno', form: 'lobbyday', now: FX_NOW_,
    answers: fxLobby_(FX_LOBBY_.bus, 'No', FX_LOBBY_.chipNo, { language: 'en' }),
    expect: { variant: '2A', lang: 'en' },
    note: 'Seat on the bus, "Not right now" on the chip-in: the no-one-turned-away line. English only (hidden Language question).' },
  { id: 'bus', form: 'lobbyday', now: FX_NOW_, fileLang: 'es',
    answers: fxLobby_(FX_LOBBY_.bus, 'No', '', { language: 'es' }),
    expect: { variant: '2A', lang: 'es' },
    note: 'Seat on the bus, Spanish only, no add-ons.' },
  { id: 'own', form: 'lobbyday', now: FX_NOW_, sample: true,
    answers: fxLobby_(FX_LOBBY_.own, FX_LOBBY_.u18yes, FX_LOBBY_.chipYes),
    expect: { variant: '2B', lang: 'both' },
    note: 'Getting there on their own: no calendar buttons (the calendar file is the bus), "Bring someone" is the button.' },
  { id: 'cantgo', form: 'lobbyday', now: FX_NOW_, sample: true,
    answers: fxLobby_(FX_LOBBY_.cant, FX_LOBBY_.u18yes, FX_LOBBY_.chipYes),
    expect: { variant: '2C', lang: 'both' },
    note: 'Can\'t go, keep me updated. No card; under-18 line left out on purpose.' },
  { id: 'passed', form: 'lobbyday', now: FX_AFTER_LOBBY_, sample: true,
    answers: fxLobby_(FX_LOBBY_.bus, 'No', FX_LOBBY_.chipYes),
    expect: { variant: '2D', lang: 'both' },
    note: 'Any registration that arrives after Dec 2.' },
  { id: 'skip-repeat', form: 'lobbyday', now: FX_NOW_,
    answers: fxLobby_(FX_LOBBY_.bus, 'No', ''),
    history: [{ ago_min: 5, form: 'lobbyday', eventId: 'meetup-2026-12-02-springfield-lobby-day', variant: '2A', answers: fxLobby_(FX_LOBBY_.bus, 'No', '') }],
    expect: { skip: 'repeat_10min' }, note: 'Same seat answer again inside 10 minutes.' },

  // ---------------------------------------------------------------- volunteer (and /genz)
  { id: 'all11', form: 'volunteer', now: FX_NOW_, sample: true, shot600: true,
    answers: fxVol_(FX_ALL11_),
    expect: { variant: 'V', lang: 'both', told: 3 },
    note: 'All eleven boxes ticked: three blocks (doors, precinct captain, Spanish), then "You also told us".' },
  { id: 'petition-only', form: 'volunteer', now: FX_NOW_, sample: true,
    answers: fxVol_(['Collect Petition Signatures']),
    expect: { variant: 'V', lang: 'both', told: 1 },
    note: 'Only the petition box: the petition thank-you block, the only time it shows.' },
  { id: 'doors-social', form: 'volunteer', now: FX_NOW_,
    answers: fxVol_(['Knock on Doors', 'Bilingual Outreach (I speak Spanish / Yo hablo español)', 'Post on Social Media', 'Collect Petition Signatures']),
    expect: { variant: 'V', lang: 'both', told: 3 },
    note: 'Doors, Spanish, social media (the auto-ticked petition box is ignored). Canvasses only in the list.' },
  { id: 'none', form: 'volunteer', now: FX_NOW_, sample: true,
    answers: fxVol_([]),
    expect: { variant: 'V', lang: 'both', told: 0 },
    note: 'No boxes ticked (or a /genz sign-up): no "what you told us" section.' },
  { id: 'students', form: 'volunteer', now: FX_NOW_,
    answers: fxVol_(['High School Ambassador', 'College Campus Captain / Volunteer']),
    expect: { variant: 'V', lang: 'both', told: 1 },
    note: 'Students block with the Lobby Day sentences (until Dec 2) and the under-18 line.' },
  { id: 'students-after', form: 'volunteer', now: FX_AFTER_LOBBY_,
    answers: fxVol_(['High School Ambassador']),
    expect: { variant: 'V', lang: 'both', told: 1 },
    note: 'After Dec 2 the Lobby Day sentences drop out on their own.' },
  { id: 'feeddown', form: 'volunteer', now: FX_NOW_, feedDown: true,
    answers: fxVol_(['Knock on Doors']),
    expect: { variant: 'V', lang: 'both', told: 1 },
    note: 'Feed could not be read: the no-shifts line, no "Next one" date.' },
  { id: 'skip-testname', form: 'volunteer', now: FX_NOW_,
    answers: fxVol_(['Knock on Doors'], { first: 'Test', last: 'Row' }),
    expect: { skip: 'test_name' }, note: 'First name starts with TEST.' },

  // ---------------------------------------------------------------- Knock Doors With Us modal
  { id: 'all', form: 'petition', now: FX_NOW_, sample: true,
    answers: { name: 'Teresa Ejemplo', email: 'teresa.ejemplo@example.net', phone: '312-555-0122', city: 'Chicago', zip: '60608',
      intent: ["Sign Byron's petition", 'Volunteer to help collect signatures'],
      activities: ['Knocking on doors', 'Getting signatures at community events', 'Phone banking', 'Posting on social media'] },
    expect: { variant: 'K-SHIFT', lang: 'both', told: 2 },
    note: 'Asked for a shift, every activity ticked: two blocks, then "You also told us". Ships switched off (FORM_PETITION_ENABLED=false).' },
  { id: 'posted', form: 'petition', now: FX_NOW_, sample: true,
    answers: { name: 'Teresa Ejemplo', email: 'teresa.ejemplo@example.net', phone: '312-555-0122', city: 'Chicago', zip: '60608',
      intent: ["Sign Byron's petition"], activities: [] },
    expect: { variant: 'K-POSTED', lang: 'both', told: 0 },
    note: 'Only "Count me in. Keep me posted." (stored as the old petition value).' },
  { id: 'events', form: 'petition', now: FX_NOW_,
    answers: { name: 'Teresa Ejemplo', email: 'teresa.ejemplo@example.net', phone: '312-555-0122', city: 'Chicago', zip: '60608',
      intent: [], activities: ['Getting signatures at community events'] },
    expect: { variant: 'K-SHIFT', lang: 'both', told: 1 },
    note: 'Only "Community events and Ward Night": that block carries the Ward Night date, so the standing Ward Night line is left out.' },

  // ---------------------------------------------------------------- canvass team
  { id: 'es', form: 'canvass', now: FX_NOW_, sample: true,
    answers: fxCanvass_({ sat: ['12:00 - 2:00 PM', '2:00 - 4:00 PM'], sun: VALUES.canvassSlots.slice() }, 'Yes! I would', 'Spanish'),
    expect: { variant: 'C-MATCH', lang: 'es' },
    note: 'Language answer "Spanish": Spanish only. Saturday and Sunday afternoons match the December canvasses.' },
  { id: 'en-other', form: 'canvass', now: FX_NOW_, sample: true, shot600: true,
    answers: fxCanvass_({ tue: ['after 8 PM'], wed: ['mornings <b>before</b> work & "weekends"'], sat: ['10:00 - 12:00 PM', '12:00 - 2:00 PM'] }, 'Not sure, tell me more', 'English'),
    expect: { variant: 'C-MATCH', lang: 'en' },
    note: 'Language answer "English". Google "Other" text on Tuesday and Wednesday is quoted back as typed (escaped).' },
  { id: 'both-nomatch', form: 'canvass', now: FX_NOW_, sample: true,
    answers: fxCanvass_({ mon: ['8:00 - 10:00 AM'], wed: ['8:00 - 10:00 AM', '10:00 - 12:00 PM', '6:00 - 8:00 PM'] }, 'No, I would not', 'Both'),
    expect: { variant: 'C-NOMATCH', lang: 'both' },
    note: 'Language answer "Both": bilingual. Weekday mornings: no dated canvass fits.' },
  { id: 'notimes', form: 'canvass', now: FX_NOW_,
    answers: fxCanvass_({}, '', ''),
    expect: { variant: 'C-NOTIMES', lang: 'both' },
    note: 'No times picked, language blank (bilingual).' },
  { id: 'skip-noemail', form: 'canvass', now: FX_NOW_,
    answers: fxCanvass_({ sat: ['12:00 - 2:00 PM'] }, 'Yes! I would', 'Both', { email: '' }),
    expect: { skip: 'no_email' }, note: 'Email is optional on this form: no email, no message.' }
];
