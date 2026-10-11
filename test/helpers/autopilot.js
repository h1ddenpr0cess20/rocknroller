/**
 * An autopilot for the venues. It plans its own way through — tile by tile,
 * over floor it can roll onto, down drops it can survive, across on the
 * lifts, never onto live floor — fetches the passes before the gates and
 * the gold records behind the panels, running at a panel fast enough to go
 * through it, then rolls Rock along the plan with the same push the controls
 * give. It waits for speaker stacks to go up, pyro to die down and lifts to
 * come, and whoever it runs into, it runs into, as a player does. If it can
 * get Rock to the stage door in one piece, a person can: the tests hold
 * every venue to that.
 */

import * as GFX from '../../src/vendor/gfx/index.js';
import { hammerAt, liftAt, spikesAt } from '../../src/actors.js';
import { createGig, putBack, STEP, stepGig } from '../../src/gig.js';
import { FALL_LIMIT } from '../../src/physics.js';

/** The furthest it will drop off a ledge: well short of a drop that hurts. */
export const DROP = FALL_LIMIT * 0.6;

const NEIGHBOURS = [
  [0, -1, (c) => [c.h[0], c.h[1]], (n) => [n.h[2], n.h[3]]],
  [0, 1, (c) => [c.h[2], c.h[3]], (n) => [n.h[0], n.h[1]]],
  [-1, 0, (c) => [c.h[0], c.h[2]], (n) => [n.h[1], n.h[3]]],
  [1, 0, (c) => [c.h[1], c.h[3]], (n) => [n.h[0], n.h[2]]],
];


/**
 * The ways from tile to tile: a step to a neighbour that isn't higher at the
 * shared edge and isn't too far down, and a ride on each lift, from the
 * tiles beside it at one end of its run to those beside it at the other.
 * `rides` are the lift rides out of each tile: { to, lift, from, end }.
 */
export function graph(venue) {
  const key = (x, z) => z * venue.cols + x;
  // Round bumpers, not into them: the tile one stands on is no way through.
  const posts = new Set(venue.bumpers.map((b) => key(Math.floor(b.x), Math.floor(b.z))));
  const walkable = (c, x, z) => c && c.kind !== 'wall' && c.kind !== 'zap' && !posts.has(key(x, z));
  const steps = new Map();
  const rides = new Map();
  for (let z = 0; z < venue.rows; z++) {
    for (let x = 0; x < venue.cols; x++) {
      const c = venue.cell(x, z);
      if (!walkable(c, x, z)) continue;
      const out = [];
      for (const [dx, dz, mine, theirs] of NEIGHBOURS) {
        const n = venue.cell(x + dx, z + dz);
        if (!walkable(n, x + dx, z + dz)) continue;
        const [a0, a1] = mine(c), [b0, b1] = theirs(n);
        const up = Math.max(b0 - a0, b1 - a1);
        const down = Math.max(a0 - b0, a1 - b1);
        if (up < 0.01 && down < DROP) out.push({ x: x + dx, z: z + dz, drop: Math.max(0, down) });
      }
      steps.set(key(x, z), out);
    }
  }
  venue.lifts.forEach((l, i) => {
    // The tiles square beside the lift, level with its top, at one end of its run or the other.
    const beside = (end) => {
      const [ox, , oz] = l.to.map((v) => Math.round(v * end));
      const out = [];
      const top = l.h + l.to[1] * end;
      const consider = (x, z) => {
        const c = venue.cell(x + ox, z + oz);
        if (walkable(c) && Math.abs(Math.max(...c.h) - top) < 0.01) out.push([x + ox, z + oz]);
      };
      for (let x = l.x; x < l.x + l.w; x++) { consider(x, l.z - 1); consider(x, l.z + l.d); }
      for (let z = l.z; z < l.z + l.d; z++) { consider(l.x - 1, z); consider(l.x + l.w, z); }
      return out;
    };
    const ends = [beside(0), beside(1)];
    for (const end of [0, 1]) {
      for (const [fx, fz] of ends[end]) {
        const list = rides.get(key(fx, fz)) ?? [];
        for (const [tx, tz] of ends[1 - end]) list.push({ x: tx, z: tz, lift: i, from: end });
        rides.set(key(fx, fz), list);
      }
    }
  });
  return { key, steps, rides };
}

/** Next to a drop or the dark: somewhere to go carefully. */
function edgy(venue, x, z) {
  const c = venue.cell(x, z);
  for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const n = venue.cell(x + dx, z + dz);
    if (!n || n.kind === 'zap') return true;
    if (n.kind !== 'wall' && Math.min(...n.h) < Math.min(...c.h) - 0.6) return true;
  }
  return false;
}

