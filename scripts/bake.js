/**
 * Bakes models the way the game does and says what came out: how many
 * vertices and triangles, per material, and how long it took.
 *
 *   node scripts/bake.js            every model and prop, close-up and board detail
 *   node scripts/bake.js rat 1      one model at one detail
 */
import { CHARACTERS } from 'madness-engine/characters';
import { bake } from 'madness-engine/models/model';
import { PROPS as ALL_PROPS } from 'madness-engine/props';
import { CAST } from '../src/models/cast/index.js';
import { PROPS } from '../src/models/props/index.js';

const [name, detail] = process.argv.slice(2);
const names = name ? [name] : [...Object.keys(CAST), ...Object.keys(PROPS)];
const details = detail ? [Number(detail)] : [1, 0.5];
for (const n of names) {
  // A model not in the cast is taken from the engine's library.
  const def = CAST[n] ?? PROPS[n] ?? CHARACTERS[n] ?? ALL_PROPS[n];
  for (const d of details) {
    const t0 = performance.now();
    const m = bake(def, { detail: d });
    const mats = Object.keys(def.materials);
    const groups = m.groups.map((g) => `${mats[g.materialIndex]} ${g.count / 3}`).join(', ');
    console.log(`${n} @${d}: ${m.count} vertices, ${m.index.length / 3} triangles (${groups}) in ${Math.round(performance.now() - t0)} ms`);
  }
}
