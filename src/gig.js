import { createActors } from './actors.js';
import { createHype, earn, smashed } from './hype.js';
import { encore, heal, hurt, createIntegrity, HARM, shattered } from './integrity.js';
import { BREAK_SPEED, createBall, placeBall, PUSH, stepBall, TOP_SPEED } from './physics.js';
import { createRoll, ROCK_RADIUS, stepRoll } from './roll.js';
import { closingSpeed, resolveImpact } from './smash.js';
import { buildVenue, DEPTH, HEADING } from './venue.js';
import { loadVenue } from './venues/index.js';
import { groundAxes } from './view.js';

/**
 * One venue as it is played, without anything drawn or heard: the venue,
 * what moves and lies about in it, Rock, and the rules — what costs him
 * integrity, what he smashes and what bounces him back, what he can pick up,
 * what the floor does to him, and where he goes back to after a fall. The
 * game draws it and keeps the screens; the tests drive it with an autopilot.
 */

/** The physics runs at a fixed rate, whatever the frame rate. */
export const STEP = 1 / 120;

/** How hard Rock grips level ground when nothing pushes him: below `below` tiles a second, `rate` of his speed a second goes. */
export const GRIP = Object.freeze({ below: 1.4, rate: 6 });

/** Rev: hold it and he pushes harder and goes faster, as long as the meter lasts. */
export const REV = Object.freeze({ push: 1.5, topSpeed: 13, drain: 55, regen: 26, least: 15, max: 100 });

/** Sticky floor: he pushes less well, tops out slow, and slows by itself. */
export const STICKY = Object.freeze({ push: 0.5, topSpeed: 4.2, drag: 1.8 });

/** A belt carries whatever is on it up to this speed, as hard as this. */
export const BELT = Object.freeze({ speed: 3.4, accel: 16 });

/** A bumper throws him back at least this fast. */
export const BUMPER_SPEED = 7;

/** A push on the screen (x right, y up) as a push along the ground, for a camera turned to `yaw`. */
export function toGround({ x, y }, yaw) {
  const { right, up } = groundAxes(yaw);
  return [x * right[0] + y * up[0], x * right[1] + y * up[1]];
}

export function createGig(GFX, index, { ball = createBall({ r: ROCK_RADIUS, mass: 6 }), roll = createRoll() } = {}) {
  const venue = loadVenue(index);
  const built = buildVenue(venue);
  const killY = venue.lowest - DEPTH - 2;
  const actors = createActors(GFX, venue, built.world, { killY });
  const { x, z } = venue.start;
  const safe = [x + 0.5, venue.heightAt(x + 0.5, z + 0.5) + ball.r, z + 0.5];
  const gig = {
    index, venue, built, world: built.world, actors, killY, ball, roll,
    time: 0, safe, passes: 0, explored: new Uint8Array(venue.cols * venue.rows), lockedAt: -Infinity,
    rock: createIntegrity(), hype: createHype(), rev: REV.max, revving: false,
    stats: { foes: venue.foes.length, smashed: 0, picks: 0, records: 0, damage: 0, falls: 0 },
  };
  actors.place(0);
  placeBall(ball, ...safe);
  explore(gig);
  return gig;
}

/** Rock back on the last safe ground he rolled over. */
export function putBack(gig) {
  placeBall(gig.ball, ...gig.safe);
  gig.ball.vx = gig.ball.vy = gig.ball.vz = 0;
}

/** Marks the tiles round Rock as seen, for the map. */
function explore(gig) {
  const { venue, ball, explored } = gig;
  const cx = Math.floor(ball.x), cz = Math.floor(ball.z), r = 6;
  for (let j = cz - r; j < cz + r + 1; j++) {
    for (let i = cx - r; i < cx + r + 1; i++) {
      if (i < 0 || j < 0 || i >= venue.cols || j >= venue.rows) continue;
      if ((i - cx) ** 2 + (j - cz) ** 2 <= r * r) explored[j * venue.cols + i] = 1;
    }
  }
}

