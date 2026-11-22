#!/usr/bin/env node
// Fills in "geo": {"lat", "lng"} for every src/data/events.json entry that has
// an address but no geo yet, so the /volunteer map can pin it. Uses the free
// US Census Bureau geocoder (no key; only the public event address is sent).
// Run from the repo root:  node ops/geocode-events.mjs
// Prints each lookup. An address the Census cannot match is left without geo
// (the event still shows everywhere, just not on the map); fix the address or
// add geo by hand from the map link, then run again.
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'src/data/events.json';
const events = JSON.parse(readFileSync(PATH, 'utf8'));

// "2810 N Milwaukee Ave, 2nd Floor, Chicago" -> "2810 N Milwaukee Ave, Chicago, IL"
function query(address) {
  const parts = address.split(',').map((s) => s.trim()).filter((s) => !/floor|suite|unit|^#|^ste\b|^apt\b/i.test(s));
  const q = parts.join(', ');
  return /\bIL\b/.test(q) ? q : `${q}, IL`;
}

async function geocode(address) {
  const url = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address='
    + encodeURIComponent(query(address));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census geocoder HTTP ${res.status}`);
  const match = (await res.json()).result?.addressMatches?.[0];
  if (!match) return null;
  const round = (n) => Math.round(n * 1e5) / 1e5;
  return { lat: round(match.coordinates.y), lng: round(match.coordinates.x), matched: match.matchedAddress };
}

let changed = 0;
const cache = new Map();
const out = [];
for (const e of events) {
  if (!e.address || e.geo) { out.push(e); continue; }
  if (!cache.has(e.address)) cache.set(e.address, await geocode(e.address));
  const hit = cache.get(e.address);
  if (!hit) {
    console.log(`NO MATCH  ${e.id}  ${e.address}`);
    out.push(e);
    continue;
  }
  console.log(`ok        ${e.id}  ${e.address}  ->  ${hit.matched}  (${hit.lat}, ${hit.lng})`);
  // Keep key order readable: geo goes right after address.
  const next = {};
  for (const [k, v] of Object.entries(e)) {
    next[k] = v;
    if (k === 'address') next.geo = { lat: hit.lat, lng: hit.lng };
  }
  out.push(next);
  changed += 1;
}

if (changed) writeFileSync(PATH, JSON.stringify(out, null, 2) + '\n');
console.log(`${changed} entr${changed === 1 ? 'y' : 'ies'} geocoded.`);
