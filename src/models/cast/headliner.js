import { cloth, person } from './person.js';

/**
 * The Headliner: leather trousers, bare chest under an open vest, long
 * blond hair, aviator glasses, and a flying-V guitar worn low. Has a smoke
 * machine, a pyro budget and no idea who you are. About 2.4 tiles tall; the
 * last boss.
 */

const leather = cloth('#1a1a1e', '#08080a');

export default person({
  name: 'headliner',
  scale: 2.7,
  b: 1.42,
  skin: '#e0a888',
  look: { torso: '#e0a888', sleeve: '#e0a888', cuff: '#e0a888', legs: leather, boot: '#2a1a12' },
  mats: { torso: 'skin', sleeve: 'skin', cuff: 'skin', legs: 'leather', boot: 'leather' },
  face: { eyeColor: '#3a5a8a', brow: '#c8a850', mood: 1 },
  style: {
    attack: 'smite', heavy: 1, twist: 0,
    after(k, { clip, time, seed }) {
      if (clip === 'ko' || clip === 'hit' || clip === 'attack') return;
      const T = (time + seed) * 3;
      // A rock stance: one boot forward, the strumming arm sawing, the head thrown back.
      k.turn('thighL', -0.5, 0, 0.12);
      k.turn('shinL', 0.3, 0, 0);
      k.turn('thighR', 0.15, 0, -0.2);
      k.turn('armR', -0.7 + Math.sin(T * 3) * 0.12, 0, -0.1);
      k.turn('foreR', -0.9, 0, 0);
      k.turn('armL', -1.0, 0, 0.35);
      k.turn('foreL', -0.3, 0, 0);
      k.turn('head', -0.18 + Math.sin(T) * 0.1, 0, 0);
      k.turn('chest', 0, Math.sin(T * 0.7) * 0.12, 0);
    },
  },
  extras(s, J) {
    s.part('hair', () => {
      const H = { color: cloth('#f0d070', '#b89030'), mat: 'hair', bone: 'head', k: 0.02 };
      s.ellipsoid([0, 0.71, -0.012], [0.118, 0.105, 0.118], H);
      s.flake([0.088, 0.68, -0.02], [0.11, 0.38, -0.12], [1, 0, 0], 0.04, 0.05, 0.3, H);
      s.flake([-0.088, 0.68, -0.02], [-0.11, 0.38, -0.12], [-1, 0, 0], 0.04, 0.05, 0.3, H);
      s.flake([0, 0.73, -0.1], [0, 0.34, -0.17], [0, 0, -1], 0.085, 0.09, 0.3, H);
    });
    s.part('kit', () => {
      // An open leather vest, a studded belt, aviators.
      for (const m of [1, -1]) s.ellipsoid([m * 0.07, 0.47, 0.012], [0.042, 0.08, 0.07], { color: leather, mat: 'leather', bone: 'chest', k: 0.012 });
      s.torus([0, 0.34, 0.02], 0.1, 0.014, { color: '#8a6a3a', mat: 'leather', bone: 'hips', k: 0.004 });
      s.sphere([0, 0.34, 0.116], 0.022, { color: '#e8b830', mat: 'metal', bone: 'hips', k: 0.004 });
      for (const m of [1, -1]) s.ellipsoid([m * 0.042, 0.665, 0.102], [0.034, 0.03, 0.01], { color: '#c8a050', mat: 'glass', bone: 'head', k: 0.003 });
      s.limb([-0.02, 0.675, 0.102], [0.02, 0.675, 0.102], 0.004, 0.004, { color: '#e8b830', mat: 'metal', bone: 'head', k: 0.002 });
      // The flying V: two arms of a body, a neck out to the left, a red finish and gold hardware.
      const c = [0.0, 0.3, 0.1];
      const V = { color: '#d9232f', mat: 'plastic', bone: 'chest', k: 0.01 };
      s.limb([c[0] - 0.06, c[1] - 0.12, c[2] + 0.08], [c[0] + 0.02, c[1] + 0.02, c[2]], 0.026, 0.026, V);
      s.limb([c[0] + 0.1, c[1] - 0.12, c[2] + 0.08], [c[0] + 0.02, c[1] + 0.02, c[2]], 0.026, 0.026, V);
      s.limb([c[0] + 0.02, c[1] + 0.02, c[2]], [c[0] - 0.24, c[1] + 0.2, c[2] + 0.14], 0.014, 0.012, { color: '#6a4a2a', mat: 'leather', bone: 'chest', k: 0.004 });
      s.sphere([c[0] - 0.255, c[1] + 0.21, c[2] + 0.15], 0.022, { color: '#e8b830', mat: 'metal', bone: 'chest', k: 0.004 });
      // The strap across the chest.
      s.limb([-0.09, 0.56, 0.04], [0.04, 0.34, 0.1], 0.01, 0.01, { color: '#1a1a1e', mat: 'leather', bone: 'chest', k: 0.004 });
    });
    void J;
  },
});
