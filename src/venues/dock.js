import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, branch, centre, flat, frontHeading, wallTile, wash } from './helpers.js';

/**
 * Act 5: The Loading Dock. The back of the house, where the gear comes in
 * and the band gets loaded out: corrugated iron and diamond plate, sodium
 * lamps, amber beacons. Rock arrives in the back of a trailer and rolls
 * down its tail-lift onto the apron, a ledge over the dark where the belts
 * run toward the edge. A parcel chute drops him into the sorting hall, a
 * loop of conveyors with a roller shutter off it; the goods lift takes him
 * down to the warehouse, aisles of racking with crates coming off the crane
 * on the beat and the pass somewhere among them. Then the bays: three gaps,
 * three forklifts, live cable underneath, and runaway drums in the yard.
 */

export const DOCK = {
  tiles: ['#8a929c', '#767e8a', '#9a8a6a', '#6a727c'],
  walls: ['#7a8896', '#6a7886', '#8a7a68', '#5e6a78'],
  ambient: [0.95, 0.96, 1.05], lamp: '#ffc060', trap: '#2a2a2e', lift: '#4a4a52', exit: '#ffb02a', zapHue: 0.5, vary: 0.07,
};

/** Amber, red and cyan: the colours of a working yard. */
const BEACON = ['#ff9a1a', '#ff3a3a', '#2de2ff'];