/** The door covering tile (x, z), if any. */
const doorAt = (venue, x, z) => venue.doors.find((g) => x >= g.x && z >= g.z && x < g.x + g.w && z < g.z + g.d);

/**
 * The cheapest way from tile `from` to tile `to`, as a list of moves
 * ({ x, z } or a lift ride), or null. Gates are shut unless `passes` says
 * one can be opened, or it already is; a panel can always be gone through, at
 * a price, for it takes a run at it.
 */
export function plan(gig, net, from, to, passes) {
  const venue = gig.venue;
  const { key, steps, rides } = net;
  const doorOpen = (x, z) => gig.actors.doors.some((g) => !g.box.solid && x >= g.x && z >= g.z && x < g.x + g.w && z < g.z + g.d);
  const cost = new Map([[key(...from), 0]]);
  const back = new Map();
  const open = [[0, from[0], from[1]]];
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [c0, x, z] = open.shift();
    if (x === to[0] && z === to[1]) break;
    if (c0 > cost.get(key(x, z))) continue;
    const moves = [...(steps.get(key(x, z)) ?? []), ...(rides.get(key(x, z)) ?? [])];
    for (const m of moves) {
      const cell = venue.cell(m.x, m.z);
      const door = cell.door ? doorAt(venue, m.x, m.z) : null;
      if (door?.kind === 'gate' && !doorOpen(m.x, m.z) && passes < 1) continue;
      let step = m.lift !== undefined ? 8 : 1 + (m.drop ?? 0) * 2;
      if (edgy(venue, m.x, m.z)) step += 2;
      if (cell.trap) step += 25;
      if (cell.crush) step += 4;
      if (door?.kind === 'panel') step += 6;
      if (cell.fx === 'sticky') step += 3;
      const total = c0 + step;
      if (total < (cost.get(key(m.x, m.z)) ?? Infinity)) {
        cost.set(key(m.x, m.z), total);
        back.set(key(m.x, m.z), { prev: [x, z], move: m });
        open.push([total, m.x, m.z]);
      }
    }
  }
  if (!back.has(key(...to)) && (from[0] !== to[0] || from[1] !== to[1])) return null;
  const moves = [];
  for (let at = to; at[0] !== from[0] || at[1] !== from[1];) {
    const b = back.get(key(...at));
    moves.unshift(b.move);
    at = b.prev;
  }
  return moves;
}

/** A crusher's place in its cycle, 0 to 1. */
const cycle = (time, period, phase) => ((((time + phase) / period) % 1) + 1) % 1;

/** Clear to go under speaker `h`: it has just gone up and is a good while off coming down. */
const crusherUp = (h) => (gig) => {
  const u = cycle(gig.time, h.period, h.phase);
  return u > 0.2 && u < 0.4 && hammerAt(gig.time, h.period, h.phase) > 0.35;
};

/** Clear to cross pyro `s`: just gone quiet, and not firing again for a while. */
const pyroQuiet = (s) => (gig) => {
  const u = cycle(gig.time, s.period, s.phase);
  return spikesAt(gig.time, s.period, s.phase) === 0 && (u > 0.93 || u < 0.15);
};

/** Lift `l` waiting at end `end`, early enough in the wait to get on or off before it goes. */
const liftWaiting = (l, end) => (gig) => {
  const s = liftAt(gig.time, l.period, l.phase, l.pause);
  const u = cycle(gig.time, l.period, l.phase);
  return end === 0 ? s === 0 && u < l.pause * 0.45 : s === 1 && u > 0.5 && u < 0.5 + l.pause * 0.45;
};

let openFloor = () => false;

/** Whether there is floor all the way along a straight line from `a` to `c`, level enough to roll along it. */
function open(a, c) {
  const n = Math.ceil(Math.hypot(c.x - a.x, c.z - a.z) * 2);
  for (let i = 1; i < n; i++) {
    const x = a.x + ((c.x - a.x) * i) / n, z = a.z + ((c.z - a.z) * i) / n;
    if (!openFloor(Math.floor(x), Math.floor(z))) return false;
  }
  return true;
}

