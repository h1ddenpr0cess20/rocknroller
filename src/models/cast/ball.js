import { rgb } from '../sdf.js';

/**
 * The Mirror Ball: seven hundred tiny mirrors, all of them judging. A
 * silver sphere in a grid of squares, hung on a hook and turning, with a
 * glint going over it. It floats over the crowd's heads, and a bonk off it
 * hurts like a very shiny brick. About 0.5 tiles across; a flyer, so its
 * origin is its middle.
 */

const R = 0.22;
const hash = (n) => { const s = Math.sin(n * 91.7 + 13.1) * 43758.5; return s - Math.floor(s); };

/** Squares in a grid of latitude and longitude: each its own brightness, with dark grout between. */
const facets = (p) => {
  const u = (Math.atan2(p[2], p[0]) / (Math.PI * 2) + 0.5) * 20;
  const v = (Math.acos(Math.max(-1, Math.min(1, p[1] / R))) / Math.PI) * 11;
  const iu = Math.floor(u), iv = Math.floor(v);
  const fu = u - iu, fv = v - iv;
  const grout = Math.min(fu, 1 - fu, fv, 1 - fv) < 0.07 ? 0.25 : 1;
  const t = (0.55 + 0.45 * hash(iu + iv * 31)) * grout;
  const c = rgb('#dfe6ff');
  return [c[0] * t, c[1] * t, c[2] * t];
};

export default {
  name: 'ball',
  scale: 1.5,
  cell: 0.0062,
  cells: { hook: 0.003 },
  budget: 12000,
  bones: [['root', null, [0, 0, 0]]],
  materials: {
    mirror: { roughness: 0.06, metalness: 1, emissive: '#6a72a8', emissiveIntensity: 0.65 },
    iron: { roughness: 0.4, metalness: 0.9 },
  },
  sculpt(s) {
    s.sphere([0, 0, 0], R, { color: facets, mat: 'mirror', k: 0 });
    s.part('hook', () => {
      s.torus([0, R + 0.03, 0], 0.03, 0.007, { color: '#3a3a42', mat: 'iron', k: 0.002, rot: [Math.PI / 2, 0, 0] });
      s.limb([0, R + 0.055, 0], [0, R + 0.12, 0], 0.005, 0.005, { color: '#3a3a42', mat: 'iron', k: 0.002 });
    });
  },
  animate(k, { time, seed = 0 }) {
    k.turn('root', 0, (time + seed) * 1.3, 0);
    k.move('root', 0, Math.sin((time + seed) * 2.2) * 0.012, 0);
  },
};
