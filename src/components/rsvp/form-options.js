// Field names of the event sign-up Google Form (the intake of record for the "I'm coming" form
// on every EventCard without an outside RSVP page), copied by script from the form's public
// FB_PUBLIC_LOAD_DATA_ (Nov 22, 2026). They are what Google receives, so they must match the form character
// for character. Do not retype them by hand: the visible labels are events.rsvp_* in src/i18n.
// The same URL and entry names are in the forms gateway Worker (cloudflare/forms-gateway,
// FORMS.rsvp); change both together. Seven short-answer questions in form order: name (the
// only one Google requires), phone, email, zip, event, date, bringing. See design.md, Forms &
// Embeds, Event sign-ups.
export const FORM = {
  viewform: 'https://docs.google.com/forms/d/e/1FAIpQLSf4yKsLO6OZM1fDQJ8JwKkGxTX9NTuKbtIErtIAAhd-LFQF5w/viewform',
  formResponse: 'https://docs.google.com/forms/d/e/1FAIpQLSf4yKsLO6OZM1fDQJ8JwKkGxTX9NTuKbtIErtIAAhd-LFQF5w/formResponse',
};
export const FIELDS = {
  name: 'entry.783290040',
  phone: 'entry.1595512013',
  email: 'entry.1391027563',
  zip: 'entry.1004175083',
  event: 'entry.26680022',
  date: 'entry.959474185',
  bringing: 'entry.1855129845',
};