/** Turns a plan into waypoints: tile centres at a pace to suit, with waits and rides where they're needed. */
function waypoints(gig, moves, from) {
  const venue = gig.venue;
  const out = [];
  let prev = from;
  const centre = (x, z) => [x + 0.5, z + 0.5];
  const zoneOf = (list, x, z) => list.find((s) => x >= s.x && z >= s.z && x < s.x + s.w && z < s.z + s.d);
  for (const m of moves) {
    if (m.lift !== undefined) {
      const l = gig.actors.lifts[m.lift];
      const last = out[out.length - 1];
      const wait = { at: centre(...prev), speed: 2.5, stop: true, until: liftWaiting(l, m.from) };
      if (last) Object.assign(last, wait); else out.push(wait);
      out.push({ on: m.lift, at: [l.w / 2, l.d / 2], speed: 2.2, stop: true, until: liftWaiting(l, 1 - m.from), radius: 0.35 });
      out.push({ at: centre(m.x, m.z), speed: 2.2, radius: 0.4 });
      prev = [m.x, m.z];
      continue;
    }
    const cell = venue.cell(m.x, m.z);
    const before = venue.cell(...prev);
    const last = out[out.length - 1];
    // Wait on the tile before a speaker stack or pyro for the moment to go.
    if (cell.crush && !before.crush) {
      const h = zoneOf(gig.actors.crushers, m.x, m.z);
      const wait = { at: centre(...prev), speed: 2.5, stop: true, until: crusherUp(h) };
      if (last) Object.assign(last, wait); else out.push(wait);
    }
    if (cell.trap && !before.trap) {
      const s = zoneOf(gig.actors.spikes, m.x, m.z);
      const wait = { at: centre(...prev), speed: 2.5, stop: true, until: pyroQuiet(s) };
      if (last) Object.assign(last, wait); else out.push(wait);
    }
    let speed = 3.8;
    if (edgy(venue, m.x, m.z)) speed = 2.6;
    if (!venue.cell(m.x + 1, m.z) && !venue.cell(m.x - 1, m.z) || !venue.cell(m.x, m.z + 1) && !venue.cell(m.x, m.z - 1)) speed = 2.2;
    if (cell.crush || cell.trap) speed = 4.5;
    const point = { at: centre(m.x, m.z), speed };
    if (cell.door) {
      const g = zoneOf(gig.actors.doors, m.x, m.z);
      if (g.kind === 'panel' && g.box.solid) {
        // At a panel: fast, and for a few tiles before it, to have the speed.
        point.speed = g.breakAt + 1.6;
        point.charge = true;
        for (let k = out.length - 1; k >= Math.max(0, out.length - 6); k--) Object.assign(out[k], { speed: Math.max(out[k].speed ?? 0, g.breakAt + 1.6), charge: true });
      } else if (g.box.solid) Object.assign(point, { stop: true, until: () => !g.box.solid || g.box.min[1] > g.base + 1.1, speed: 2 });
    }
    out.push(point);
    prev = [m.x, m.z];
  }
  return out;
}

/**
 * Drive venue `index` to the stage door. Returns whether it got there, how
 * long it took, every way Rock was lost or hurt, the people he ran into, and
 * the gig as it came out.
 */
