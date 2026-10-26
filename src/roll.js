import { rollSpin, turn } from 'madness-engine/physics';

/**
 * How Rock is turned as he rolls: a ball, rolling without slipping, so the
 * spin follows from how fast he goes and which way. Everything is plain
 * arrays at the physics rate, so the tests turn him the same as the screen.
 */

/** The ball the physics pushes about, in tiles. */
export const ROCK_RADIUS = 0.45;

/** The turn: which way up he is, and how fast he spins. */
export function createRoll() {
  return { q: [0, 0, 0, 1], spin: [0, 0, 0] };
}

/** One step of the turning, after the ball has moved: rolling along the ground, tumbling in the air. */
export function stepRoll(roll, ball, dt) {
  if (ball.grounded) rollSpin(ball, roll.spin);
  else for (let i = 0; i < 3; i++) roll.spin[i] *= Math.max(0, 1 - 0.25 * dt);
  turn(roll.q, roll.spin, dt);
  return roll;
}
