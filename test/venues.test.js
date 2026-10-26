import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FOES } from '../src/foes.js';
import { RECORDS } from '../src/rating.js';
import { VENUES, loadVenue } from '../src/venues/index.js';
import * as GFX from 'madness-engine/gfx';
import { createGig } from '../src/gig.js';
import { drive, graph, plan } from './helpers/autopilot.js';

/** The boss of each venue that has one. */
const bossOf = (venue) => venue.foes.filter((f) => FOES[f.kind].boss).map((f) => f.kind);

test('every venue can be played through to the stage door in one piece, with all its records', () => {
  for (let i = 0; i < VENUES.length; i++) {
    const r = drive(i);
    const name = r.gig.venue.name;
    assert.ok(r.finished, `${name}: the autopilot got stuck (${JSON.stringify(r.stuck)})`);
    const records = r.gig.actors.pickups.filter((p) => p.kind === 'record');
    assert.equal(records.length, RECORDS, `${name} hides ${RECORDS} records`);
    assert.ok(records.every((p) => p.taken), `${name}: every record can be got`);
    assert.ok(r.gig.rock.hp > 0, `${name}: Rock got there whole`);
  }
});

test('no two venues have the same boss, and the mirror ball hangs in the Club and nowhere else', () => {
  const bosses = VENUES.map((_, i) => bossOf(loadVenue(i))).flat();
  assert.equal(new Set(bosses).size, bosses.length, `bosses: ${bosses.join(', ')}`);
  for (let i = 0; i < VENUES.length; i++) {
    const v = loadVenue(i);
    const balls = v.fixtures.filter((f) => f.kind === 'ball').length;
    assert.equal(balls, v.name === 'The Club' ? 1 : 0, `${v.name} has ${balls} mirror balls`);
  }
});

test('everything lying about can be got to, from where Rock starts, and leaves him a way on to the stage door', () => {
  for (let i = 0; i < VENUES.length; i++) {
    const gig = createGig(GFX, i);
    const v = gig.venue, net = graph(v);
    let exit = null;
    for (let z = 0; z < v.rows && !exit; z++) for (let x = 0; x < v.cols && !exit; x++) if (v.cell(x, z)?.kind === 'exit') exit = [x, z];
    for (const p of gig.actors.pickups) {
      const at = [Math.floor(p.x), Math.floor(p.z)];
      const c = v.cell(...at);
      const where = `${v.name}: the ${p.kind} at ${at}`;
      assert.ok(c && c.kind === 'floor' && !c.prop && !c.crush, `${where} is on open floor`);
      assert.ok(plan(gig, net, [v.start.x, v.start.z], at, 99), `${where} can be reached`);
      assert.ok(plan(gig, net, at, exit, 99), `${where} doesn't strand him`);
    }
  }
});

/**
 * How far along the way from the start to the stage door each tile of a venue
 * is: the step of that way it is nearest, so a side room counts from where it
 * leads off.
 */
function along(gig, net) {
  const v = gig.venue;
  const key = (x, z) => z * v.cols + x;
  let exit = null;
  for (let z = 0; z < v.rows && !exit; z++) for (let x = 0; x < v.cols && !exit; x++) if (v.cell(x, z)?.kind === 'exit') exit = [x, z];
  const way = [[v.start.x, v.start.z], ...plan(gig, net, [v.start.x, v.start.z], exit, 99).map((m) => [m.x, m.z])];
  const step = new Map();
  let front = [];
  way.forEach(([x, z], i) => {
    if (step.has(key(x, z))) return;
    step.set(key(x, z), i);
    front.push([x, z]);
  });
  while (front.length) {
    const next = [];
    for (const [x, z] of front) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = v.cell(x + dx, z + dz);
        if (!c || c.kind === 'wall' || step.has(key(x + dx, z + dz))) continue;
        step.set(key(x + dx, z + dz), step.get(key(x, z)));
        next.push([x + dx, z + dz]);
      }
    }
    front = next;
  }
  return (x, z) => step.get(key(Math.floor(x), Math.floor(z)));
}

test('tape lies after something that can hurt Rock and before something that still can, and a lighter before something that could finish him', () => {
  for (let i = 0; i < VENUES.length; i++) {
    const gig = createGig(GFX, i);
    const v = gig.venue, at = along(gig, graph(v));
    // What does him real harm: speaker stacks, pyro, live cable, and anyone who hits back harder than a little brother.
    const harm = [
      ...v.crushers.map((c) => at(c.x + c.w / 2, c.z + c.d / 2)),
      ...v.spikes.map((s) => at(s.x + s.w / 2, s.z + s.d / 2)),
      ...v.foes.filter((f) => FOES[f.kind].power > FOES.brother.power).map((f) => at(f.x, f.z)),
    ];
    for (let z = 0; z < v.rows; z++) for (let x = 0; x < v.cols; x++) if (v.cell(x, z)?.kind === 'zap') harm.push(at(x, z));
    for (const p of gig.actors.pickups) {
      if (p.kind !== 'tape' && p.kind !== 'lighter') continue;
      const here = at(p.x, p.z);
      const where = `${v.name}: the ${p.kind} at ${[Math.floor(p.x), Math.floor(p.z)]}`;
      if (p.kind === 'tape') assert.ok(harm.some((h) => h < here), `${where} is picked up before anything can have hurt him`);
      assert.ok(harm.some((h) => h > here), `${where} is picked up after the last thing that can`);
    }
  }
});
