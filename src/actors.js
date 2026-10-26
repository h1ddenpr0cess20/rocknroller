import { createFoeMesh, FLIGHT, FOES, KNOCKED_OUT } from './foes.js';
import { createBumperMesh, createGateMesh, createLiftMesh, createPanelMesh, createPickupMesh, createPyroMesh, createSpeakerMesh } from './machinery.js';
import { collideBalls, createBall, PUSH, stepBall } from 'madness-engine/physics';

/**
 * Everything in a venue that moves or can be taken, and isn't Rock: the
 * annoying people, speaker stacks that slam down on the beat, pyro that
 * fires from the floor, lifts (platforms over the dark and down shafts),
 * security gates (a pass lifts them), flimsy panels (speed breaks them),
 * bumpers, and what lies about — picks, road cases, gaff tape, lighters,
 * passes and gold records.
 */

const CRUSHER_HEIGHT = 0.9;
const LIFT_THICKNESS = 0.5;
const DOOR_HEIGHT = 1.5;
const DOOR_THICKNESS = 0.18;

/** Further than this from Rock, a foe with nothing to do stops being simulated. */
const SLEEP = 26;

/** How far each turning pickup's model is let down to touch the floor (its lowest point, as sculpted, is above it). */
const SETTLE = Object.freeze({ tape: -0.014, pass: -0.078, record: -0.062, lighter: 0.005 });

/** Pickups that lie on the floor rather than float. */
const STILL = new Set(['pick', 'case']);

/** How long a foe that has taken a knock can't be hit again, and how hard a knock throws it. */
const GUARD = Object.freeze({ foe: 0.9, boss: 1.5 });

/** The Promoter's lunge and the Headliner's stomp: how often, from how far, how hard. */
const LUNGE = Object.freeze({ every: 4.6, reach: 7, crouch: 0.55, rush: 0.55, winded: 1.5 });
const STOMP = Object.freeze({ every: 4.2, reach: 4.5, windup: 0.6, throw: 9 });

const smooth = (t) => t * t * (3 - 2 * t);
const cycleOf = (time, period, phase) => ((((time + phase) / period) % 1) + 1) % 1;

/**
 * How far up a speaker stack is, from 0 (down on the floor) to 1 (all the
 * way up): a slow climb, a wait at the top, a slam, and a wait at the bottom.
 */
export function hammerAt(time, period, phase = 0) {
  const u = cycleOf(time, period, phase);
  if (u < 0.5) return smooth(u / 0.5);
  if (u < 0.78) return 1;
  if (u < 0.84) {
    const t = (u - 0.78) / 0.06;
    return 1 - t * t;
  }
  return 0;
}

/** How far out pyro is, 0 (quiet) to 1: a quick burst, a moment of fire, back to the pilot. */
export function spikesAt(time, period, phase = 0) {
  const u = cycleOf(time, period, phase);
  if (u < 0.6) return 0;
  if (u < 0.65) return smooth((u - 0.6) / 0.05);
  if (u < 0.85) return 1;
  if (u < 0.92) return 1 - smooth((u - 0.85) / 0.07);
  return 0;
}

/** How far the pilot light says a burst is coming, 0 to 1, in the half-beat's warning before. */
export function warningAt(time, period, phase = 0) {
  const u = cycleOf(time, period, phase);
  if (u >= 0.6 || u < 0.38) return 0;
  return smooth((u - 0.38) / 0.22);
}

/** How far along its run a lift is, 0 to 1 and back, waiting `pause` (of a period) at each end. */
export function liftAt(time, period, phase = 0, pause = 0.18) {
  const u = cycleOf(time, period, phase);
  const run = 0.5 - pause;
  if (u < pause) return 0;
  if (u < 0.5) return smooth((u - pause) / run);
  if (u < 0.5 + pause) return 1;
  return 1 - smooth((u - 0.5 - pause) / run);
}

