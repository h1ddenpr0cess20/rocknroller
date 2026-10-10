/**
 * A venue as text, for laying one out: `node scripts/map.js 3` (venues count
 * from 1), and `--heights` for the floor heights instead of what is where.
 *
 *   .  floor     #  wall      ~  electrified floor      E  the stage door     S  start
 *   ^  pyro      X  speaker stack      |  gate      /  breakable panel      L  lift
 *   k  pass      $  picks or a road case      +  gaff tape      !  lighter      R  gold record
 *   m  someone walking     o  someone crawling or flying      s  sticky     >  belt     O  bumper
 */

import { FOES } from '../src/foes.js';
import { VENUES, loadVenue } from '../src/venues/index.js';

const args = process.argv.slice(2);
const heights = args.includes('--heights');
const n = Number(args.find((a) => /^\d+$/.test(a)) ?? 1);
if (!(n >= 1 && n <= VENUES.length)) {
  console.error(`venues are 1 to ${VENUES.length}`);
  process.exit(1);
}
const venue = loadVenue(n - 1);
const grid = Array.from({ length: venue.rows }, () => Array(venue.cols).fill(' '));
for (let z = 0; z < venue.rows; z++) {
  for (let x = 0; x < venue.cols; x++) {
    const c = venue.cell(x, z);
    if (!c) continue;
    if (heights) {
      grid[z][x] = c.kind === 'wall' ? '#' : String(Math.round(Math.max(...c.h)) % 10);
      continue;
    }
    grid[z][x] = { wall: '#', zap: '~', exit: 'E' }[c.kind]
      ?? (c.trap ? '^' : c.crush ? 'X' : c.door ? (venue.doors.find((d) => x >= d.x && z >= d.z && x < d.x + d.w && z < d.z + d.d)?.kind === 'panel' ? '/' : '|')
        : c.fx === 'sticky' ? 's' : c.fx === 'belt' ? '>' : '.');
  }
}
if (!heights) {
  for (const l of venue.lifts) grid[l.z][l.x] = 'L';
  for (const b of venue.bumpers) grid[Math.floor(b.z)][Math.floor(b.x)] = 'O';
  const mark = { pass: 'k', tape: '+', lighter: '!', record: 'R' };
  for (const p of venue.pickups) grid[Math.floor(p.z)][Math.floor(p.x)] = mark[p.kind] ?? '$';
  for (const m of venue.foes) grid[Math.floor(m.z)][Math.floor(m.x)] = FOES[m.kind].move === 'walk' ? 'm' : 'o';
}
grid[venue.start.z][venue.start.x] = 'S';
console.log(`${venue.name} — ${venue.cols}×${venue.rows}, ${venue.foes.length} people in the way`);
const ruler = Array.from({ length: venue.cols }, (_, x) => (x % 10 === 0 ? String((x / 10) % 10) : ' ')).join('');
console.log(`     ${ruler}`);
grid.forEach((row, z) => console.log(`${String(z).padStart(4)} ${row.join('').replace(/\s+$/, '')}`));
