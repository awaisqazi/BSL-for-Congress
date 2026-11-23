/**
 * Feed.gs: the site's event feed and the per-event calendar files.
 * The feed is cached about 10 minutes. Any failure returns null, and the emails fall back
 * to their no-card wording; a send never fails because of the feed.
 */

var FEED_CACHE_KEY_ = 'feed_v1';

function getFeed() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(FEED_CACHE_KEY_);
  if (hit) {
    try { return JSON.parse(hit); } catch (e) { /* fetch again */ }
  }
  try {
    var res = UrlFetchApp.fetch(APP.FEED_URL, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return null;
    var feed = JSON.parse(res.getContentText('UTF-8'));
    if (!feed || !feed.events) return null;
    var slim = slimFeed(feed, nowChicagoIso().slice(0, 10));
    var s = JSON.stringify(slim);
    if (s.length < 95000) cache.put(FEED_CACHE_KEY_, s, APP.FEED_CACHE_SECONDS);
    return slim;
  } catch (e) {
    return null;
  }
}

/** Current time in Chicago as 2026-11-23T10:00:00-06:00. */
function nowChicagoIso() {
  var s = Utilities.formatDate(new Date(), APP.TZ, "yyyy-MM-dd'T'HH:mm:ssZ");
  return s.replace(/([+-]\d\d)(\d\d)$/, '$1:$2');
}

/**
 * Fetch each .ics as an attachment (text/calendar; charset utf-8). Missing files are
 * skipped, and the email still goes out with its two calendar buttons.
 */
function fetchAttachments(list) {
  var blobs = [], failed = false;
  (list || []).forEach(function (a) {
    try {
      var res = UrlFetchApp.fetch(a.url, { muteHttpExceptions: true, followRedirects: true });
      var body = res.getContentText('UTF-8');
      if (res.getResponseCode() === 200 && body.indexOf('BEGIN:VCALENDAR') === 0) {
        blobs.push(Utilities.newBlob(body, 'text/calendar; charset=utf-8', a.filename));
      } else {
        failed = true;
      }
    } catch (e) {
      failed = true;
    }
  });
  return { blobs: blobs, failed: failed };
}
