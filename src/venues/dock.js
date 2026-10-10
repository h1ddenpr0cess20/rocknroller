import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, branch, centre, flat, wallTile, wash } from './helpers.js';

/**
 * Act 5: The Loading Dock. The back of the house, where the gear comes in
 * and the band gets loaded out: corrugated iron and diamond plate, sodium
 * lamps, amber beacons turning on the forklifts. Conveyor belts carry Rock
 * where he did not mean to go, flight-case crushers come down on the beat,
 * and the way across the loading bay is on a forklift's pallet, with live
 * cable in the pit beneath. The roadies have seen worse, and so has Rock.
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
    name: 'The Loading Dock', act: 5, cols: 150, rows: 150, palette: DOCK, tempo: 132,
    intro: 'Load-in is at six. Load-out is whenever Rock says so.',
    look: {
      theme: 'dock', floor: 'plate', wall: 'corrugated', lamp: 'bulb', buzz: true, exitSign: 'GIG', ampName: 'DOCK', crusher: 'crate',
      hemi: ['#c8d4ec', '#4a4238', 1.1], key: '#fff0d8', keyK: 1.1, lantern: '#ffe0a8',
      skyColors: ['#0a0c14', '#14161e', '#22242c', '#38322c', '#5a4228'],
      reflect: BEACON, ceiling: '#2a2c38',
      rig: { colors: BEACON.slice(0, 2), program: 'pulse', every: 2 },
    },
  });
  const sign = (p, along, text, color, height = 1.5, size = 0.7) => g.light('neon', ...wallTile(p, along), { text, color, height, size });

  // The yard, with the bus parked across the end of it.
  g.room(2, 4, 5, 5, 50, { lamps: 3 });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 50, heading: '+x' });
  const yard = d.hall(13);
  g.foe('roadie', ...yard.tile(7, 0), { range: 5, path: [yard.tile(4, 0), yard.tile(10, 0)] });
  g.pick(...yard.tile(3, 0), 5).pick(...yard.tile(4, 1), 5).pick(...yard.tile(5, -1), 5).pick(...yard.tile(11, 0), 10);
  g.light('spot', ...wallTile(yard, 6), { colors: ['#fff0c8'], aim: [0, 0], height: 2.4, reach: 8 });
  sign(yard, 8, 'DOCK 3', BEACON[0], 1.5, 0.8);
  d.turn('+z');
  g.tape(...d.hall(3).tile(1, 0));
  d.ramp(6, 2.5);

  // The warehouse: pallets of cases, and a pair of belts across it going opposite ways.
  const shed = d.room(21, 15);
  const along = shed.back > 0 ? Math.PI / 2 : -Math.PI / 2;
  for (const [a, b] of [[2, 4], [2, -4], [9, 5], [9, -5], [17, 4], [17, -4]]) g.pillar(...shed.tile(a, b), 1.0, { prop: 'case', rot: along });
  g.belt(...shed.rect(5, 2, shed.lo, 15), shed.back > 0 ? '+x' : '-x');
  g.belt(...shed.rect(13, 2, shed.lo, 15), shed.back > 0 ? '-x' : '+x');
  g.foe('roadie', ...shed.tile(3, 0), { range: 6 }).foe('merch', ...shed.tile(8, -3), { range: 6 }).foe('roadie', ...shed.tile(11, 3), { range: 6 });
  g.foe('drum', ...shed.tile(15, 0), { path: [shed.tile(15, -4), shed.tile(19, -4), shed.tile(19, 4), shed.tile(15, 4)] });
  g.pick(...shed.tile(2, 0), 10).pick(...shed.tile(8, 2), 10).pick(...shed.tile(11, -4), 10).pick(...shed.tile(18, 0), 10);
  g.road(...shed.tile(19, 5), 50);
  wash(g, shed, BEACON.slice(0, 2), { cans: 4, program: 'pulse', every: 1, glow: 0.8 });
  g.light('spot', ...centre(shed), { colors: ['#fff0c8'], height: 3, reach: 9 });
  sign(shed, 4, 'IN', BEACON[0], 1.5, 0.8);
  sign(shed, 14, 'OUT', BEACON[2], 1.5, 0.8);
  // Off the front, behind a sheet of ply, the first record: the cage.
  const cage = branch(d, shed, 7);
  const cageHall = cage.hall(9);
  flat(g, cageHall, 8, { breakAt: 6.5, look: 'steel' });
  const locker = cage.room(5, 5);
  g.record(...locker.tile(3, 0));
  g.pick(...locker.tile(1, -1), 10).pick(...locker.tile(1, 1), 10);
  d.hall(4);
  d.turn('+x');

  // The load-out belt carries Rock along, and past it flight cases come down on the beat: the belt stops short of them.
  const belt = d.hall(10);
  g.belt(...belt.span(0, 10), '+x');
  g.pick(...belt.tile(2, 0), 5).pick(...belt.tile(4, 0), 5).pick(...belt.tile(6, 0), 5).pick(...belt.tile(8, 0), 10);
  g.light('par', ...wallTile(belt, 3), { colors: [BEACON[0]], program: 'static', aim: [0, 0], glow: 0.8, reach: 7, height: 1.4 });
  const out = d.hall(17);
  g.speaker(...across(out, 4, { beats: 4 }));
  g.speaker(...across(out, 9, { beats: 4, offset: 0.5 }));
  g.speaker(...across(out, 14, { beats: 4 }));
  g.pick(...out.tile(2, 0), 5).pick(...out.tile(6, 1), 5).pick(...out.tile(6, -1), 5).pick(...out.tile(11, 0), 10);
  g.light('par', ...wallTile(out, 6), { colors: [BEACON[1]], program: 'static', aim: [0, 0], glow: 0.8, reach: 7, height: 1.4 });
  g.foe('merch', ...belt.tile(7, 0), { range: 3 });
  d.hall(3);

  // The loading bay: a forklift takes you across, and there is live cable in the pit.
  d.hall(3);
  const bay = d.ferry(11, { size: 3, period: 8, style: 'forklift' });
  g.zap(...bay.rect(0, 11, bay.lo - 2, 7), d.h - 1.6, { fill: true });
  d.hall(3);

  // The truck bay: a gate across the dock office, a bouncer on the pass, and a record on a plank.
  const trucks = d.room(15, 13);
  for (const [a, b] of [[3, -4], [3, 4], [8, -5], [8, 5], [12, 4]]) g.pillar(...trucks.tile(a, b), 1.0, { prop: 'case', rot: along });
  g.foe('security', ...trucks.tile(5, 0), { range: 6 }).foe('phone', ...trucks.tile(9, 3), { range: 6 }).foe('roadie', ...trucks.tile(11, -3), { range: 6 });
  g.pick(...trucks.tile(2, 0), 10).pick(...trucks.tile(7, -3), 10).pick(...trucks.tile(10, 5), 10);
  g.lighter(...trucks.tile(13, -5));
  wash(g, trucks, [BEACON[0], BEACON[1]], { cans: 3, program: 'chase', every: 2 });
  sign(trucks, 7, 'BAY 2', BEACON[0], 1.6, 0.8);
  const hut = branch(d, trucks, 7, 'front', 7);
  hut.hall(3);
  const office = hut.room(7, 7);
  g.pass(...office.tile(4, 0));
  g.foe('bouncer', ...office.tile(3, 1), { range: 5 });
  g.pick(...office.tile(5, -2), 10);
  const plankSide = branch(d, trucks, 12, 'back', 7);
  plankSide.hall(2);
  const plank = plankSide.bridge(7);
  g.zap(...plank.rect(0, 7, plank.lo - 2, 5), plankSide.h - 1.6, { fill: true });
  g.foe('drum', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const nook = plankSide.room(5, 5);
  g.record(...nook.tile(2, 0));
  d.hall(4);
  const door = d.hall(6);
  barred(g, door, 3);
  d.turn('+z');
  d.stairs(3, 1.5);

  // The last bay: a mascot (somebody is on a break) and a ply door across a side room, then the stage door.
  const last = d.room(15, 13);
  for (const k of [2, 6, 10]) g.pillar(...backTile(last, k), 1.0, { prop: 'case', rot: along });
  g.foe('mascot', ...last.tile(10, 0), { range: 6 });
  g.foe('roadie', ...last.tile(4, -3), { range: 6 }).foe('merch', ...last.tile(6, 3), { range: 6 });
  g.pick(...last.tile(2, 3), 10).pick(...last.tile(5, 0), 10).pick(...last.tile(9, -4), 10);
  g.tape(...last.tile(3, -4));
  wash(g, last, [BEACON[2], BEACON[0]], { cans: 3, program: 'chase', every: 2 });
  const vaultSide = branch(d, last, 6);
  const vaultHall = vaultSide.hall(9);
  flat(g, vaultHall, 8, { breakAt: 6.5, look: 'steel' });
  const vault = vaultSide.room(5, 5);
  g.record(...vault.tile(3, 0));
  g.road(...vault.tile(1, 1), 70);
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  return g;
}
