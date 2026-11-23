/**
 * Config.gs: everything that is a setting rather than copy or logic.
 *
 * Form ids are NOT here. setup() (Triggers.gs) copies them from Local.gs into Script
 * Properties (FORM_ID_RSVP, FORM_ID_LOBBYDAY, FORM_ID_VOLUNTEER, FORM_ID_PETITION,
 * FORM_ID_CANVASS). Everything in this file is plain data, so the Node harness in
 * ../test can load it too.
 */

var APP = {
  FROM_NAME: 'Byron Sigcho-Lopez for 25th Ward',
  SITE: 'https://sigchofor25.com',
  FEED_URL: 'https://sigchofor25.com/events/feed.json',
  FEED_CACHE_SECONDS: 600,          // CacheService keeps the feed about 10 minutes
  REPEAT_WINDOW_MS: 10 * 60 * 1000, // exact repeats inside this window send nothing
  QUOTA_RESERVE: 20,                // stop sending when MailApp's daily quota is below this
  ERROR_MAIL_EVERY_MS: 60 * 60 * 1000,
  LOG_SHEET_NAME: 'Form auto-responses log',
  TZ: 'America/Chicago',
  // Test rows (content-general.md, section 1): these domains never get mail.
  TEST_DOMAINS: ['example.com', 'example.org'],
  TEST_TLDS: ['.test'],
  NAME_MAX: 80,
  OTHER_TEXT_MAX: 120
};

/**
 * Owner switches. Each open question is one line here. Change a value, save, done.
 */
var OPTIONS = {
  // "Plans changed? Reply..." (event emails) and "Not you? Reply..." (general emails).
  // Off until someone confirms the reply-to inbox is read.
  inviteReplies: false,
  // The Illinois State Board of Elections notice in the footer (same as the site footer).
  stateBoardNotice: true,
  // Send confirmations for ward-office events (Ward Night, CEDA). false = skip and log.
  wardEventConfirmations: true,
  // At most one labelled Socialist Slate canvass, only in the last "more ways" slot.
  // false = never list slate canvasses.
  slateFiller: true,
  // Optional donate line in the canvass (1A) email. Needs a sigchofor25.com/donate
  // redirect on the site first (none exists today), so it stays off.
  donationLine: false
};

var FORM_KEYS = ['rsvp', 'lobbyday', 'volunteer', 'petition', 'canvass'];

var FORM_LABELS = {
  rsvp: 'Event sign-up',
  lobbyday: 'Springfield Lobby Day',
  volunteer: 'Volunteer sign-up (also /genz)',
  petition: 'Knock Doors With Us modal (old Petition Blitz Form)',
  canvass: 'Canvass team'
};

// Script Property names. Read on every run.
var PROP = {
  ENABLED: 'ENABLED',                 // anything but "true" = log only, send nothing
  TEST_RECIPIENT: 'TEST_RECIPIENT',   // when set, every email goes here, subject "[TEST] "
  LOG_SHEET_ID: 'LOG_SHEET_ID',
  REPLY_TO: 'REPLY_TO',               // replies go here; setup() sets it from Local.gs
  OWNER_EMAIL: 'OWNER_EMAIL',         // the campaign account; samples and notices go here
  LAST_ERROR_MAIL: 'LAST_ERROR_MAIL',
  PENDING_ERRORS: 'PENDING_ERRORS',
  formId: function (key) { return 'FORM_ID_' + key.toUpperCase(); },
  formEnabled: function (key) { return 'FORM_' + key.toUpperCase() + '_ENABLED'; }
};

// What setup() writes when a property is missing. It never overwrites a value you set.
var PROP_DEFAULTS = {
  ENABLED: 'false',
  FORM_RSVP_ENABLED: 'true',
  FORM_LOBBYDAY_ENABLED: 'true',
  FORM_VOLUNTEER_ENABLED: 'true',
  FORM_PETITION_ENABLED: 'false',   // sheet full of spam; owner has not decided
  FORM_CANVASS_ENABLED: 'true'
};

/**
 * The one place where each form's question titles are mapped to keys.
 * Matching ignores case and extra spaces. Any question whose title starts with
 * "Language" (on any form) is read as the language (en or es) with no change here.
 */
