/**
 * Local.gs (copy of this file, named "Local" in the Apps Script project).
 * The ids are the long ids in each form's EDIT link:
 *   https://docs.google.com/forms/d/<THIS PART>/edit
 * (not the /forms/d/e/... link people fill in). Run setup() after editing.
 */
var LOCAL_FORM_IDS = {
  rsvp: 'PASTE_EVENT_SIGNUP_FORM_ID',
  lobbyday: 'PASTE_LOBBY_DAY_FORM_ID',
  volunteer: 'PASTE_VOLUNTEER_FORM_ID',
  petition: 'PASTE_KNOCK_DOORS_FORM_ID',
  canvass: 'PASTE_CANVASS_TEAM_FORM_ID'
};

// The campaign account that owns this project: replies and notices go here.
var LOCAL_CAMPAIGN_ADDRESS = 'PASTE_CAMPAIGN_ADDRESS';
