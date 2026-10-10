import { cloth, person } from './person.js';

/**
 * The Maestro: a black tailcoat with long tails, a white bow tie, a
 * towering white wig, a stern face, and a baton he points at everything as if
 * it were an orchestra. It is not an orchestra. It is you. About 2.2 tiles
 * tall; the boss of the Opera House.
 */

const black = cloth('#16161c', '#08080c');

export default person({
  name: 'maestro',
  scale: 2.5,
  b: 1.4,
  skin: '#e8c0a4',
  look: { torso: '#f2f0ec', sleeve: black, cuff: black, legs: black, boot: '#08080a' },
  mats: { torso: 'cloth', sleeve: 'cloth', cuff: 'cloth', legs: 'cloth', boot: 'leather' },
  face: { eyeColor: '#2a4a7a', brow: '#d8d8d8', mood: 1 },
  style: {
    attack: 'thrust', heavy: 0.8, twist: 0,
    after(k, { clip, time, seed }) {
      if (clip === 'ko' || clip === 'hit' || clip === 'attack') return;
      const T = (time + seed) * 2.6;
      // Conducting: the baton hand tracing figures in the air, the other palm up.
      k.turn('armR', -1.5 + Math.sin(T) * 0.5, Math.cos(T) * 0.4, -0.3);
      k.turn('foreR', -0.8 + Math.sin(T * 2) * 0.3, 0, 0);
      k.turn('armL', -0.9, 0, 0.5);
      k.turn('foreL', -0.9 + Math.sin(T) * 0.2, 0, 0);
      k.turn('head', Math.sin(T * 0.5) * 0.1, Math.sin(T * 0.5) * 0.3, 0);
    },
  },
  extras(s, J) {
    s.part('hair', () => {
      const W = { color: '#f4f0ec', mat: 'hair', bone: 'head', k: 0.025 };
      s.ellipsoid([0, 0.74, -0.01], [0.13, 0.12, 0.125], W);
      s.sphere([0, 0.84, -0.02], 0.08, W);
      for (const m of [1, -1]) s.ellipsoid([m * 0.12, 0.62, -0.02], [0.04, 0.07, 0.05], W);
    });
    s.part('kit', () => {
      // The coat: a jacket body, long tails behind, a white bow tie and a waistcoat.
      const C = { color: black, mat: 'cloth', bone: 'chest', k: 0.02 };
      s.ellipsoid([0, 0.45, 0.0], [0.105, 0.085, 0.075], C);
      s.limb([0, 0.34, -0.06], [0, 0.1, -0.1], 0.07, 0.03, { color: black, mat: 'cloth', bone: 'hips', k: 0.02 });
      for (const m of [1, -1]) s.limb([m * 0.04, 0.34, -0.06], [m * 0.05, 0.1, -0.11], 0.04, 0.012, { color: black, mat: 'cloth', bone: 'hips', k: 0.015 });
      s.box([0, 0.505, 0.075], [0.03, 0.012, 0.006], 0.004, { color: '#ffffff', mat: 'cloth', bone: 'chest', k: 0.003 });
      // The baton: a long white stick, a little glow at the tip.
      const r = J.handR;
      s.limb([r[0], r[1] - 0.01, r[2] - 0.03], [r[0], r[1] + 0.02, r[2] + 0.28], 0.006, 0.004, { color: '#f4f0ec', mat: 'paper', bone: 'handR', k: 0.002 });
    });
    s.part('fine', () => {
      const r = J.handR;
      s.sphere([r[0], r[1] + 0.02, r[2] + 0.285], 0.009, { color: '#ffd8a0', mat: 'glow', bone: 'handR', k: 0.002 });
    });
  },
});
