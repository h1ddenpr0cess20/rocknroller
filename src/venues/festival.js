import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, branch, centre, flat, wallTile, wash } from './helpers.js';

/**
 * Act 8: The Festival. Day three, golden hour. Grass gone to mud, canvas
 * walls and festival hoarding, bunting and fairy lights, and a main stage
 * lit up at the far end of it all. The mud is sticky, the PA in the food
 * lane drops on the beat, a slide takes you down into the field, and the
 * way across the river is on the crowd's hands. Everyone here is hugging,
 * filming, or has been awake since Thursday.
 */

export const FESTIVAL = {
  tiles: ['#8ab858', '#78a44a', '#a08a58', '#6a9a48'],
  walls: ['#f0e0b8', '#e0d0a4', '#d4b888', '#e8d4a8'],
  ambient: [1.05, 1.0, 0.9], lamp: '#ffd890', trap: '#3a3226', lift: '#5a4a38', exit: '#ff3fa4', sticky: '#6a4a28', zapHue: 3.9, vary: 0.08,
};

const FEST = ['#ff2d95', '#ffc84a', '#2de2ff', '#7cff3a'];

export function festival() {
  const g = new Venue({
    name: 'The Festival', act: 8, cols: 170, rows: 150, palette: FESTIVAL, tempo: 112,
    intro: 'Day three. Nobody has showered. Rock is a rock, and is fine.',
    look: {
      theme: 'festival', floor: 'grass', wall: 'canvas', lamp: 'bulb', sticky: 'mud', exitSign: 'GIG', ampName: 'FEST',
      hemi: ['#ffe8c8', '#6a5a38', 1.25], key: '#ffd8a0', keyK: 1.25, lantern: '#ffe8c0',
      skyColors: ['#1a1440', '#43246e', '#a8406a', '#ff8a4a', '#ffd070'],
      reflect: FEST, ceiling: '#a8406a',
      rig: { colors: FEST.slice(0, 3), program: 'chase', every: 2 },
    },
  });
  const sign = (p, along, text, color, height = 1.5, size = 0.7) => g.light('neon', ...wallTile(p, along), { text, color, height, size });
  const facing = (p) => (p.back > 0 ? Math.PI / 2 : -Math.PI / 2);

  // The campsite: tents, a drum circle, and the sun going down behind the hoardings.
  g.room(2, 4, 5, 5, 50, { lamps: 3, floor: 'grass', wall: 'canvas' });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 50, heading: '+x' });
  const camp = d.hall(13, { floor: 'grass', wall: 'canvas' });
  g.pillar(...camp.tile(2, camp.back), 0.7, { prop: 'bale' });
  g.pillar(...camp.tile(9, -camp.back), 0.7, { prop: 'bale' });
  g.foe('hippie', ...camp.tile(7, 0), { range: 4 });
  g.pick(...camp.tile(3, 0), 5).pick(...camp.tile(4, 1), 5).pick(...camp.tile(5, -1), 5).pick(...camp.tile(11, 0), 10);
  sign(camp, 4, 'CAMP', FEST[1], 1.6, 0.8);
  sign(camp, 9, 'DAY 3', FEST[0], 1.5, 0.7);
  d.turn('+z', { floor: 'grass', wall: 'canvas' });
  g.tape(...d.hall(3, { floor: 'grass', wall: 'fence' }).tile(1, 0));
  d.stairs(4, 2, { wall: 'fence' });

  // The field: portable loos along the back, hay bales, a mud wallow in the middle, and a lot of people with phones up.
  const field = d.room(21, 15, { wall: 'fence' });
  g.floorOf(...field.rect(6, 9, field.lo + 3, 9), 'mud');
  g.sticky(...field.rect(6, 9, field.lo + 3, 9));
  for (const k of [2, 4, 6, 8, 10, 12]) g.pillar(...backTile(field, k), 1.3, { prop: 'loo', rot: facing(field) + Math.PI });
  for (const [a, b] of [[3, -4], [4, 4], [14, -4], [16, 4], [18, -3]]) g.pillar(...field.tile(a, b), 0.7, { prop: 'bale' });
  g.foe('phone', ...field.tile(4, 0), { range: 6 }).foe('drunk', ...field.tile(9, -3), { range: 6 });
  g.foe('hippie', ...field.tile(11, 3), { range: 5 }).foe('mosher', ...field.tile(15, -2), { range: 6 }).foe('freebird', ...field.tile(18, 3), { range: 5 });
  g.pick(...field.tile(2, 3), 10).pick(...field.tile(8, 0), 10).pick(...field.tile(12, -4), 10).pick(...field.tile(17, 0), 10);
  g.road(...field.tile(19, 5), 50);
  g.light('spot', ...centre(field), { colors: ['#ffe8c0'], height: 3.2, reach: 10 });
  wash(g, field, [FEST[0], FEST[1], FEST[2]], { cans: 3, program: 'chase', every: 2, glow: 0.6 });
  sign(field, 5, 'LOOS', FEST[2], 1.6, 0.7);
  // Off the front, behind a flap of canvas: the first record, in the merch tent.
  const merch = branch(d, field, 8);
  const merchHall = merch.hall(9, { wall: 'canvas' });
  flat(g, merchHall, 8, { breakAt: 6.5, look: 'canvas' });
  const tent = merch.room(5, 5, { wall: 'canvas' });
  g.record(...tent.tile(3, 0));
  g.pick(...tent.tile(1, -1), 10).pick(...tent.tile(1, 1), 10);
  d.hall(4);
  d.turn('+x');

  // The slide: a muddy bank down into the next field.
  d.hall(3, { wall: 'fence' });
  const slide = d.chute(10, 3, { width: 3 });
  g.pick(...slide.tile(2, 0), 5).pick(...slide.tile(4, 0), 5).pick(...slide.tile(6, 0), 5).pick(...slide.tile(8, 0), 10);
  d.hall(4, { wall: 'fence' });

  // The food lane: the PA comes down on the beat, and somebody has put a flamethrower in an art installation.
  const lane = d.hall(19, { wall: 'fence' });
  g.speaker(...across(lane, 4, { beats: 4 }));
  g.speaker(...across(lane, 9, { beats: 4, offset: 0.5 }));
  g.pyro(...across(lane, 14, { beats: 4 }));
  g.pick(...lane.tile(2, 0), 5).pick(...lane.tile(6, 1), 5).pick(...lane.tile(6, -1), 5).pick(...lane.tile(11, 0), 10).pick(...lane.tile(17, 0), 10);
  g.light('par', ...wallTile(lane, 6), { colors: [FEST[1]], program: 'static', aim: [0, 0], glow: 0.8, reach: 7, height: 1.4 });
  g.light('par', ...wallTile(lane, 15), { colors: [FEST[0]], program: 'static', aim: [0, 0], glow: 0.8, reach: 7, height: 1.4 });
  g.foe('merch', ...lane.tile(11, 0), { range: 3 });
  d.hall(3, { wall: 'fence' });

  // The river: the way across is on the crowd's hands.
  d.hall(3, { wall: 'fence' });
  const river = d.ferry(11, { size: 3, period: 8, style: 'crowd' });
  g.zap(...river.rect(0, 11, river.lo - 2, 7), d.h - 1.6, { fill: true });
  d.hall(3, { wall: 'fence' });

  // Backstage: the tour bus, a gate, and a tour manager with the pass; a record over the river on a plank.
  const back = d.room(15, 13, { wall: 'fence' });
  for (const k of [2, 6, 10]) g.pillar(...backTile(back, k), 1.0, { prop: 'case', rot: facing(back) });
  for (const [a, b] of [[4, -4], [9, 5], [12, -4]]) g.pillar(...back.tile(a, b), 0.7, { prop: 'bale' });
  g.foe('scalper', ...back.tile(5, 0), { range: 6 }).foe('phone', ...back.tile(9, 3), { range: 6 }).foe('freebird', ...back.tile(11, -3), { range: 6 });
  g.pick(...back.tile(2, 0), 10).pick(...back.tile(7, -3), 10).pick(...back.tile(10, 5), 10);
  g.lighter(...back.tile(13, -5));
  wash(g, back, [FEST[1], FEST[0]], { cans: 3, program: 'chase', every: 2 });
  g.light('ball', ...centre(back), { colors: FEST, radius: 6, height: 2.8 });
  sign(back, 7, 'BACKSTAGE', FEST[0], 1.6, 0.9);
  const bus = branch(d, back, 7, 'front', 7);
  bus.hall(3);
  const driver = bus.room(7, 7);
  g.pass(...driver.tile(4, 0));
  g.foe('bouncer', ...driver.tile(3, 1), { range: 5 });
  g.pick(...driver.tile(5, -2), 10);
  const plankSide = branch(d, back, 12, 'back', 7);
  plankSide.hall(2);
  const plank = plankSide.bridge(7);
  g.zap(...plank.rect(0, 7, plank.lo - 2, 5), plankSide.h - 1.6, { fill: true });
  g.foe('hippie', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const hut = plankSide.room(5, 5);
  g.record(...hut.tile(2, 0));
  d.hall(4);
  const door = d.hall(6, { wall: 'fence' });
  barred(g, door, 3);
  d.turn('+z', { wall: 'fence' });
  d.stairs(3, 1.5, { wall: 'fence' });

  // The last field, in front of the main stage: a mascot, and a canvas flap across a side tent with the last record.
  const finale = d.room(15, 13, { wall: 'fence' });
  for (const [a, b] of [[3, -5], [3, 5], [11, 5]]) g.pillar(...finale.tile(a, b), 0.7, { prop: 'bale' });
  g.foe('mascot', ...finale.tile(10, 0), { range: 6 });
  g.foe('freebird', ...finale.tile(4, -3), { range: 6 }).foe('mosher', ...finale.tile(6, 3), { range: 6 });
  g.pick(...finale.tile(2, 3), 10).pick(...finale.tile(5, 0), 10).pick(...finale.tile(9, -4), 10);
  g.tape(...finale.tile(3, -4));
  wash(g, finale, [FEST[2], FEST[0]], { cans: 3, program: 'chase', every: 2 });
  g.light('strobe', ...wallTile(finale, 7), { colors: ['#ffffff'], reach: 9, height: 1.3 });
  const green = branch(d, finale, 6);
  const greenHall = green.hall(9, { wall: 'canvas' });
  flat(g, greenHall, 8, { breakAt: 6.5, look: 'canvas' });
  const room = green.room(5, 5, { wall: 'canvas' });
  g.record(...room.tile(3, 0));
  g.road(...room.tile(1, 1), 70);
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  return g;
}
