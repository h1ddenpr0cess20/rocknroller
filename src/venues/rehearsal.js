import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, branch } from './helpers.js';

/**
 * Act 2: The Rehearsal Rooms. A converted warehouse cut up into practice
 * rooms, nine of them in a block, a band in every one, all playing at once
 * through foam that doesn't help. The rooms open into each other — some of
 * them, through doorways where somebody has stacked the PA and keeps
 * dropping it — so the block is a maze: a record in each of two rooms at
 * the far end, the pass in the room where the A&R man is scouting, and the
 * fire door out at the bottom corner, locked. Then down the fire escape to
 * the loading bay.
 */

export const REHEARSAL = {
  tiles: ['#7a7f8e', '#666b7a', '#4e5262', '#5a5e6e'],
  walls: ['#6a6e80', '#585c6c', '#464a5a', '#52566a'],
  ambient: [0.78, 0.8, 0.95], lamp: '#c8e4ff', trap: '#2a2a32', lift: '#40404c', exit: '#ff3fa4', vary: 0.06,
};

export function rehearsal() {
  const g = new Venue({
    name: 'The Rehearsal Rooms', act: 2, cols: 90, rows: 100, palette: REHEARSAL, tempo: 118,
    intro: 'Nine practice rooms. Nine bands. All of them at once.',
    look: {
      theme: 'rehearsal', floor: 'concrete', wall: 'foam', lamp: 'bulb', buzz: true, exitSign: 'GIG', ampName: 'REHEARSE',
      hemi: ['#b8c4ee', '#2a2840', 1.0], key: '#e4ecff', keyK: 1.1, lantern: '#f0f4ff',
      skyColors: ['#04050e', '#080a1c', '#0e1030', '#16143c', '#201a48'],
      reflect: ['#ff3a4a', '#2a8aff', '#3aff7a'], ceiling: '#2a3050',
      rig: { colors: ['#ff3a4a', '#2a8aff'], program: 'pulse', every: 2 },
    },
  });
  const FOAM = { wall: 'foam' };

  // The lobby, and the stairs down to the block.
  g.room(2, 4, 5, 5, 60, { lamps: 3, ...FOAM });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 60, heading: '+x' });
  const lobby = d.hall(8, FOAM);
  g.pick(...lobby.tile(2, 0), 5).pick(...lobby.tile(4, 0), 5).pick(...lobby.tile(6, 0), 5);
  g.light('neon', ...lobby.tile(4, -2), { text: 'REHEARSAL', color: '#2a8aff', height: 1.6, size: 0.55 });
  d.turn('+z', FOAM);
  d.hall(2, FOAM);
  d.stairs(4, 2, FOAM);

  // The block: three by three rooms, seven tiles square, a foam wall between each.
  const H = d.h, S = 7, x0 = d.at.x - 3, z0 = d.at.z;
  const at = (i, j) => [x0 + i * (S + 1), z0 + j * (S + 1)];
  /** Tile (a, b) of room (i, j), from its top-left corner. */
  const tile = (i, j, a, b) => [at(i, j)[0] + a, at(i, j)[1] + b];
  const floors = ['concrete', 'carpet', 'planks', 'carpet', 'concrete', 'planks', 'carpet', 'planks', 'concrete'];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) g.room(...at(i, j), S, S, H, { ...FOAM, floor: floors[j * 3 + i], lamps: 0 });
  /** A doorway through the wall between two rooms side by side (`across` 'x') or one above the other ('z'), three wide. */
  const door = (i, j, way, { stack = false, offset = 0 } = {}) => {
    const [x, z] = at(i, j);
    const [dx, dz, w, dd] = way === 'x' ? [x + S, z + 2, 1, 3] : [x + 2, z + S, 3, 1];
    g.flat(dx, dz, w, dd, H, { tex: 'concrete' });
    if (stack) g.speaker(dx, dz, { w, d: dd, beats: 4, offset });
  };
  door(0, 0, 'x');
  door(1, 0, 'x', { stack: true });
  door(0, 0, 'z');
  door(0, 1, 'x', { stack: true, offset: 0.5 });
  door(1, 1, 'z');
  door(1, 1, 'x', { stack: true, offset: 0.25 });
  door(0, 2, 'x');
  door(1, 2, 'x');

  /** A room's band, out of the way of the doors: amps in the top corners, a kit in the bottom left, a coloured light on it. */
  const band = (i, j, colour, { kit = true } = {}) => {
    for (const a of [0, 6]) g.pillar(...tile(i, j, a, 0), 1.0, { prop: 'amp', rot: 0 });
    if (kit) g.block(...tile(i, j, 0, 5), 2, 2, 0.35, { prop: 'drums' });
    g.light('par', ...tile(i, j, 6, 6), { colors: [colour], program: 'pulse', every: 1, aim: [-3, -3], height: 1.7, glow: 0.7, reach: 7 });
  };
  // Room 1, the punks; room 2, the metal band, under a strobe; room 3, the drummer, and a record under his stool.
  band(0, 0, '#ff3a4a');
  g.foe('mosher', ...tile(0, 0, 3, 4), { range: 4 });
  g.pick(...tile(0, 0, 3, 5), 10).pick(...tile(0, 0, 5, 3), 5);
  band(1, 0, '#e8e8ff', { kit: false });
  g.light('strobe', ...tile(1, 0, 3, 1), { colors: ['#ffffff'], reach: 7, height: 1.4 });
  g.foe('metalhead', ...tile(1, 0, 2, 4), { range: 4 }).foe('metalhead', ...tile(1, 0, 5, 4), { range: 4 });
  g.pick(...tile(1, 0, 3, 3), 10);
  band(2, 0, '#ffb02a');
  g.foe('drum', ...tile(2, 0, 3, 4), { path: [tile(2, 0, 2, 2), tile(2, 0, 5, 2), tile(2, 0, 5, 4), tile(2, 0, 2, 4)] });
  g.record(...tile(2, 0, 5, 5));
  // Room 4, a singer-songwriter and his friend; room 5, the big room, the covers band and its crowd; room 6, a record.
  band(0, 1, '#3aff7a', { kit: false });
  g.foe('freebird', ...tile(0, 1, 3, 3), { range: 4 });
  g.tape(...tile(0, 1, 1, 5));
  band(1, 1, '#2a8aff');
  g.foe('mosher', ...tile(1, 1, 2, 4), { range: 4 }).foe('roadie', ...tile(1, 1, 5, 3), { range: 4 });
  g.pick(...tile(1, 1, 1, 3), 10).pick(...tile(1, 1, 3, 5), 10);
  g.lighter(...tile(1, 1, 6, 6));
  band(2, 1, '#ff3a8a');
  g.foe('metalhead', ...tile(2, 1, 3, 4), { range: 4 });
  g.record(...tile(2, 1, 5, 4));
  g.road(...tile(2, 1, 3, 5), 50);
  // Room 7, where the A&R man is, and the pass; room 8, the bassist alone; room 9, the fire door.
  band(0, 2, '#c83aff', { kit: false });
  g.foe('suit', ...tile(0, 2, 3, 3), { range: 4 });
  g.pass(...tile(0, 2, 2, 5));
  band(1, 2, '#3ad8ff', { kit: false });
  g.foe('roadie', ...tile(1, 2, 3, 4), { range: 4 });
  g.pick(...tile(1, 2, 2, 5), 10).pick(...tile(1, 2, 5, 5), 10);
  band(2, 2, '#ff6a2a');
  g.foe('mosher', ...tile(2, 2, 3, 3), { range: 4 });
  g.light('neon', ...tile(2, 2, 6, 0), { text: 'FIRE EXIT', color: '#3aff7a', height: 1.5, size: 0.4 });

  // The fire door, at the bottom of room 9, and the fire escape: down the banked stairs, outside, to the loading bay.
  const [fx, fz] = tile(2, 2, 3, S);
  const out = digger(g, { x: fx, z: fz, h: H, heading: '+z' });
  const fire = out.hall(3, FOAM);
  g.gate(...fire.span(1), { axis: 'z' });
  const escape = out.chute(9, 3);
  g.pick(...escape.tile(2, 0), 5).pick(...escape.tile(4, 0), 5).pick(...escape.tile(6, 0), 5);
  out.turn('+x', { wall: 'block' });
  const bay = out.hall(10, { wall: 'block', width: 5 });
  g.speaker(...across(bay, 4, { beats: 4 }));
  g.foe('roadie', ...bay.tile(7, 0), { range: 3 });
  g.pick(...bay.tile(2, 0), 5).pick(...bay.tile(6, 1), 5).pick(...bay.tile(8, -1), 10);
  // Along a plank from the bay, the band's van: the last record.
  const van = branch(out, bay, 5, 'front', 3);
  const plank = van.bridge(6);
  g.foe('brother', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const back = van.room(4, 4, { wall: 'block', floor: 'planks' });
  g.record(...back.tile(2, 0));
  out.hall(2, { wall: 'block' });
  out.exit(3);
  return g;
}
