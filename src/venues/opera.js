import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, barred, branch, centre, flat, wallTile, wash } from './helpers.js';

/**
 * Act 7: The Opera House. Red velvet, gold leaf, damask on the walls and
 * a chandelier over every aisle that comes down on the beat: someone
 * has loosened the chain, and Rock has the blame. Ushers, critics and
 * donors are everywhere, all of them shushing. A lift takes you across
 * the orchestra pit, and at the end of it, in front of the grand piano,
 * with a baton, is the Maestro.
 */

export const OPERA = {
  tiles: ['#9a3040', '#842838', '#b08a4a', '#7a2a3a'],
  walls: ['#8a3040', '#722838', '#a67a44', '#642234'],
  ambient: [1.05, 0.9, 0.9], lamp: '#ffd890', trap: '#2a1a1e', lift: '#5a3a30', exit: '#ffc84a', zapHue: 1.2, vary: 0.05,
};

const GOLD = '#ffc84a';
const WARM = ['#ffd890', '#ff8a5a', '#ffc84a'];

export function opera() {
  const g = new Venue({
    name: 'The Opera House', act: 7, cols: 160, rows: 150, palette: OPERA, tempo: 88,
    intro: 'Please silence your rock.',
    look: {
      theme: 'theatre', floor: 'carpet', wall: 'damask', lamp: 'par', exitSign: 'GIG', ampName: 'OPERA', crusher: 'chandelier',
      hemi: ['#ffe0c8', '#5a2a30', 1.15], key: '#fff0e0', keyK: 1.1, lantern: '#ffe0b0',
      skyColors: ['#0c0408', '#18080e', '#2a0c14', '#40121c', '#5a1a24'],
      reflect: WARM, ceiling: '#3a1620',
      rig: { colors: WARM, program: 'chase', every: 4 },
    },
  });
  const sign = (p, along, text, color = GOLD, height = 1.6, size = 0.7) => g.light('neon', ...wallTile(p, along), { text, color, height, size });

  // The foyer: marble, brass, and a man whose whole job is the door.
  g.room(2, 4, 5, 5, 50, { lamps: 3, floor: 'checker' });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 50, heading: '+x' });
  const foyer = d.hall(13, { floor: 'checker' });
  g.foe('usher', ...foyer.tile(7, 0), { range: 5, path: [foyer.tile(4, 0), foyer.tile(10, 0)] });
  g.pick(...foyer.tile(3, 0), 5).pick(...foyer.tile(4, 1), 5).pick(...foyer.tile(5, -1), 5).pick(...foyer.tile(11, 0), 10);
  g.light('par', ...wallTile(foyer, 5), { colors: [WARM[0]], program: 'static', aim: [0, 0], glow: 0.9, reach: 8, height: 1.5 });
  sign(foyer, 8, 'OPERA', GOLD, 1.6, 0.8);
  d.turn('+z', { floor: 'checker' });
  g.tape(...d.hall(3, { floor: 'checker' }).tile(1, 0));
  d.stairs(4, 2);

  // The stalls: rows of velvet seats with an aisle down the middle, ushers in the aisles, the stage at the far end.
  const stalls = d.room(21, 15);
  const side = stalls.back > 0 ? Math.PI / 2 : -Math.PI / 2;
  for (const along of [4, 7, 10, 13]) {
    for (const across_ of [-6, -5, -4, 4, 5, 6]) g.pillar(...stalls.tile(along, across_), 0.8, { prop: 'seat', rot: stalls.back > 0 ? Math.PI : 0 });
  }
  g.block(...stalls.rect(17, 3, stalls.back * 6 - (stalls.back > 0 ? 2 : 0), 3), 0.88, { prop: 'piano', rot: side });
  g.foe('usher', ...stalls.tile(3, 0), { range: 6 }).foe('critic', ...stalls.tile(8, -2), { range: 6 });
  g.foe('usher', ...stalls.tile(12, 2), { range: 6 }).foe('critic', ...stalls.tile(17, -1), { range: 6 });
  g.pick(...stalls.tile(2, 0), 10).pick(...stalls.tile(6, 1), 10).pick(...stalls.tile(11, -1), 10).pick(...stalls.tile(15, 0), 10);
  g.road(...stalls.tile(19, -5), 50);
  g.light('spot', ...wallTile(stalls, 6), { colors: ['#fff0c8'], aim: [0, 0], height: 2.6, reach: 9 });
  g.light('spot', ...wallTile(stalls, 15), { colors: ['#ffd890'], aim: [0, 0], height: 2.6, reach: 9 });
  wash(g, stalls, [WARM[0], WARM[1]], { cans: 3, program: 'chase', every: 4 });
  sign(stalls, 10, 'STALLS', GOLD, 1.6, 0.7);
  // Off the front, behind a sheet of velvet curtain: the first record, in the box office.
  const box = branch(d, stalls, 8);
  const boxHall = box.hall(9);
  flat(g, boxHall, 8, { breakAt: 6.5, look: 'curtain' });
  const office = box.room(5, 5);
  g.record(...office.tile(3, 0));
  g.pick(...office.tile(1, -1), 10).pick(...office.tile(1, 1), 10);
  d.hall(4);
  d.turn('+x');

  // The grand stair: chandeliers over it, on the beat.
  const stair = d.hall(17, { floor: 'checker' });
  g.speaker(...across(stair, 5, { beats: 4 }));
  g.speaker(...across(stair, 10, { beats: 4, offset: 0.5 }));
  g.speaker(...across(stair, 14, { beats: 4 }));
  g.pick(...stair.tile(3, 0), 5).pick(...stair.tile(7, 1), 5).pick(...stair.tile(7, -1), 5).pick(...stair.tile(12, 0), 10);
  g.light('par', ...wallTile(stair, 4), { colors: [WARM[0]], program: 'static', aim: [0, 0], glow: 0.9, reach: 8, height: 1.5 });
  g.foe('critic', ...stair.tile(12, 0), { range: 3 });
  d.hall(3);

  // The orchestra pit: a lift takes you over it. Don't look down.
  d.hall(3);
  d.ferry(11, { size: 3, period: 8 });
  d.hall(3);

  // The circle: more seats, more people with opinions.
  const circle = d.room(15, 13);
  for (const along of [4, 7, 10]) for (const across_ of [-5, -4, 4, 5]) g.pillar(...circle.tile(along, across_), 0.8, { prop: 'seat', rot: circle.back > 0 ? Math.PI : 0 });
  g.foe('usher', ...circle.tile(5, 0), { range: 6 }).foe('critic', ...circle.tile(9, 2), { range: 6 }).foe('suit', ...circle.tile(12, -3), { range: 6 });
  g.pick(...circle.tile(2, 0), 10).pick(...circle.tile(7, -1), 10).pick(...circle.tile(11, 1), 10);
  g.lighter(...circle.tile(13, -5));
  g.light('ball', ...centre(circle), { colors: WARM, radius: 6, height: 2.8 });
  wash(g, circle, [WARM[1], WARM[2]], { cans: 3, program: 'chase', every: 4 });
  sign(circle, 7, 'CIRCLE', GOLD, 1.6, 0.7);
  // The pass is in the dressing room, with a bouncer on the door of it who is also, somehow, a tenor.
  const dressing = branch(d, circle, 7, 'front', 7);
  dressing.hall(3);
  const room = dressing.room(7, 7);
  g.pass(...room.tile(4, 0));
  g.foe('security', ...room.tile(3, 1), { range: 5 });
  g.pick(...room.tile(5, -2), 10);
  // And over the fly gallery, on a plank, the second record.
  const plankSide = branch(d, circle, 12, 'back', 7);
  plankSide.hall(2);
  const plank = plankSide.bridge(7);
  g.foe('usher', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const loft = plankSide.room(5, 5);
  g.record(...loft.tile(2, 0));
  d.hall(4);
  const door = d.hall(6);
  barred(g, door, 3);
  d.turn('+z');
  d.stairs(3, 1.5);

  // The stage: the Maestro at the piano.
  const stage = d.room(19, 15);
  g.block(...stage.rect(16, 3, stage.back * 6 - (stage.back > 0 ? 2 : 0), 3), 0.88, { prop: 'piano', rot: stage.back > 0 ? Math.PI / 2 : -Math.PI / 2 });
  g.foe('maestro', ...stage.tile(12, 0), { range: 3 });
  g.pick(...stage.tile(2, 3), 10).pick(...stage.tile(5, 0), 10).pick(...stage.tile(8, -4), 10);
  g.tape(...stage.tile(3, -5)).tape(...stage.tile(3, 5));
  g.light('spot', ...centre(stage), { colors: ['#fff0c8'], height: 3.2, reach: 10 });
  wash(g, stage, [WARM[0], WARM[1], WARM[2]], { cans: 4, program: 'chase', every: 2 });
  sign(stage, 8, 'FINALE', GOLD, 1.6, 0.8);
  const wings = branch(d, stage, 6);
  const wingsHall = wings.hall(9);
  flat(g, wingsHall, 8, { breakAt: 6.5, look: 'curtain' });
  const prop = wings.room(5, 5);
  g.record(...prop.tile(3, 0));
  g.road(...prop.tile(1, 1), 70);
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  return g;
}