/** Where along a closed loop of points something is, `distance` round it. */
export function alongLoop(points, distance) {
  const legs = points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    return { p, q, length: Math.hypot(q[0] - p[0], q[1] - p[1]) };
  });
  const total = legs.reduce((sum, l) => sum + l.length, 0) || 1;
  let d = ((distance % total) + total) % total;
  for (const leg of legs) {
    if (d <= leg.length) {
      const t = leg.length ? d / leg.length : 0;
      return [leg.p[0] + (leg.q[0] - leg.p[0]) * t, leg.p[1] + (leg.q[1] - leg.p[1]) * t];
    }
    d -= leg.length;
  }
  return points[0];
}

/** The highest floor under a rectangle of tiles. */
function floorUnder(venue, x, z, w, d) {
  let top = -Infinity;
  for (let j = z; j < z + d; j++) {
    for (let i = x; i < x + w; i++) {
      const c = venue.cell(i, j);
      if (c) top = Math.max(top, ...c.h);
    }
  }
  return top;
}

export function createActors(GFX, venue, world, { killY }) {
  const group = new GFX.Group();
  group.name = 'actors';

  // The people.
  const foes = venue.foes.map((m, i) => {
    const kind = FOES[m.kind];
    if (!kind) throw new Error(`${venue.name}: no such foe as ${m.kind}`);
    const look = createFoeMesh(GFX, m.kind);
    look.group.rotation.y = m.facing ?? 0;
    group.add(look.group);
    const ground = venue.heightAt(m.x, m.z) ?? 0;
    const foe = {
      ...m, i, stats: kind, look, heading: m.facing ?? 0, moving: false, dead: false, gone: false, chasing: false,
      hp: kind.hp ?? kind.toughness, flung: null, struck: 0,
      home: [m.x, ground + kind.radius, m.z], leg: 0, travelled: 0,
      x: m.x, y: ground, z: m.z,
    };
    if (kind.move === 'walk') {
      foe.ball = createBall({ x: m.x, y: ground + kind.radius, z: m.z, r: kind.radius, mass: kind.boss ? 50 : 2.5 });
      foe.ball.grounded = true;
    } else {
      if (!m.path) throw new Error(`${venue.name}: a ${m.kind} needs a path`);
      foe.flight = ground + FLIGHT;
    }
    return foe;
  });
  const walkers = foes.filter((m) => m.ball);

  // Speaker stacks, which slam down on the beat.
  const crushers = venue.crushers.map((h) => {
    const base = floorUnder(venue, h.x, h.z, h.w, h.d);
    const inset = 0.06;
    const box = {
      solid: true, kind: 'crusher', vx: 0, vy: 0, vz: 0,
      min: [h.x + inset, base, h.z + inset], max: [h.x + h.w - inset, base + CRUSHER_HEIGHT, h.z + h.d - inset],
    };
    const mesh = createSpeakerMesh(GFX, { w: h.w - inset * 2, d: h.d - inset * 2, height: CRUSHER_HEIGHT, venue });
    group.add(mesh.group);
    return { ...h, base, box, mesh: mesh.group, look: mesh, up: 0 };
  });

  // Pyro: a vent in the floor with a pilot light, bursting into flame on the beat.
  const spikes = venue.spikes.map((s) => {
    const base = floorUnder(venue, s.x, s.z, s.w, s.d);
    const look = createPyroMesh(GFX, { x: s.x, z: s.z, w: s.w, d: s.d, venue });
    group.add(look.group);
    return { ...s, base, mesh: look.group, look, out: 0, warn: 0, struck: -1 };
  });

  // Lifts.
  const lifts = venue.lifts.map((l) => {
    const look = createLiftMesh(GFX, { w: l.w, d: l.d, thickness: LIFT_THICKNESS, style: l.style ?? venue.look.lift ?? 'riser', venue });
    group.add(look.group);
    const box = {
      solid: true, kind: 'lift', vx: 0, vy: 0, vz: 0,
      min: [l.x, l.h - LIFT_THICKNESS, l.z], max: [l.x + l.w, l.h, l.z + l.d],
    };
    return { ...l, box, mesh: look.group, look };
  });

  // Gates (a pass lifts them) and panels (speed breaks them).
  const doors = venue.doors.map((g) => {
    const base = floorUnder(venue, g.x, g.z, g.w, g.d);
    const across = g.axis === 'x' ? 'z' : 'x';
    const cx = g.x + g.w / 2, cz = g.z + g.d / 2;
    const span = across === 'x' ? g.w : g.d;
    const box = {
      solid: true, kind: 'door', vx: 0, vy: 0, vz: 0,
      min: across === 'x' ? [g.x, base, cz - DOOR_THICKNESS / 2] : [cx - DOOR_THICKNESS / 2, base, g.z],
      max: across === 'x' ? [g.x + g.w, base + DOOR_HEIGHT, cz + DOOR_THICKNESS / 2] : [cx + DOOR_THICKNESS / 2, base + DOOR_HEIGHT, g.z + g.d],
    };
    const make = g.kind === 'panel' ? createPanelMesh : createGateMesh;
    const look = make(GFX, { span, height: DOOR_HEIGHT, thickness: DOOR_THICKNESS, across, venue, look: g.look });
    group.add(look.group);
    return { ...g, base, box, mesh: look.group, look, opening: -1, broken: -1, centre: [cx, base, cz] };
  });

  // Bumpers.
  const bumpers = venue.bumpers.map((b) => {
    const ground = venue.heightAt(b.x, b.z) ?? 0;
    const look = createBumperMesh(GFX, { radius: b.radius, look: b.look, venue });
    look.group.position.set(b.x, ground, b.z);
    group.add(look.group);
    return { ...b, y: ground, look, hit: -10 };
  });

  // Props that can be smashed: a box over each, solid until Rock comes at it hard enough.
  const props = venue.props.filter((p) => p.breakAt).map((p) => ({
    spec: p, breakAt: p.breakAt, broken: -1, centre: [p.x + p.w / 2, p.base, p.z + p.d / 2],
    box: {
      solid: true, kind: 'prop', vx: 0, vy: 0, vz: 0,
      min: [p.x + 0.04, p.base, p.z + 0.04], max: [p.x + p.w - 0.04, p.base + Math.max(0.6, p.rise), p.z + p.d - 0.04],
    },
  }));

  world.boxes = [...crushers.map((h) => h.box), ...lifts.map((l) => l.box), ...doors.map((g) => g.box), ...props.map((p) => p.box)];

  // What lies about: each set down as soon as its model is baked (or at once, as a stand-in).
  const pickups = venue.pickups.map((p, i) => {
    const mesh = new GFX.Group();
    const spin = new GFX.Group();
    mesh.add(spin);
    const look = createPickupMesh(GFX, p.kind, { amount: p.amount });
    spin.add(look.group);
    // Cases and picks sit where they were left, at whatever angle; the rest float and turn.
    if (STILL.has(p.kind)) spin.rotation.y = (i * 2.399963) % (Math.PI * 2);
    const ground = venue.heightAt(p.x, p.z) ?? 0;
    mesh.position.set(p.x, ground, p.z);
    group.add(mesh);
    return { ...p, y: ground, mesh, spin, taken: false };
  });

  const moveBox = (box, x, y, z, dt) => {
    if (dt > 0) {
      box.vx = (x - box.min[0]) / dt;
      box.vy = (y - box.min[1]) / dt;
      box.vz = (z - box.min[2]) / dt;
    }
    const sx = box.max[0] - box.min[0], sy = box.max[1] - box.min[1], sz = box.max[2] - box.min[2];
    box.min[0] = x; box.min[1] = y; box.min[2] = z;
    box.max[0] = x + sx; box.max[1] = y + sy; box.max[2] = z + sz;
  };

  /** What just happened that the game should hear: a stack coming down, pyro firing. */
  const events = [];

  /** Puts the kinematic things where they are at `time`. */
  function place(time, dt = 0) {
    for (const h of crushers) {
      const up = hammerAt(time, h.period, h.phase);
      if (h.up > 0.95 && up <= 0.95) events.push({ type: 'slam', x: h.x + h.w / 2, y: h.base, z: h.z + h.d / 2 });
      h.up = up;
      moveBox(h.box, h.box.min[0], h.base + h.lift * up, h.box.min[2], dt);
    }
    for (const l of lifts) {
      const s = liftAt(time, l.period, l.phase, l.pause);
      moveBox(l.box, l.x + l.to[0] * s, l.h - LIFT_THICKNESS + l.to[1] * s, l.z + l.to[2] * s, dt);
    }
    for (const g of doors) {
      let up = 0;
      if (g.opening >= 0) up = smooth(Math.min(1, (time - g.opening) / 0.9));
      else if (g.broken >= 0) up = 1;
      moveBox(g.box, g.box.min[0], g.base + up * (DOOR_HEIGHT + 0.2), g.box.min[2], dt);
      if (up >= 1) g.box.solid = false;
    }
    for (const s of spikes) {
      const was = s.out;
      s.out = spikesAt(time, s.period, s.phase);
      s.warn = warningAt(time, s.period, s.phase);
      if (was < 0.5 && s.out >= 0.5) events.push({ type: 'burst', x: s.x + s.w / 2, y: s.base, z: s.z + s.d / 2 });
    }
  }
  place(0);
  events.length = 0;

  /**
   * What a boss's tactic does to how it moves this step: a multiple of its
   * push and its top speed (0 holds it still). A stomp lands here too: Rock
   * is thrown back from it, and the game hears of it.
   */
  function tactic(m, b, rock, toRock, time) {
    const how = m.stats.tactic;
    if (!how || !m.chasing) return { push: 1, top: 1 };
    if (how === 'lunge') {
      if (time - (m.lungeAt ?? -99) > LUNGE.every && toRock < LUNGE.reach) m.lungeAt = time;
      const t = time - m.lungeAt;
      // A crouch, the rush, and then he has to get his breath back: that is the time to hit him.
      if (t < LUNGE.crouch) return { push: 1, top: 0 };
      if (t < LUNGE.crouch + LUNGE.rush) return { push: 4, top: 2.8 };
      if (t < LUNGE.crouch + LUNGE.rush + LUNGE.winded) return { push: 1, top: 0.25 };
      return { push: 1, top: 1 };
    }
    if (how === 'tempo') {
      const beat = (time * venue.tempo) / 60;
      const u = beat - Math.floor(beat);
      return { push: 3, top: 0.1 + 1.9 * Math.pow(1 - u, 4) };
    }
    if (how === 'stomp') {
      if (m.stompAt === undefined && toRock < STOMP.reach && time - (m.stompedAt ?? -99) > STOMP.every) m.stompAt = time;
      if (m.stompAt === undefined) return { push: 1, top: 1 };
      if (time - m.stompAt < STOMP.windup) return { push: 1, top: 0 };
      // Down it comes: everything near enough is thrown back, the nearer the harder.
      m.stompAt = undefined;
      m.stompedAt = time;
      events.push({ type: 'stomp', x: b.x, y: b.y - m.stats.radius, z: b.z });
      if (rock && toRock < STOMP.reach && Math.abs(rock.y - b.y) < 1.6) {
        const k = 1 - toRock / STOMP.reach;
        const dx = (rock.x - b.x) / (toRock || 1), dz = (rock.z - b.z) / (toRock || 1);
        rock.vx += dx * STOMP.throw * k;
        rock.vz += dz * STOMP.throw * k;
        rock.vy += 2.5 * k;
      }
      return { push: 1, top: 0 };
    }
    return { push: 1, top: 1 };
  }

  /** Is the ground ahead of a walker, going (dx, dz), somewhere it would go? */
  const footing = (b, dx, dz) => {
    const here = venue.heightAt(b.x, b.z);
    for (const reach of [0.45, 0.8]) {
      const x = b.x + dx * reach, z = b.z + dz * reach;
      const c = venue.cell(Math.floor(x), Math.floor(z));
      if (!c) return false;
      if (c.kind === 'zap') return false;
      const h = venue.heightAt(x, z);
      if (here !== null && h < here - 1.1) return false;
    }
    return true;
  };

  /** The foe, thrown clear: up and away along `dir` ([x, z], unit), as hard as `speed`. */
  function fling(foe, dir, speed) {
    const away = 3.5 + speed * 0.9;
    const x = foe.x, y = foe.y + foe.stats.radius, z = foe.z;
    foe.flung = {
      x, y, z, vx: dir[0] * away, vy: 4.5 + speed * 0.45, vz: dir[1] * away,
      axis: [-dir[1], dir[0]], turned: 0, rate: 7 + speed * 0.6, bounced: 0, t: 0, ground: venue.heightAt(x, z) ?? foe.y,
    };
  }

  return {
    group, foes, crushers, spikes, lifts, doors, pickups, bumpers, props,
    place,
    /** Takes the events since last asked. */
    drain() { return events.splice(0); },

    /**
     * One physics step for every foe. `rock` is Rock's ball, or null while
     * there isn't one to chase. Returns the foe Rock has run into, if any.
     */
    step(dt, time, rock) {
      let touched = null;
      for (const m of foes) {
        if (m.gone) continue;
        if (m.dead) {
          // Sent flying: up, over, and down.
          const f = m.flung;
          if (f) {
            f.t += dt;
            f.vy -= 18 * dt;
            f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
            f.turned += f.rate * dt;
            const ground = venue.heightAt(f.x, f.z);
            if (ground !== null) f.ground = ground;
            if (f.y < f.ground + 0.2 && f.vy < 0) {
              f.y = f.ground + 0.2;
              f.vy = f.bounced++ < 1 ? -f.vy * 0.3 : 0;
              f.vx *= 0.5; f.vz *= 0.5; f.rate *= 0.5;
            }
            m.x = f.x; m.y = f.y - 0.2; m.z = f.z;
            if (f.y < killY) m.gone = true;
          }
          continue;
        }
        if (m.guard > 0) m.guard -= dt;
        const open = !(m.guard > 0);
        const kind = m.stats;
        if (m.ball) {
          const b = m.ball;
          const toRock = rock ? Math.hypot(rock.x - b.x, rock.z - b.z) : Infinity;
          const fromHome = rock ? Math.hypot(rock.x - m.home[0], rock.z - m.home[2]) : Infinity;
          m.chasing = rock !== null && toRock < m.range && fromHome < m.range + 1.5 && Math.abs(rock.y - b.y) < 1.6;
          let tx = m.home[0], tz = m.home[2];
          if (m.chasing) { tx = rock.x; tz = rock.z; }
          else if (m.path) {
            const [px, pz] = m.path[m.leg % m.path.length];
            if (Math.hypot(px - b.x, pz - b.z) < 0.4) m.leg++;
            [tx, tz] = m.path[m.leg % m.path.length];
          }
          const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
          const idle = !m.chasing && !m.path && d < 0.5;
          const still = b.grounded && Math.hypot(b.vx, b.vz) < 0.05;
          if (idle && still && toRock > SLEEP) { m.moving = false; continue; }
          let ax = 0, az = 0;
          if (d > (m.chasing ? 1e-3 : 0.3)) {
            ax = dx / d; az = dz / d;
            // The drunk don't go in a line.
            if (kind.wobble) {
              const sway = Math.sin(time * 2.3 + m.i * 1.7) * 0.9 * kind.wobble;
              const bx = ax - az * sway, bz = az + ax * sway;
              const l = Math.hypot(bx, bz) || 1;
              ax = bx / l; az = bz / l;
            }
            if (!footing(b, ax, az)) {
              // Not off the edge: brake instead.
              const v = Math.hypot(b.vx, b.vz);
              ax = v > 1e-3 ? -b.vx / v : 0;
              az = v > 1e-3 ? -b.vz / v : 0;
            }
          }
          const { push, top } = tactic(m, b, rock, toRock, time);
          if (top === 0) { ax = 0; az = 0; }
          stepBall(b, world, ax, az, dt, { push: PUSH * 0.6 * push, topSpeed: kind.speed * top });
          if (Math.hypot(b.vx, b.vz) > 0.15) m.heading = Math.atan2(b.vx, b.vz);
          m.moving = Math.hypot(b.vx, b.vz) > 0.3;
          m.x = b.x; m.y = b.y - kind.radius; m.z = b.z;
          if (b.y < killY) m.gone = true;
          if (rock && !touched && open) {
            const reach = rock.r + kind.radius + 0.02;
            const ex = rock.x - b.x, ey = rock.y - b.y, ez = rock.z - b.z;
            if (ex * ex + ey * ey + ez * ez < reach * reach) touched = m;
          }
        } else {
          m.travelled += kind.speed * dt;
          const [x, z] = alongLoop(m.path, m.travelled);
          const [nx, nz] = alongLoop(m.path, m.travelled + 0.05);
          if (Math.hypot(nx - x, nz - z) > 1e-6) m.heading = Math.atan2(nx - x, nz - z);
          m.vx = (nx - x) / 0.05 * kind.speed; m.vz = (nz - z) / 0.05 * kind.speed;
          m.x = x; m.z = z;
          m.moving = true;
          if (kind.move === 'fly') m.y = m.flight;
          else m.y = venue.heightAt(x, z) ?? m.y;
          if (rock && !touched && open) {
            const centre = kind.move === 'fly' ? m.y : m.y + 0.2;
            const flat = Math.hypot(rock.x - x, rock.z - z);
            if (flat < rock.r + kind.radius * (kind.move === 'fly' ? 1 : 0.8) && Math.abs(rock.y - centre) < 0.7) touched = m;
          }
        }
      }
      for (let i = 0; i < walkers.length; i++) {
        const a = walkers[i];
        if (a.dead || a.gone) continue;
        for (let j = i + 1; j < walkers.length; j++) {
          const b = walkers[j];
          if (!b.dead && !b.gone) collideBalls(a.ball, b.ball, 0.5);
        }
      }
      return touched;
    },

    /** How the foe is moving: [vx, vy, vz], for working out how hard it was hit. */
    velocityOf(foe) {
      if (foe.ball) return [foe.ball.vx, foe.ball.vy, foe.ball.vz];
      return [foe.vx ?? 0, 0, foe.vz ?? 0];
    },

    /**
     * The foe takes `hits` off what it has. If that is all of it, it is
     * beaten and flung away along `dir` ([x, z]) as hard as `speed`, and
     * this returns 0; if not, it is knocked back and given a moment to itself
     * before it can be hit again, and this returns what it has left.
     */
    hurt(foe, hits, dir = [0, 1], speed = 4) {
      foe.hp -= hits;
      if (foe.hp > 0) {
        foe.guard = foe.stats.boss ? GUARD.boss : GUARD.foe;
        foe.struck += 1;
        if (foe.ball) {
          foe.ball.vx += dir[0] * (2 + speed * 0.35) / foe.ball.mass * 2.5;
          foe.ball.vz += dir[1] * (2 + speed * 0.35) / foe.ball.mass * 2.5;
        }
        return foe.hp;
      }
      this.defeat(foe, dir, speed);
      return 0;
    },

    /** The foe is beaten: flung away (see `sync`), and gone from the venue. */
    defeat(foe, dir = [0, 1], speed = 4) {
      foe.dead = true;
      foe.hp = 0;
      foe.downAt = null;
      if (dir) fling(foe, dir, speed);
    },

    /** Lift a gate, from `time`. */
    open(door, time) {
      if (door.opening < 0) door.opening = time;
    },

    /** A prop is smashed, from `time`: nothing to hit there any more. */
    smashProp(p, time) {
      if (p.broken >= 0) return;
      p.broken = time;
      p.spec.broken = time;
      p.box.solid = false;
    },

    /** A panel gives way, from `time`. */
    breakDoor(door, time) {
      if (door.broken < 0) door.broken = time;
    },

    /**
     * Meshes to match the state, once a frame. Only the foes within `reach`
     * of `focus` (where Rock is) move their limbs: the rest keep their last
     * pose, out of sight or nearly.
     */
    sync(dt, time, { focus = null, reach = 15 } = {}) {
      for (const m of foes) {
        const g = m.look.group;
        const f = m.flung;
        if (m.dead && m.downAt === null) m.downAt = time;
        g.visible = !m.gone && (!m.dead || time - m.downAt < KNOCKED_OUT);
        if (!g.visible) continue;
        if (f) {
          // Tumbling end over end about its middle as it flies.
          const mid = m.stats.radius * 1.1;
          g.position.set(m.x, m.y + mid, m.z);
          m.look.body.position.y = -mid;
          g.rotation.set(f.axis[0] * f.turned * 0.9, g.rotation.y, f.axis[1] * f.turned * 0.9);
          m.look.animate(time + m.i * 1.37, false, { down: true });
          continue;
        }
        g.position.set(m.x, m.y, m.z);
        // Turn to face the way it goes, the short way round.
        let turn = m.heading - g.rotation.y;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        g.rotation.y += turn * Math.min(1, dt * 8);
        if (focus && Math.hypot(m.x - focus.x, m.z - focus.z) > reach) continue;
        const striking = !m.dead && focus !== null && Math.hypot(m.x - focus.x, m.z - focus.z) < m.stats.radius + 1;
        m.look.animate(time + m.i * 1.37, m.moving && !m.dead, { chasing: m.chasing, striking, down: m.dead });
      }
      for (const h of crushers) {
        h.mesh.position.set((h.box.min[0] + h.box.max[0]) / 2, (h.box.min[1] + h.box.max[1]) / 2, (h.box.min[2] + h.box.max[2]) / 2);
        h.look.update?.(hammerAt(time, h.period, h.phase), time);
      }
      for (const s of spikes) s.look.update(s.out, s.warn, time, s.base);
      for (const l of lifts) {
        l.mesh.position.set((l.box.min[0] + l.box.max[0]) / 2, (l.box.min[1] + l.box.max[1]) / 2, (l.box.min[2] + l.box.max[2]) / 2);
        l.look.update?.(time);
      }
      for (const g of doors) {
        g.mesh.position.set(g.centre[0], (g.box.min[1] + g.box.max[1]) / 2, g.centre[2]);
        g.mesh.visible = !(g.broken >= 0 && g.kind === 'panel' && g.box.min[1] > g.base + 0.01 && !g.box.solid);
        g.look.update?.(time, g.broken >= 0 ? time - g.broken : -1);
      }
      for (const b of bumpers) b.look.update?.(time - b.hit);
      for (const [i, p] of pickups.entries()) {
        p.mesh.visible = !p.taken;
        if (p.taken) continue;
        if (STILL.has(p.kind)) continue;
        // Standing on the floor and turning, not hanging in the air.
        p.spin.position.y = SETTLE[p.kind] ?? 0;
        p.spin.rotation.y = time * 1.6 + i;
      }
    },
  };
}
