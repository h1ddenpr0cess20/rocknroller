import { cloth, person } from './person.js';

/**
 * The Promoter: a white suit with the shirt open, a great many gold chains,
 * rings on every finger, dark glasses, a cigar, a pompadour, and a briefcase
 * of other people's money. Takes sixty percent. Smiles on the other forty.
 * About 2.2 tiles tall; the boss of the Club.
 */

const white = cloth('#f2efe8', '#b8b4a8');

export default person({
  name: 'promoter',
  scale: 2.5,
  b: 1.55,
  skin: '#c88c68',
  look: { torso: white, sleeve: white, cuff: white, legs: white, boot: '#d8b050' },
  mats: { torso: 'cloth', sleeve: 'cloth', cuff: 'cloth', legs: 'cloth', boot: 'leather' },
  face: { eyeColor: '#2a1a10', brow: '#120a04', mood: 0, jaw: 1.2 },
  hair: { color: cloth('#16120e', '#0a0806'), locks: [[[0, 0.79, 0.05], [0, 0.86, 0.13], 0.055], [[0, 0.8, 0.0], [0, 0.85, -0.06], 0.05]], cap: [0.112, 0.105, 0.112] },
  style: {
    attack: 'smite', heavy: 1, twist: 0,
    after(k, { clip, time, seed }) {
      if (clip === 'ko' || clip === 'hit' || clip === 'attack') return;
      const T = time + seed;
      k.turn('head', 0, Math.sin(T * 0.5) * 0.3, 0);
      k.turn('chest', Math.sin(T * 1.2) * 0.04, 0, 0);
    },
  },
  extras(s, J) {
    s.part('kit', () => {
      // Open-necked shirt, and chains: five, hanging lower each.
      for (let i = 0; i < 5; i++) s.torus([0, 0.5 - i * 0.012, 0.03], 0.062 + i * 0.012, 0.007, { color: '#e8b830', mat: 'metal', bone: 'chest', k: 0.003, rot: [0.5, 0, 0] });
      s.sphere([0, 0.42, 0.095], 0.022, { color: '#e8b830', mat: 'metal', bone: 'chest', k: 0.004 });
      // Dark glasses and a cigar, glowing.
      s.box([0, 0.668, 0.103], [0.085, 0.022, 0.01], 0.01, { color: '#08080a', mat: 'glass', bone: 'head', k: 0.004 });
      s.limb([0.02, 0.612, 0.1], [0.07, 0.6, 0.18], 0.008, 0.008, { color: '#8a5a2a', mat: 'leather', bone: 'head', k: 0.003 });
      // Rings on the fingers, and the briefcase.
      const r = J.handR;
      for (const x of [-0.012, 0.012]) s.torus([r[0] + x, r[1] + 0.012, r[2] + 0.01], 0.012, 0.004, { color: '#e8b830', mat: 'metal', bone: 'handR', k: 0.002 });
      s.box([r[0], r[1] - 0.06, r[2] + 0.04], [0.09, 0.06, 0.024], 0.01, { color: '#2a1c12', mat: 'leather', bone: 'handR', k: 0.005 });
      s.box([r[0], r[1] - 0.06, r[2] + 0.066], [0.075, 0.012, 0.002], 0.002, { color: '#e8b830', mat: 'metal', bone: 'handR', k: 0.001 });
    });
    s.part('fine', () => s.sphere([0.07, 0.6, 0.185], 0.011, { color: '#ff8a2a', mat: 'glow', bone: 'head', k: 0.002 }));
  },
});
