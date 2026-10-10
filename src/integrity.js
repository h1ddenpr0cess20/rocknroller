/**
 * Rock's integrity: how much of him is still in one piece. Every knock
 * takes some, tape puts some back, and at nothing he is shattered — unless
 * somebody has been holding a lighter up, and the crowd wants an encore.
 */

export const MAX_INTEGRITY = 100;

/** What each way of coming to grief costs him. */
export const HARM = Object.freeze({
  fell: 8,
  zapped: 14,
  crushed: 16,
  burnt: 10,
  thud: 4,
});

export function createIntegrity() {
  return { hp: MAX_INTEGRITY, max: MAX_INTEGRITY, lighters: 0 };
}

export const shattered = (rock) => rock.hp <= 0;

/** Takes `amount` off. Returns what it took. */
export function hurt(rock, amount) {
  const took = Math.min(Math.max(0, rock.hp), Math.max(0, amount));
  rock.hp -= amount;
  return took;
}

/** Tape: up to the best, no more. Returns what it put back. */
export function heal(rock, amount) {
  if (rock.hp <= 0) return 0;
  const gain = Math.min(amount, rock.max - rock.hp);
  rock.hp += gain;
  return gain;
}

/** A lighter held up, if there is one and he is done for: back up on half his integrity. Returns whether it was used. */
export function encore(rock) {
  if (rock.hp > 0 || rock.lighters < 1) return false;
  rock.lighters -= 1;
  rock.hp = Math.ceil(rock.max / 2);
  return true;
}

/** How cracked he looks, 0 (whole) to 1 (about to go). */
export const cracked = (rock) => Math.max(0, Math.min(1, 1 - rock.hp / rock.max));