export function drive(index, { limit = 1200, sample = null, records = true, duel = true, from = null } = {}) {
  const gig = createGig(GFX, index);
  const venue = gig.venue;
  const net = graph(venue);
  openFloor = (x, z) => venue.cell(x, z)?.kind === 'floor';
  if (from) {
    gig.safe = [from[0] + 0.5, venue.heightAt(from[0] + 0.5, from[1] + 0.5) + gig.ball.r, from[1] + 0.5];
    putBack(gig);
    gig.passes = 9;
    for (const p of gig.actors.pickups) if (p.kind === 'pass') p.taken = true;
  }
  const b = gig.ball;
  const losses = [], harms = [], hits = [];

  const exits = [];
  for (let z = 0; z < venue.rows; z++) for (let x = 0; x < venue.cols; x++) if (venue.cell(x, z)?.kind === 'exit') exits.push([x, z]);
  const goals = gig.actors.pickups.filter((p) => p.kind === 'pass' || (records && p.kind === 'record'));
  const tileOf = (p) => [Math.floor(p.x), Math.floor(p.z)];

  const here = () => [Math.floor(b.x), Math.floor(b.z)];
  // The venue only goes down, so what is upstream of something has to be fetched first: an item
  // that no other item can be rolled to from is upstream of them all. (Gates are ignored for this.)
  const reaches = new Map();
  const canReach = (a, c) => {
    const k = `${a.x},${a.z}>${c.x},${c.z}`;
    if (!reaches.has(k)) reaches.set(k, plan(gig, net, tileOf(a), tileOf(c), 99) !== null);
    return reaches.get(k);
  };
  /** Where to go next: the most upstream pass or record not yet picked up, nearest first, then the stage door. */
  const goal = () => {
    const left = goals.filter((p) => !p.taken);
    const upstream = left.filter((p) => !left.some((q) => q !== p && canReach(q, p)));
    const nearest = upstream
      .map((p) => ({ p, m: plan(gig, net, here(), tileOf(p), gig.passes) }))
      .filter((c) => c.m)
      .sort((a, c) => a.m.length - c.m.length)[0];
    return nearest ? tileOf(nearest.p) : left.length ? tileOf(left[0]) : exits[Math.floor(exits.length / 2)];
  };
  let route = [];
  let wp = 0;
  const replan = () => {
    const moves = plan(gig, net, here(), goal(), gig.passes);
    route = moves ? waypoints(gig, moves, here()) : [];
    wp = 0;
    return moves !== null;
  };
  const result = (finished, extra = {}) => ({ finished, time: t, losses, harms, hits, gig, ...extra });
  let t = 0;
  if (!replan()) return result(false, { stuck: 'no way to the stage door' });

  let down = 0;
  let still = 0;
  let fight = null;
  let target = goal();

  while (t < limit) {
    t += STEP;
    if (down > 0) {
      down -= STEP;
      stepGig(gig, [0, 0], STEP, { live: false, moving: false });
      if (down <= 0) { putBack(gig); replan(); }
      continue;
    }
    if (route.length === 0 || wp >= route.length) {
      const next = goal();
      if (!replan() || route.length === 0) return result(false, { stuck: { at: here(), goal: next } });
      target = next;
    }

    const w = route[wp];
    let [tx, tz] = w.at;
    if (w.on !== undefined) {
      const box = gig.actors.lifts[w.on].box;
      tx = box.min[0] + w.at[0];
      tz = box.min[2] + w.at[1];
    }
    const dx = tx - b.x, dz = tz - b.z;
    const d = Math.hypot(dx, dz);
    const waiting = w.until && !w.until(gig);
    if (!waiting && d < (w.radius ?? 0.5)) {
      wp++;
      continue;
    }

    const speed = w.speed ?? 3.8;
    const want = waiting || w.stop ? Math.min(speed, d * 2.5) : speed;
    const vx = d > 1e-3 ? (dx / d) * want : 0;
    const vz = d > 1e-3 ? (dz / d) * want : 0;
    let px = (vx - b.vx) * 0.9;
    let pz = (vz - b.vz) * 0.9;
    if (w.charge && d > 1e-3) {
      // Charging: full throttle along the way it is going, and only a little steering across it.
      const ux = dx / d, uz = dz / d;
      const along = Math.max(0, px * ux + pz * uz, b.vx * ux + b.vz * uz < want ? 1 : 0);
      const cross = Math.max(-0.35, Math.min(0.35, px * -uz + pz * ux));
      px = ux * along + -uz * cross;
      pz = uz * along + ux * cross;
    }
    // A boss in the room: back off for a run-up, then charge it, and again.
    let rev = false;
    const boss = duel ? gig.actors.foes.find((f) => f.stats.boss && !f.dead && Math.hypot(f.x - b.x, f.z - b.z) < 20 && Math.abs(f.y - b.y) < 2.5 && open(b, f)) : null;
    if (boss) {
      fight ??= { entry: [b.x, b.z], mode: 'back' };
      const bd = Math.hypot(boss.x - b.x, boss.z - b.z);
      const ed = Math.hypot(fight.entry[0] - b.x, fight.entry[1] - b.z);
      if (fight.mode === 'back' && (ed < 1.5 || bd > 13)) fight.mode = 'charge';
      if (fight.mode === 'charge') {
        px = (boss.x - b.x) / bd;
        pz = (boss.z - b.z) / bd;
        rev = bd > 2.5;
      } else {
        const ex = fight.entry[0] - b.x, ez = fight.entry[1] - b.z, el = Math.hypot(ex, ez) || 1;
        px = (ex / el) * 1;
        pz = (ez / el) * 1;
      }
    } else if (fight) {
      fight = null;
      replan();
    }
    const l = Math.hypot(px, pz);
    if (l > 1) { px /= l; pz /= l; }

    const out = stepGig(gig, [px, pz], STEP, { rev });
    if (boss && fight && out.hits.some((h) => h.foe === boss)) fight.mode = 'back';
    sample?.(gig);
    if (Math.hypot(b.vx, b.vz) < 0.05 && !waiting) still += STEP; else still = 0;
    if (still > 20) return result(false, { stuck: { at: here(), wp, of: route.length, goal: target } });

    if (out.outcome === 'exit') return result(true);
    for (const h of out.hits) hits.push({ kind: h.foe.kind, grade: h.grade, speed: +h.speed.toFixed(1), damage: h.damage });
    if (out.hurt && out.hurt.how !== 'foe') harms.push({ how: out.hurt.how, at: here(), time: +t.toFixed(1) });
    for (const p of out.picked) if (p.kind === 'pass') replan();
    if (out.broke.length) replan();
    if (out.outcome === 'shattered') return result(false, { stuck: 'shattered' });
    if (out.outcome) {
      losses.push({ how: out.outcome, at: [b.x.toFixed(1), b.y.toFixed(1), b.z.toFixed(1)], wp, time: t.toFixed(1) });
      down = 1.7;
    }
  }
  return result(false, { stuck: 'out of time' });
}