/** The unit vector from (ax, az) to (bx, bz), or `fallback` if they are one and the same. */
const unit = (ax, az, bx, bz, fallback = [0, 1]) => {
  const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
  return d < 1e-6 ? fallback : [dx / d, dz / d];
};

/** Takes `how` off Rock's integrity, and notes it. Returns what it took. */
function harm(gig, amount) {
  const took = hurt(gig.rock, amount);
  gig.stats.damage += took;
  return took;
}

/**
 * One step of everything. `push` is along the ground ([x, z]). While `live`,
 * the rules apply and the foes give chase; while `moving` is false, Rock
 * stays where he is (zapped, or squashed). `rev` is whether the rev button
 * is held.
 *
 * Returns what happened:
 *   `impact`   how hard he hit anything.
 *   `outcome`  null, 'exit', how he was lost ('fell', 'zapped', 'crushed'),
 *              or 'shattered' (no integrity, and no encore to save him).
 *   `hurt`     { how, amount } for harm that doesn't lose him (pyro, a
 *              hard landing), and for losing him too.
 *   `hits`     every person he ran into: { foe, grade, speed, damage, gain,
 *              multiplier, combo, down, dir } — `down` if they went.
 *   `picked`   whatever he picked up.
 *   `door`     'opened', 'locked' or 'sturdy' (a panel too strong for the speed).
 *   `broke`    the panels he broke.
 *   `bumped`   the bumpers he bounced off.
 *   `encore`   true if a lighter brought him back.
 */
