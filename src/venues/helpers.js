import { HEADING } from '../venue.js';

/** A tile and a heading, as a digger's cursor wants them. */
export const pick = ([x, z], heading) => ({ x, z, heading });

/** Right across piece `p`, `along` it: where to put a speaker stack or pyro that bars the whole way. */
export const across = (p, along, opts = {}, length = 1) => {
  const [x, z, w, d] = p.span(along, length);
  return [x, z, { w, d, ...opts }];
};

/** A security gate right across piece `p`, `along` it. */
export const barred = (v, p, along) => v.gate(...p.span(along), { axis: p.dir[0] ? 'x' : 'z' });

/** A breakable panel right across piece `p`, `along` it. */
export const flat = (v, p, along, opts = {}) => v.panel(...p.span(along), { axis: p.dir[0] ? 'x' : 'z', ...opts });

/** A loop round the inside of piece `p`, `inset` tiles in from its sides, for something to go round. */
export const loop = (p, inset = 1, from = 0, to = p.length) => {
  const lo = p.lo + inset, hi = p.lo + p.width - 1 - inset;
  const a = from + inset, b = to - 1 - inset;
  return [p.tile(a, lo), p.tile(b, lo), p.tile(b, hi), p.tile(a, hi)];
};

/** The tiles of piece `p` along its back wall, `along` it, `inset` in from the wall (0 is against it). */
export const backTile = (p, along, inset = 0) => p.tile(along, p.back * (Math.floor((p.width - 1) / 2) - inset));

/** A heading's unit vector. */
export const heading = (h) => HEADING[h];