export function dock() {
  const g = new Venue({
    name: 'The Loading Dock', act: 5, cols: 120, rows: 130, palette: DOCK, tempo: 132,
    intro: 'Load-in is at six. Load-out is whenever Rock says so.',
    look: {
      theme: 'dock', floor: 'plate', wall: 'corrugated', lamp: 'bulb', buzz: true, exitSign: 'GIG', ampName: 'DOCK', crusher: 'crate',
      hemi: ['#c8d4ec', '#4a4238', 1.1], key: '#fff0d8', keyK: 1.1, lantern: '#ffe0a8',
      skyColors: ['#0a0c14', '#14161e', '#22242c', '#38322c', '#5a4228'],
      reflect: BEACON, ceiling: '#2a2c38',
      rig: { colors: BEACON.slice(0, 2), program: 'pulse', every: 2 },
    },
  });
  /** An amber beacon on the wall, turning. */
  const beacon = (p, along, color = BEACON[0]) => g.light('spot', ...wallTile(p, along), { colors: [color], radius: 2.2, height: 1.3, angle: 0.22 });
  const sign = (p, along, text, color, size = 0.55) => g.light('neon', ...wallTile(p, along), { text, color, height: 1.5, size });

  // The back of the trailer, and its tail-lift down to the apron.
  g.room(2, 4, 5, 5, 74, { lamps: 3, floor: 'planks' });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 74, heading: '+x' });
  const trailer = d.hall(5, { floor: 'planks' });
  for (const k of [1, 3]) g.pillar(...backTile(trailer, k), 0.8, { prop: 'case' });
  g.pick(...trailer.tile(2, 0), 5).pick(...trailer.tile(3, 1), 5).pick(...trailer.tile(4, 0), 5);
  d.ramp(5, 2.5);

  // The apron: a ledge over the dark, belts running toward the edge. Keep pushing, or go over.
  const apron = d.ledge(20, { width: 4 });
  const edge = frontHeading(apron);
  g.belt(...apron.rect(4, 3, apron.lo, 4), edge);
  g.belt(...apron.rect(11, 3, apron.lo, 4), edge);
  g.foe('roadie', ...apron.tile(8, 0), { range: 4 });
  g.pick(...apron.tile(5, apron.back), 5).pick(...apron.tile(12, apron.back), 5).pick(...apron.tile(16, 0), 10);
  g.tape(...apron.tile(18, apron.back));
  beacon(apron, 8);
  beacon(apron, 15, BEACON[1]);
  sign(apron, 3, 'BAY 1', BEACON[0]);
  d.turn('+z');
  d.hall(2);
  // The parcel chute, banked, down into the sorting hall.
  d.chute(9, 3);

  // The sorting hall: a loop of conveyors round a sorting table, and a roller shutter off it.
  const sort = d.room(15, 15);
  const [lo, hi] = [-5, 5];
  g.belt(...sort.rect(3, 9, lo, 2), sort.heading === '+z' ? '+z' : sort.heading);
  g.block(...sort.rect(6, 4, -2, 5), 0.85, { prop: 'console' });
  g.belt(...sort.rect(3, 9, hi - 1, 2), sort.heading === '+z' ? '-z' : sort.heading);
  for (const [a, b] of [[2, -3], [12, 3], [12, -3]]) g.pillar(...sort.tile(a, b), 0.8, { prop: 'case' });
  g.foe('roadie', ...sort.tile(4, 3), { range: 6 }).foe('merch', ...sort.tile(10, -4), { range: 6 }).foe('phone', ...sort.tile(12, 0), { range: 5 });
  g.pick(...sort.tile(4, -5), 10).pick(...sort.tile(8, -5), 10).pick(...sort.tile(4, 5), 10).pick(...sort.tile(8, 5), 10);
  g.road(...sort.tile(13, 5), 50);
  wash(g, sort, ['#ffc060', '#ffe0a8'], { cans: 2, program: 'static' });
  beacon(sort, 3);
  // Behind the roller shutter: the lost-property cage, and a record in it.
  const cage = branch(d, sort, 7, 'front', 7);
  const shutter = cage.hall(9);
  flat(g, shutter, 8, { breakAt: 6.5, look: 'steel' });
  const lost = cage.room(5, 5);
  g.record(...lost.tile(3, 0));
  g.pick(...lost.tile(1, -1), 10).pick(...lost.tile(1, 1), 10);
  d.hall(3);
  // The goods lift: down a floor.
  const lift = d.shaft(4, { size: 3, period: 7, style: 'forklift' });
  void lift;
  d.hall(2);

  // The warehouse: racking in rows, aisles between, crates coming off the crane where the aisles cross.
  const store = d.room(17, 17, { floor: 'concrete' });
  for (const b of [-5, -1, 3]) {
    g.block(...store.rect(2, 5, b, 2), 1.3, { prop: 'racking' });
    g.block(...store.rect(9, 6, b, 2), 1.3, { prop: 'racking' });
  }
  for (const b of [-3, 1, 5]) g.speaker(...store.rect(7, 2, b, 2).slice(0, 2), { w: store.dir[0] ? 2 : 2, d: 2, beats: 4, offset: (b + 3) * 0.08 });
  g.foe('roadie', ...store.tile(4, -3), { range: 5 }).foe('roadie', ...store.tile(12, 1), { range: 5 }).foe('security', ...store.tile(15, 5), { range: 5 });
  g.foe('merch', ...store.tile(13, -7), { range: 5 });
  g.pass(...store.tile(15, -7));
  g.pick(...store.tile(1, -7), 10).pick(...store.tile(1, 7), 10).pick(...store.tile(16, -3), 5).pick(...store.tile(16, 1), 5).pick(...store.tile(16, 5), 5);
  g.lighter(...store.tile(4, 7));
  g.tape(...store.tile(15, 7));
  beacon(store, 8, BEACON[1]);
  sign(store, 3, 'AISLE 9', BEACON[2]);
  // Out of the warehouse by a corridor of its own, gated, so the way on can't be got at from along the racking.
  const door = d.hall(3);
  barred(g, door, 1);
  d.turn('+x');
  d.hall(6);

  // The loading bays: three gaps, three forklifts, live cable in the pits.
  for (let i = 0; i < 3; i++) {
    const bay = d.ferry(8, { size: 3, period: 6 + i, phase: i * 1.3, style: 'forklift' });
    g.zap(...bay.rect(0, 8, bay.lo - 2, 7), d.h - 1.6, { fill: true });
    const dockside = d.hall(i === 1 ? 5 : 3);
    if (i === 0) g.pick(...dockside.tile(1, 0), 10);
    if (i === 1) {
      // Off the middle dock, along a plank: the cab of a parked truck, and a record on the seat.
      const cab = branch(d, dockside, 2, 'front', 2);
      const plank = cab.bridge(6);
      g.zap(...plank.rect(0, 6, plank.lo - 2, 5), cab.h - 1.6, { fill: true });
      const seat = cab.room(4, 4, { floor: 'planks' });
      g.record(...seat.tile(2, 0));
      g.foe('drum', ...plank.tile(2, 0), { path: [plank.tile(0, 0), plank.tile(5, 0)] });
      g.tape(...dockside.tile(4, 0));
    }
  }
  d.turn('+z');
  d.stairs(3, 1.5);

  // The yard: runaway drums going round, the band's van, and the gate out.
  const yard = d.room(15, 13, { floor: 'concrete' });
  g.foe('drum', ...yard.tile(4, 0), { path: [yard.tile(2, -4), yard.tile(12, -4), yard.tile(12, 4), yard.tile(2, 4)] });
  g.foe('drum', ...yard.tile(10, 0), { path: [yard.tile(12, 4), yard.tile(2, 4), yard.tile(2, -4), yard.tile(12, -4)] });
  g.foe('mascot', ...yard.tile(7, 0), { range: 5 });
  g.block(...yard.rect(5, 5, yard.back * 5, 2), 1.4, { prop: 'case' });
  g.pick(...yard.tile(3, 0), 10).pick(...yard.tile(7, -3), 10).pick(...yard.tile(7, 3), 10).pick(...yard.tile(11, 0), 10);
  beacon(yard, 3);
  beacon(yard, 11, BEACON[1]);
  // Round the back of the van, behind a panel of ply: the last record.
  const van = branch(d, yard, 11, 'front', 6);
  const vanHall = van.hall(9);
  flat(g, vanHall, 8, { breakAt: 6.5, look: 'wood' });
  const back = van.room(5, 5);
  g.record(...back.tile(3, 0));
  g.road(...back.tile(1, 1), 70);
  void centre; void across;
  d.hall(3);
  d.exit(3);
  return g;
}