export function stepGig(gig, push, dt = STEP, { live = true, moving = true, rev = false } = {}) {
  const ball = gig.ball;
  const venue = gig.venue;
  gig.time += dt;
  gig.actors.place(gig.time, dt);
  const touched = gig.actors.step(dt, gig.time, live && moving ? ball : null);
  const out = { impact: 0, outcome: null, hurt: null, hits: [], picked: [], door: null, broke: [], bumped: [], encore: false };
  if (!moving) return out;

  const cx0 = Math.floor(ball.x), cz0 = Math.floor(ball.z);
  const under = venue.cell(cx0, cz0);

  // Rev: the meter drains while it is held and there is some left, and fills when it isn't.
  const wasRevving = gig.revving;
  gig.revving = live && rev && (gig.rev > 0) && (wasRevving || gig.rev >= REV.least);
  gig.rev = Math.max(0, Math.min(REV.max, gig.rev + (gig.revving ? -REV.drain : REV.regen * (ball.grounded ? 1 : 0.5)) * dt));
  const options = gig.revving ? { push: PUSH * REV.push, topSpeed: REV.topSpeed } : {};

  const onFloor0 = ball.grounded && !ball.on && under;
  if (onFloor0 && under.fx === 'sticky') {
    options.push = (options.push ?? PUSH) * STICKY.push;
    options.topSpeed = Math.min(options.topSpeed ?? TOP_SPEED, gig.revving ? 6 : STICKY.topSpeed);
    const k = Math.max(0, 1 - STICKY.drag * dt);
    ball.vx *= k; ball.vz *= k;
  } else if (onFloor0 && under.fx === 'belt') {
    const [dx, dz] = HEADING[under.heading ?? '+x'];
    if (ball.vx * dx + ball.vz * dz < BELT.speed) {
      ball.vx += dx * BELT.accel * dt;
      ball.vz += dz * BELT.accel * dt;
    }
  }

  // Panels: fast enough and they are gone before he reaches them; not fast enough and they hold.
  const speed0 = Math.hypot(ball.vx, ball.vz);
  for (const g of gig.actors.doors) {
    if (g.kind !== 'panel' || !g.box.solid || g.broken >= 0) continue;
    const reach = ball.r + 0.12 + speed0 * dt * 2;
    const qx = Math.max(g.box.min[0], Math.min(ball.x, g.box.max[0]));
    const qy = Math.max(g.box.min[1], Math.min(ball.y, g.box.max[1]));
    const qz = Math.max(g.box.min[2], Math.min(ball.z, g.box.max[2]));
    const ex = qx - ball.x, ez = qz - ball.z;
    if (Math.hypot(ex, qy - ball.y, ez) > reach) continue;
    // Going at it, not just brushing past.
    const toward = speed0 > 0 ? (ball.vx * ex + ball.vz * ez) / (speed0 * (Math.hypot(ex, ez) || 1)) : 0;
    if (toward < 0.35) continue;
    if (speed0 >= g.breakAt) {
      gig.actors.breakDoor(g, gig.time);
      g.box.solid = false;
      out.broke.push(g);
      ball.vx *= 0.88; ball.vz *= 0.88;
    } else if (gig.time - gig.lockedAt > 1.5) {
      gig.lockedAt = gig.time;
      out.door = 'sturdy';
    }
  }

  const result = stepBall(ball, gig.world, push[0], push[1], dt, options);
  // A boulder doesn't coast like a marble. Let go of him on level ground and he soon stops.
  if (ball.grounded && !ball.on && Math.hypot(push[0], push[1]) < 0.05 && ball.ny > 0.97 && !(under?.fx === 'belt')) {
    const speed = Math.hypot(ball.vx, ball.vz);
    if (speed < GRIP.below) {
      const k = Math.max(0, 1 - GRIP.rate * dt);
      ball.vx *= k;
      ball.vz *= k;
    }
  }
  stepRoll(gig.roll, ball, dt);
  out.impact = result.impact;
  if (!live) return out;

  const cx = Math.floor(ball.x), cz = Math.floor(ball.z);
  const cell = venue.cell(cx, cz);
  const onFloor = ball.grounded && !ball.on && cell && ball.y - ball.r - venue.heightAt(ball.x, ball.z) < 0.2;

  const lose = (how) => {
    const amount = HARM[how];
    harm(gig, amount);
    gig.stats.falls += 1;
    out.hurt = { how, amount };
    out.outcome = how;
  };
  if (result.crushed) { lose('crushed'); return finish(gig, out); }
  if (onFloor && cell.kind === 'zap') { lose('zapped'); return finish(gig, out); }
  if (ball.y < gig.killY) { lose('fell'); return finish(gig, out); }
  if (result.landed && result.impact > BREAK_SPEED) {
    harm(gig, HARM.thud);
    out.hurt = { how: 'thud', amount: HARM.thud };
  }

  for (const s of gig.actors.spikes) {
    if (s.out < 0.5 || !onFloor) continue;
    if (cx < s.x || cz < s.z || cx >= s.x + s.w || cz >= s.z + s.d) continue;
    const cycle = Math.floor((gig.time + s.phase) / s.period);
    if (s.struck === cycle) continue;
    s.struck = cycle;
    harm(gig, HARM.burnt);
    out.hurt = { how: 'burnt', amount: HARM.burnt };
    ball.vy = 7;
    ball.grounded = false;
  }

  if (touched) hit(gig, touched, out);

  for (const b of gig.actors.bumpers) {
    const dx = ball.x - b.x, dz = ball.z - b.z, d = Math.hypot(dx, dz);
    if (d >= b.radius + ball.r || Math.abs(ball.y - ball.r - b.y) > 0.6) continue;
    const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0;
    ball.x = b.x + nx * (b.radius + ball.r);
    ball.z = b.z + nz * (b.radius + ball.r);
    const vn = ball.vx * nx + ball.vz * nz;
    if (vn < BUMPER_SPEED) {
      ball.vx += nx * (BUMPER_SPEED - vn);
      ball.vz += nz * (BUMPER_SPEED - vn);
    }
    b.hit = gig.time;
    out.bumped.push(b);
  }

  for (const p of gig.actors.pickups) {
    if (p.taken) continue;
    if (Math.hypot(p.x - ball.x, p.z - ball.z) < 0.6 && Math.abs(ball.y - ball.r - p.y) < 0.8) {
      p.taken = true;
      collect(gig, p);
      out.picked.push(p);
    }
  }

  for (const g of gig.actors.doors) {
    if (g.kind !== 'gate' || !g.box.solid || g.opening >= 0) continue;
    const qx = Math.max(g.box.min[0], Math.min(ball.x, g.box.max[0]));
    const qy = Math.max(g.box.min[1], Math.min(ball.y, g.box.max[1]));
    const qz = Math.max(g.box.min[2], Math.min(ball.z, g.box.max[2]));
    if (Math.hypot(ball.x - qx, ball.y - qy, ball.z - qz) > ball.r + 0.08) continue;
    if (gig.passes > 0) {
      gig.passes--;
      gig.actors.open(g, gig.time);
      out.door = 'opened';
    } else if (gig.time - gig.lockedAt > 2) {
      gig.lockedAt = gig.time;
      out.door = 'locked';
    }
  }

  if (ball.grounded && !ball.on && cell) {
    if (cell.kind === 'exit') out.outcome = 'exit';
    else if (venue.isSafe(cx, cz)) gig.safe = [cx + 0.5, cell.h[0] + ball.r, cz + 0.5];
  }
  explore(gig);
  return finish(gig, out);
}

