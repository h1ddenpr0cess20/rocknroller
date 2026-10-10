import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, branch, centre, flat, wallTile, wash } from './helpers.js';

/**
 * Act 6: The Studio. A recording studio at the hour when everyone has
 * stopped being polite: acoustic foam on the walls, a red light that says
 * ON AIR, racks of gear blinking, and cables across the floor of the live
 * room that are, in the engineer's words, "probably fine". They are not
 * fine: the chicane of live cable is the way across. Everyone here is
 * either in A&R or has notes. A lift takes you up to the control room.
 */

export const STUDIO = {
  tiles: ['#6a6a78', '#5a5a68', '#7a6a58', '#4e4e5c'],
  walls: ['#5a5a6a', '#4a4a5a', '#6a5a52', '#42424e'],
  ambient: [0.9, 0.92, 1.05], lamp: '#ffd8a0', trap: '#26262e', lift: '#3a3a48', exit: '#ff3a4a', zapHue: 3.4, vary: 0.06,
};

const LIGHTS = ['#ff3a4a', '#ffb02a', '#2de2ff'];

export function studio() {
  const g = new Venue({
    name: 'The Studio', act: 6, cols: 150, rows: 150, palette: STUDIO, tempo: 100,
    intro: 'Take one. Take two. Take forty-one. Rock is a perfectionist.',
    look: {
      theme: 'studio', floor: 'carpet', wall: 'foam', lamp: 'bulb', exitSign: 'GIG', ampName: 'STUDIO',
      hemi: ['#d0d8f0', '#3a3446', 1.05], key: '#fff4e4', keyK: 1.1, lantern: '#ffe8c8',
      skyColors: ['#06060e', '#0c0c1c', '#14142c', '#1e1c3c', '#2c2448'],
      reflect: LIGHTS, ceiling: '#26283a',
      rig: { colors: [LIGHTS[2], LIGHTS[0]], program: 'pulse', every: 4 },
    },
  });
  const sign = (p, along, text, color, height = 1.5, size = 0.7) => g.light('neon', ...wallTile(p, along), { text, color, height, size });

  // Reception: gold records on the wall, and a receptionist who is in no way impressed.
  g.room(2, 4, 5, 5, 50, { lamps: 3, wall: 'posters', floor: 'carpet' });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 50, heading: '+x' });
  const lobby = d.hall(12, { wall: 'posters', floor: 'carpet' });
  g.foe('hipster', ...lobby.tile(7, 0), { range: 5 });
  g.pick(...lobby.tile(3, 0), 5).pick(...lobby.tile(4, 1), 5).pick(...lobby.tile(5, -1), 5).pick(...lobby.tile(10, 0), 10);
  sign(lobby, 4, 'STUDIO A', LIGHTS[1], 1.6, 0.8);
  sign(lobby, 9, 'ON AIR', LIGHTS[0], 1.5, 0.7);
  d.turn('+z', { wall: 'posters', floor: 'carpet' });
  g.tape(...d.hall(3, { wall: 'posters', floor: 'carpet' }).tile(1, 0));
  d.stairs(4, 2);

  // The live room: kit and amps along the back, racks of gear, and a chicane of live cable across the floor.
  const live = d.room(21, 15);
  const side = live.back > 0 ? Math.PI / 2 : -Math.PI / 2;
  const deck = live.back * 6 - (live.back > 0 ? 1 : 0);
  g.block(...live.rect(15, 4, deck, 2), 0.35, { prop: 'drums', rot: side });
  for (const k of [2, 4, 7, 10]) g.pillar(...backTile(live, k), 1.0, { prop: 'amp', rot: side });
  for (const k of [12, 13]) g.pillar(...backTile(live, k), 1.1, { prop: 'rack', rot: side });
  // Cable: whole-width runs with a gap to get through, each on the other side from the last.
  const run = (along, gapAcross) => {
    const lo = live.lo;
    const hi = lo + live.width;
    const left = gapAcross - 2, right = gapAcross + 2;
    if (left > lo) g.zap(...live.rect(along, 2, lo, left - lo), live.h);
    if (hi > right) g.zap(...live.rect(along, 2, right, hi - right), live.h);
  };
  run(6, 5);
  run(10, -5);
  g.foe('critic', ...live.tile(3, -2), { range: 6 }).foe('suit', ...live.tile(8, 0), { range: 6 });
  g.foe('hipster', ...live.tile(13, -3), { range: 6 }).foe('critic', ...live.tile(17, 3), { range: 6 });
  g.pick(...live.tile(2, 3), 10).pick(...live.tile(6, 5), 10).pick(...live.tile(10, -5), 10).pick(...live.tile(14, 2), 10);
  g.road(...live.tile(18, 5), 50);
  wash(g, live, [LIGHTS[2], LIGHTS[1]], { cans: 4, program: 'chase', every: 4 });
  sign(live, 3, 'REC', LIGHTS[0], 1.5, 0.9);
  sign(live, 14, 'LIVE', LIGHTS[1], 1.5, 0.7);
  // Off the front, behind a sheet of foam, the first record: the vocal booth.
  const vox = branch(d, live, 8);
  const voxHall = vox.hall(9, { wall: 'foam' });
  flat(g, voxHall, 8, { breakAt: 6.5, look: 'foam' });
  const booth = vox.room(5, 5, { wall: 'foam' });
  g.record(...booth.tile(3, 0));
  g.pick(...booth.tile(1, -1), 10).pick(...booth.tile(1, 1), 10);
  d.hall(4);
  d.turn('+x');

  // The patch corridor: monitor wedges the size of a fridge that come down on the beat.
  const patch = d.hall(15);
  g.speaker(...across(patch, 5, { beats: 4 }));
  g.speaker(...across(patch, 10, { beats: 4, offset: 0.5 }));
  g.pick(...patch.tile(3, 0), 5).pick(...patch.tile(7, 1), 5).pick(...patch.tile(7, -1), 5).pick(...patch.tile(13, 0), 10);
  g.light('par', ...wallTile(patch, 4), { colors: [LIGHTS[0]], program: 'static', aim: [0, 0], glow: 0.8, reach: 7, height: 1.4 });
  g.foe('suit', ...patch.tile(13, 0), { range: 3 });
  d.hall(3);

  // Up (or down) to the control room, on a lift with a view.
  d.hall(2);
  d.shaft(2.5, { size: 3, period: 8 });
  d.hall(3);

  // The control room: the desk across the back, racks, and the people who say "love it, but".
  const control = d.room(17, 13, { wall: 'plywood' });
  g.block(...control.rect(5, 7, control.back * 5 - (control.back > 0 ? 1 : 0), 2), 0.82, { prop: 'console', rot: control.back > 0 ? Math.PI / 2 : -Math.PI / 2 });
  for (const k of [1, 3, 14, 15]) g.pillar(...backTile(control, k), 1.1, { prop: 'rack', rot: control.back > 0 ? Math.PI / 2 : -Math.PI / 2 });
  g.foe('suit', ...control.tile(4, -2), { range: 6 }).foe('critic', ...control.tile(9, 2), { range: 6 }).foe('influencer', ...control.tile(13, -3), { range: 6 });
  g.pick(...control.tile(2, 3), 10).pick(...control.tile(7, -3), 10).pick(...control.tile(11, 4), 10).pick(...control.tile(15, 0), 10);
  g.lighter(...control.tile(15, 5));
  wash(g, control, [LIGHTS[2], LIGHTS[0]], { cans: 3, program: 'pulse', every: 2 });
  sign(control, 8, 'ON AIR', LIGHTS[0], 1.6, 0.9);
  // The pass is in the tape vault, with an A&R man on it.
  const vault = branch(d, control, 7, 'front', 7);
  vault.hall(3);
  const tapes = vault.room(7, 7);
  g.pass(...tapes.tile(4, 0));
  g.foe('security', ...tapes.tile(3, 1), { range: 5 });
  g.pick(...tapes.tile(5, -2), 10);
  // A record on a plank over the snake pit of live cable.
  const plankSide = branch(d, control, 12, 'back', 7);
  plankSide.hall(2);
  const plank = plankSide.bridge(7);
  g.zap(...plank.rect(0, 7, plank.lo - 2, 5), plankSide.h - 1.6, { fill: true });
  g.foe('hipster', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const nook = plankSide.room(5, 5);
  g.record(...nook.tile(2, 0));
  d.hall(4);
  const door = d.hall(6);
  barred(g, door, 3);
  d.turn('+z');
  d.stairs(3, 1.5);

  // Mastering: a last room, a sheet of steel across a side room with the last record, and the door.
  const mastering = d.room(15, 13);
  for (const k of [2, 6, 10]) g.pillar(...backTile(mastering, k), 1.1, { prop: 'rack', rot: mastering.back > 0 ? Math.PI / 2 : -Math.PI / 2 });
  g.foe('suit', ...mastering.tile(5, -3), { range: 6 }).foe('critic', ...mastering.tile(8, 3), { range: 6 }).foe('security', ...mastering.tile(11, 0), { range: 6 });
  g.pick(...mastering.tile(2, 3), 10).pick(...mastering.tile(6, 0), 10).pick(...mastering.tile(10, -4), 10);
  g.tape(...mastering.tile(3, -4));
  wash(g, mastering, [LIGHTS[1], LIGHTS[2]], { cans: 3, program: 'chase', every: 4 });
  g.light('ball', ...centre(mastering), { colors: [LIGHTS[1], LIGHTS[2]], radius: 5, height: 2.6 });
  const vaultSide = branch(d, mastering, 6);
  const vaultHall = vaultSide.hall(9);
  flat(g, vaultHall, 8, { breakAt: 6.5, look: 'steel' });
  const safe = vaultSide.room(5, 5);
  g.record(...safe.tile(3, 0));
  g.road(...safe.tile(1, 1), 70);
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  return g;
}
