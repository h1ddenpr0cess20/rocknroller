/**
 * Bits that fly: puffs and stars where somebody was smashed, guitar picks,
 * stone chips off Rock, sparks off pyro, glitter from a mirror ball, confetti,
 * dust when he lands hard, a glitter for a pass or a lighter, and a ring that
 * goes out from a big hit. Each bit is ballistic, bounces off the floor or
 * settles on it, and shrinks away.
 *
 * They are the engine's (`madness-engine/effects`): it throws them, lands
 * them and fades them, and makes the rings and the weather; what is thrown
 * is the game's.
 */

import { createEffects as createBits, outward } from 'madness-engine/effects';

const PICK_COLOURS = ['#ff3a8a', '#2ad0ff', '#ffd23a', '#7a4be8', '#3ae88a', '#ff7a1a', '#f5f0e6'];

export function createEffects(GFX, scene) {
  const effects = createBits(GFX, scene);
  const { spawn } = effects;

  const puff = new GFX.SphereGeometry(0.16, 12, 8);
  const smoke = new GFX.MeshStandardMaterial({ name: 'smoke', color: new GFX.Color('#c9c4d4'), roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });
  // A guitar pick: a rounded triangle, thin.
  const pickGeometry = new GFX.CylinderGeometry(0.075, 0.075, 0.014, 3);
  const picks = PICK_COLOURS.map((c) => new GFX.MeshStandardMaterial({ name: 'pick', color: new GFX.Color(c), roughness: 0.3, metalness: 0.1, emissive: new GFX.Color(c), emissiveIntensity: 0.35 }));
  const mote = new GFX.SphereGeometry(0.035, 6, 4);
  const glows = new Map();
  const glow = (colour) => {
    if (!glows.has(colour)) glows.set(colour, new GFX.MeshBasicMaterial({ name: 'glow', color: new GFX.Color(colour), toneMapped: false }));
    return glows.get(colour);
  };
  const grit = new GFX.BoxGeometry(0.05, 0.05, 0.05);
  const dirt = new GFX.MeshStandardMaterial({ name: 'grit', color: new GFX.Color('#8a8276'), roughness: 1 });
  const chip = new GFX.BoxGeometry(0.07, 0.05, 0.06);
  const granite = new GFX.MeshStandardMaterial({ name: 'chip', color: new GFX.Color('#7a746b'), roughness: 0.95, flatShading: true });
  const paper = new GFX.PlaneGeometry(0.09, 0.05);
  const paperMats = PICK_COLOURS.map((c) => new GFX.MeshBasicMaterial({ name: 'confetti', color: new GFX.Color(c), side: GFX.DoubleSide, toneMapped: false }));
  const star = new GFX.IcosahedronGeometry(0.06, 0);

  return {
    /** A new venue: nothing left flying, the bits landing on its floor, and its weather (`mood.weather`). */
    setVenue(venue, mood) {
      effects.clear();
      effects.setGround(venue);
      effects.setWeather(mood?.weather ?? null);
    },

    /** The weather, once a frame, round (x, y, z): Rock. */
    weather: effects.weather,

    /** A ring on the floor that goes out and fades. */
    ring(x, y, z, colour = '#ffffff', reach = 2) {
      effects.ring(x, y, z, { colour, reach });
    },

    /** Somebody smashed: a cloud, a spray of stars and paper, and a ring going out. */
    smash(x, y, z, { size = 1, dir = [0, 0], crit = false } = {}) {
      for (let i = 0; i < 12 * size; i++) {
        const m = new GFX.Mesh(puff, smoke);
        m.scale.setScalar((0.6 + Math.random() * 0.8) * size);
        const [ox, , oz] = outward(1.4 * size, 0);
        spawn(m, { x: x + ox * 0.2, y: y + 0.2 + Math.random() * 0.4 * size, z: z + oz * 0.2, vx: ox + dir[0] * 2, vy: 0.6 + Math.random(), vz: oz + dir[1] * 2, life: 0.8 + Math.random() * 0.5, floaty: -0.05, drag: 2.5, spin: 1, bounce: 0, grow: 1.4 });
      }
      for (let i = 0; i < (crit ? 26 : 14); i++) {
        const m = new GFX.Mesh(star, glow(i % 2 ? '#ffd23a' : '#ffffff'));
        const [ox, oy, oz] = outward(4.5, 6);
        spawn(m, { x, y: y + 0.3, z, vx: ox + dir[0] * 3, vy: oy, vz: oz + dir[1] * 3, life: 0.5 + Math.random() * 0.4, spin: 14, bounce: 0.4 });
      }
      this.confetti(x, y + 0.2, z, crit ? 36 : 18);
      this.ring(x, y, z, crit ? '#ffd23a' : '#ffffff', crit ? 3 : 2);
    },

    /** Guitar picks, flung up: what a pick pile or a road case gives. */
    picks(x, y, z, n = 8) {
      for (let i = 0; i < n; i++) {
        const m = new GFX.Mesh(pickGeometry, picks[Math.floor(Math.random() * picks.length)]);
        const [ox, oy, oz] = outward(2.2, 6);
        spawn(m, { x, y: y + 0.2, z, vx: ox, vy: oy, vz: oz, life: 1.1 + Math.random() * 0.5, spin: 16, bounce: 0.4 });
      }
    },

    confetti(x, y, z, n = 24) {
      for (let i = 0; i < n; i++) {
        const m = new GFX.Mesh(paper, paperMats[Math.floor(Math.random() * paperMats.length)]);
        const [ox, oy, oz] = outward(3, 7);
        spawn(m, { x, y, z, vx: ox, vy: oy, vz: oz, life: 1.2 + Math.random() * 0.9, spin: 18, drag: 1.2, floaty: 0.35, bounce: 0.2 });
      }
    },

    sparkle(x, y, z, colour = '#ff5a7a') {
      for (let i = 0; i < 18; i++) {
        const m = new GFX.Mesh(mote, glow(colour));
        const [ox, oy, oz] = outward(1.2, 3);
        spawn(m, { x, y: y + 0.3, z, vx: ox, vy: oy, vz: oz, life: 0.7 + Math.random() * 0.5, floaty: -0.1, drag: 1.5, bounce: 0 });
      }
    },

    sparks(x, y, z) {
      for (let i = 0; i < 20; i++) {
        const m = new GFX.Mesh(mote, glow('#ffd27a'));
        m.scale.setScalar(0.6);
        const [ox, oy, oz] = outward(4, 4);
        spawn(m, { x, y, z, vx: ox, vy: oy, vz: oz, life: 0.35 + Math.random() * 0.3, bounce: 0.5 });
      }
    },

    /** Pyro on Rock, or a zap: embers and sparks up off him. */
    embers(x, y, z, colour = '#ff7a1a') {
      for (let i = 0; i < 30; i++) {
        const m = new GFX.Mesh(mote, glow(i % 3 ? colour : '#ffd23a'));
        const [ox, , oz] = outward(0.8, 0);
        spawn(m, { x: x + ox * 0.3, y, z: z + oz * 0.3, vx: ox, vy: 1.5 + Math.random() * 2.5, vz: oz, life: 0.8 + Math.random() * 0.9, floaty: -0.12, spin: 0, bounce: 0 });
      }
    },

    /** One spark lifting off a live floor and drifting up as it dies. */
    ember(x, y, z, colour = '#7ad8ff') {
      const m = new GFX.Mesh(mote, glow(Math.random() < 0.6 ? colour : '#ffffff'));
      m.scale.setScalar(0.5 + Math.random() * 0.6);
      spawn(m, { x, y, z, vx: (Math.random() - 0.5) * 0.3, vy: 0.5 + Math.random() * 0.7, vz: (Math.random() - 0.5) * 0.3, life: 1.2 + Math.random() * 1.4, floaty: -0.05, spin: 0, bounce: 0 });
    },

    dust(x, y, z) {
      for (let i = 0; i < 14; i++) {
        const m = new GFX.Mesh(grit, dirt);
        const [ox, oy, oz] = outward(2.5, 2.5);
        spawn(m, { x, y: y + 0.05, z, vx: ox, vy: oy, vz: oz, life: 0.5 + Math.random() * 0.4, spin: 12, bounce: 0.3 });
      }
    },

    /** Chips of stone knocked off Rock. */
    chips(x, y, z, n = 10) {
      for (let i = 0; i < n; i++) {
        const m = new GFX.Mesh(chip, granite);
        m.scale.setScalar(0.6 + Math.random() * 1.1);
        const [ox, oy, oz] = outward(3.4, 4.5);
        spawn(m, { x, y, z, vx: ox, vy: oy, vz: oz, life: 0.7 + Math.random() * 0.5, spin: 14, bounce: 0.35 });
      }
    },

    update: effects.update,
  };
}