/** If he has no integrity left: an encore if he has a lighter, or he is shattered. */
function finish(gig, out) {
  if (shattered(gig.rock)) {
    if (encore(gig.rock)) out.encore = true;
    else out.outcome = 'shattered';
  }
  return out;
}

/** Rock runs into `foe`: it is how fast he was going. */
function hit(gig, foe, out) {
  const ball = gig.ball;
  const velocity = gig.actors.velocityOf(foe);
  const speed = closingSpeed(ball, { x: foe.x, y: foe.y, z: foe.z, height: foe.stats.radius * 2 }, velocity);
  const result = resolveImpact({ speed, foe: foe.stats });
  const dir = unit(ball.x, ball.z, foe.x, foe.z, unit(0, 0, ball.vx, ball.vz));
  const left = gig.actors.hurt(foe, result.hits, dir, speed);
  const took = result.damage > 0 ? harm(gig, result.damage) : 0;
  const record = { foe, grade: result.grade, speed, damage: took, gain: 0, multiplier: 1, combo: 0, down: left === 0, dir };
  if (left === 0) {
    // Gone: crits count double, and one that had to be worn down counts half.
    const worn = result.grade === 'bonk' || result.grade === 'tap';
    const s = smashed(gig.hype, foe.stats.hype, gig.time, result.grade === 'crit' ? 2 : worn ? 0.5 : 1);
    Object.assign(record, s);
    gig.stats.smashed += 1;
    // Through them, a little slower.
    ball.vx *= 0.86; ball.vz *= 0.86;
  } else {
    // Bounced off: back the way he came, as hard as he came, less a little.
    const away = Math.min(7, Math.max(2.5, speed * 0.6));
    ball.vx = -dir[0] * away; ball.vz = -dir[1] * away;
    if (ball.grounded) ball.vy = Math.max(ball.vy, 1.5);
    ball.grounded = false;
  }
  out.hits.push(record);
  if (took > 0) out.hurt = out.hurt ?? { how: 'foe', amount: took };
}

function collect(gig, p) {
  if (p.kind === 'pick' || p.kind === 'case') {
    earn(gig.hype, p.amount);
    gig.hype.picks += p.kind === 'case' ? 5 : 1;
    gig.stats.picks += p.kind === 'case' ? 5 : 1;
  } else if (p.kind === 'tape') heal(gig.rock, p.amount);
  else if (p.kind === 'lighter') gig.rock.lighters += 1;
  else if (p.kind === 'pass') gig.passes += 1;
  else if (p.kind === 'record') {
    gig.stats.records += 1;
    earn(gig.hype, p.amount);
  }
}

/** The rating inputs for this venue as it stands. */
export const resultOf = (gig) => ({ smashed: gig.stats.smashed, foes: gig.stats.foes, records: gig.stats.records });