var FORM_TITLES = {
  rsvp: {
    'Name / Nombre': 'name',
    'Mobile phone / Teléfono celular': 'phone',
    'Email / Correo electrónico': 'email',
    'ZIP code / Código postal': 'zip',
    'Event / Evento': 'event',
    'Event date / Fecha del evento': 'date',
    'How many people are you bringing? / ¿Cuántas personas traes?': 'bringing'
  },
  lobbyday: {
    'Full name / Nombre completo': 'name',
    'Phone number / Número de teléfono': 'phone',
    'Email / Correo electrónico': 'email',
    'Home address or ZIP code (so we can match you with your state legislators) / Dirección o código postal (para conectarte con tus legisladores estatales)': 'address',
    'Bus seat / Asiento en el autobús': 'seat',
    'I am a... (check all that apply) / Soy... (marca todas las que correspondan)': 'iam',
    'Are you under 18? / ¿Eres menor de 18 años?': 'u18',
    'Can you chip in toward the bus? No one will be turned away. / ¿Puedes aportar para el autobús? Nadie se quedará fuera por falta de dinero.': 'chip',
    "Anything we should know? (Accessibility needs, dietary needs, interpretation, who you're bringing) / ¿Algo que debamos saber? (Accesibilidad, alimentación, interpretación, a quién traes)": 'notes'
  },
  volunteer: {
    'First Name': 'first',
    'Last Name': 'last',
    'Email': 'email',
    'Mobile Phone': 'phone',
    'City': 'city',
    'Zip Code': 'zip',
    'How would you like to help?': 'interests'
  },
  petition: {
    'Name': 'name',
    'Email Address': 'email',
    'Phone Number': 'phone',
    'City': 'city',
    'Zip Code': 'zip',
    'I want to:': 'intent',
    "I'm comfortable with": 'activities'
  },
  canvass: {
    'First Name?': 'first',
    'Last Name?': 'last',
    'Number?': 'phone',
    'Email?': 'email',
    'Address?': 'address',
    'Select all the times you are available on Mondays?': 'mon',
    'Select all the times you are available on Tuesdays?': 'tue',
    'Select all the times you are available on Wednesdays?': 'wed',
    'Select all the times you are available on Thursdays?': 'thu',
    'Select all the times you are available on Fridays?': 'fri',
    'Select all the times you are available on Saturdays?': 'sat',
    'Select all the times you are available on Sundays?': 'sun',
    'Would you be willing to host a neighbor connection?': 'host',
    'Do you speak Spanish? English? Both?': 'langs'
  }
};

// Which answer keys are names (junk filter) and which is the first name (greeting).
var FORM_PEOPLE = {
  rsvp: { names: ['name'], first: 'name' },
  lobbyday: { names: ['name'], first: 'name' },
  volunteer: { names: ['first', 'last'], first: 'first' },
  petition: { names: ['name'], first: 'name' },
  canvass: { names: ['first', 'last'], first: 'first' }
};

// Frozen form values (copied from the site's form-options files; never retype them).
var VALUES = {
  canvassSlots: ['8:00 - 10:00 AM', '10:00 - 12:00 PM', '12:00 - 2:00 PM', '2:00 - 4:00 PM', '4:00 - 6:00 PM', '6:00 - 8:00 PM'],
  canvassSlotHours: [[8, 10], [10, 12], [12, 14], [14, 16], [16, 18], [18, 20]],
  canvassDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  lobbySeat: { bus: 'Yes, save me a seat on the bus', own: "I'll get to Springfield on my own", cant: "I can't go, but keep me updated" },
  lobbyU18Yes: 'Yes, a parent or guardian',
  lobbyChipYes: 'Yes, I can donate',
  lobbyChipNo: 'Not right now',
  petitionShift: 'Volunteer to help collect signatures',
  petitionPosted: "Sign Byron's petition"
};

// Springfield Lobby Day facts used when the feed is down (the site's own strings).
var LOBBY = {
  id: 'meetup-2026-12-02-springfield-lobby-day',
  date: '2026-12-02',
  start: '2026-12-02T06:00:00-06:00',
  address: '2102 W Cermak Rd, Chicago',
  ics: { en: 'https://sigchofor25.com/events/meetup-2026-12-02-springfield-lobby-day.ics', es: 'https://sigchofor25.com/events/meetup-2026-12-02-springfield-lobby-day-es.ics' },
  gcal: {
    en: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Springfield%20Lobby%20Day&dates=20261202T120000Z%2F20261202T140000Z&location=25th%20Ward%20IPO%20office%2C%202102%20W%20Cermak%20Rd%2C%20Chicago&ctz=America%2FChicago',
    es: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=D%C3%ADa%20de%20Cabildeo%20en%20Springfield&dates=20261202T120000Z%2F20261202T140000Z&location=Oficina%20del%2025th%20Ward%20IPO%2C%202102%20W%20Cermak%20Rd%2C%20Chicago&ctz=America%2FChicago'
  },
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=2102%20W%20Cermak%20Rd%2C%20Chicago'
};
