/**
 * What the game remembers between visits: how far down the tour you have
 * got, the stars, best hype, best time and gold records of each venue, and
 * the settings. The slot is the engine's (`saveSlot`), guarded, so the game
 * plays the same without storage.
 */

import { pickSettings, saveSlot, SETTINGS } from 'madness-engine/storage';

const KEY = 'rocknroller.v1';

const blankVenue = () => ({ stars: 0, best: 0, time: null, records: 0, smashed: 0 });

export function createStorage(store = globalThis.localStorage) {
  const slot = saveSlot(KEY, store);
  let saved = { venues: {}, reached: 0, settings: { ...SETTINGS }, last: null };
  const raw = slot.read();
  if (raw && typeof raw === 'object') {
    saved.reached = Number.isInteger(raw.reached) ? raw.reached : 0;
    for (const [k, v] of Object.entries(raw.venues ?? {})) {
      if (v && typeof v === 'object') saved.venues[k] = { ...blankVenue(), ...pickNumbers(v) };
    }
    saved.settings = { ...SETTINGS, ...pickSettings(raw.settings ?? {}) };
  }

  const save = () => {
    slot.write(saved);
    return snapshot();
  };
  const snapshot = () => ({ ...saved, venues: { ...saved.venues }, settings: { ...saved.settings } });

  return {
    load: snapshot,
    venue: (index) => ({ ...blankVenue(), ...saved.venues[index] }),
    /** Venue `index` has been reached (and so can be played from the tour map). */
    reached(index) {
      saved.reached = Math.max(saved.reached, index);
      return save();
    },
    /**
     * Venue `index` was cleared with `result`: { hype, time, records,
     * smashed, stars }. Keeps the best of each, and opens the next venue.
     */
    cleared(index, result) {
      const old = { ...blankVenue(), ...saved.venues[index] };
      saved.venues[index] = {
        stars: Math.max(old.stars, result.stars),
        best: Math.max(old.best, result.hype),
        time: old.time === null ? result.time : Math.min(old.time, result.time),
        records: Math.max(old.records, result.records),
        smashed: Math.max(old.smashed, result.smashed),
      };
      saved.reached = Math.max(saved.reached, index + 1);
      saved.last = { venue: index, hype: result.hype };
      return save();
    },
    setting(name, value) {
      if (!(name in SETTINGS)) return snapshot();
      saved.settings[name] = value;
      return save();
    },
    /** The stars won in all, of the most there are. */
    totalStars: () => Object.values(saved.venues).reduce((s, v) => s + v.stars, 0),
  };
}

function pickNumbers(v) {
  const out = {};
  for (const k of ['stars', 'best', 'records', 'smashed']) if (Number.isFinite(v[k])) out[k] = v[k];
  if (Number.isFinite(v.time)) out.time = v.time;
  return out;
}
