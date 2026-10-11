import { canvas, cached, texture, tiled } from './textures.js';

/**
 * More of what venues are furnished with (see decor.js, which these join):
 * a studio's mixing desk and rack of gear, the opera house's velvet seats and
 * grand piano, the festival's hay bales, portable loos and tents.
 */

const std = (GFX, hex, o = {}) => new GFX.MeshStandardMaterial({ color: new GFX.Color(hex), roughness: 0.6, ...o });
const glow = (GFX, hex) => new GFX.MeshBasicMaterial({ color: new GFX.Color(hex), toneMapped: false });
const shadowed = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
const place = (mesh, x, y, z) => { mesh.position.set(x, y, z); return mesh; };

/** A mixing desk, `w` tiles long: a black body, a sloped panel of faders and knobs, and a bridge of level meters that dance. */
function desk(GFX, { w = 3, d = 1, rise = 0.82 }) {
  const group = new GFX.Group();
  const body = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(w * 0.94, rise * 0.7, d * 0.8), std(GFX, '#1e1e24', { roughness: 0.5 })), 0, rise * 0.35, 0));
  const slope = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(w * 0.94, 0.06, d * 0.62), std(GFX, '#34343e', { roughness: 0.4 })), 0, rise * 0.78, 0.04));
  slope.rotation.x = -0.28;
  group.add(body, slope);
  const strips = Math.floor(w * 5);
  const faderMat = std(GFX, '#e8e8ec', { roughness: 0.3 });
  const knobMats = ['#ff3a4a', '#ffd23a', '#2de2ff', '#7cff3a'].map((c) => std(GFX, c, { roughness: 0.4 }));
  for (let i = 0; i < strips; i++) {
    const x = (i - (strips - 1) / 2) * ((w * 0.86) / strips);
    const slot = new GFX.Mesh(new GFX.BoxGeometry(0.012, 0.012, d * 0.32), std(GFX, '#0c0c10'));
    place(slot, x, rise * 0.78 + 0.044, 0.12).rotation.x = -0.28;
    const cap = new GFX.Mesh(new GFX.BoxGeometry(0.035, 0.03, 0.05), faderMat);
    place(cap, x, rise * 0.78 + 0.058, 0.04 + ((i * 37) % 11) * 0.012).rotation.x = -0.28;
    const knob = new GFX.Mesh(new GFX.CylinderGeometry(0.018, 0.018, 0.02, 8), knobMats[i % 4]);
    place(knob, x, rise * 0.78 + 0.065, -0.14).rotation.x = -0.28;
    group.add(slot, cap, knob);
  }
  // The meter bridge along the back: a bar of LEDs per channel.
  const meters = [];
  const bridge = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(w * 0.92, 0.16, 0.08), std(GFX, '#16161c')), 0, rise * 0.78 + 0.16, -d * 0.3));
  group.add(bridge);
  const channels = Math.floor(w * 3);
  for (let c = 0; c < channels; c++) {
    const x = (c - (channels - 1) / 2) * ((w * 0.84) / channels);
    for (let k = 0; k < 4; k++) {
      const led = new GFX.Mesh(new GFX.BoxGeometry(0.04, 0.024, 0.01), glow(GFX, '#3aff7a'));
      place(led, x, rise * 0.78 + 0.11 + k * 0.032, -d * 0.3 + 0.045);
      group.add(led);
      meters.push({ led, c, k });
    }
  }
  const colours = [[0.2, 1, 0.45], [0.2, 1, 0.45], [1, 0.8, 0.2], [1, 0.2, 0.2]];
  return {
    group,
    update(time, beat) {
      for (const m of meters) {
        const level = 0.5 + 0.5 * Math.sin(time * (2.3 + m.c * 0.37) + m.c) * Math.sin(beat * Math.PI + m.c * 1.3);
        const on = level * 3.6 > m.k;
        const [r, g, b] = colours[m.k];
        m.led.material.color.setRGB(on ? r : r * 0.08, on ? g : g * 0.08, on ? b : b * 0.08);
      }
    },
  };
}

/** A rack of gear: seven rack units, each with a row of LEDs that blink in time. */
function rack(GFX, { rise = 1.1 }) {
  const group = new GFX.Group();
  const frame = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(0.72, rise, 0.62), std(GFX, '#17171c', { roughness: 0.5 })), 0, rise / 2, 0));
  group.add(frame);
  const leds = [];
  const units = 7;
  for (let u = 0; u < units; u++) {
    const y = 0.1 + (u + 0.5) * ((rise - 0.16) / units);
    const plate = new GFX.Mesh(new GFX.BoxGeometry(0.62, (rise - 0.2) / units - 0.02, 0.02), std(GFX, u % 2 ? '#b8bcc4' : '#8a8e98', { metalness: 0.8, roughness: 0.35 }));
    place(plate, 0, y, 0.32);
    group.add(plate);
    for (let k = 0; k < 6; k++) {
      const led = new GFX.Mesh(new GFX.BoxGeometry(0.03, 0.02, 0.01), glow(GFX, ['#ff3a4a', '#3aff7a', '#ffb02a', '#2de2ff'][(u + k) % 4]));
      place(led, -0.22 + k * 0.085, y, 0.335);
      group.add(led);
      leds.push({ led, seed: u * 7 + k * 3 });
    }
  }
  return {
    group,
    update(time) {
      for (const l of leds) {
        const on = Math.sin(time * (3 + (l.seed % 5)) + l.seed) > -0.35;
        l.led.visible = on;
      }
    },
  };
}

/** A velvet cinema-style seat: a plump red cushion and back on a dark frame, two arms. */
function seat(GFX, { rise = 0.8 }) {
  const group = new GFX.Group();
  const velvet = std(GFX, '#9a1428', { roughness: 0.9 });
  const frame = std(GFX, '#2a1a10', { roughness: 0.5 });
  const cushion = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(0.62, 0.22, 0.58), velvet), 0, rise * 0.45, 0.04));
  const back = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(0.62, rise * 0.62, 0.14), velvet), 0, rise * 0.7, -0.24));
  const top = new GFX.Mesh(new GFX.CylinderGeometry(0.07, 0.07, 0.62, 10), velvet);
  top.rotation.z = Math.PI / 2;
  place(top, 0, rise * 0.7 + rise * 0.31, -0.24);
  const base = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(0.66, rise * 0.34, 0.6), frame), 0, rise * 0.17, 0.02));
  group.add(cushion, back, top, base);
  for (const s of [-1, 1]) group.add(shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(0.07, 0.22, 0.56), frame), s * 0.33, rise * 0.55, 0.02)));
  const brass = new GFX.Mesh(new GFX.CylinderGeometry(0.035, 0.035, 0.012, 10), std(GFX, '#e0b44a', { metalness: 1, roughness: 0.3 }));
  brass.rotation.x = Math.PI / 2;
  group.add(place(brass, 0, rise * 0.7, -0.165));
  return { group };
}

/** A grand piano, 3 × 2: glossy black, the lid propped up, a keyboard of white keys, three legs. */
function piano(GFX, { w = 3, d = 2, rise = 0.88 }) {
  const group = new GFX.Group();
  const gloss = new GFX.MeshPhysicalMaterial({ color: new GFX.Color('#0e0e12'), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
  const body = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(w * 0.92, 0.2, d * 0.9), gloss), 0, rise - 0.1, 0));
  const curve = shadowed(place(new GFX.Mesh(new GFX.CylinderGeometry(d * 0.45, d * 0.45, 0.2, 24), gloss), w * 0.46 - d * 0.45 + 0.02, rise - 0.1, 0));
  group.add(body, curve);
  const lid = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(w * 0.62, 0.03, d * 0.86), gloss), -w * 0.04, rise + 0.22, -d * 0.08));
  lid.rotation.z = 0.5;
  const prop = place(new GFX.Mesh(new GFX.CylinderGeometry(0.012, 0.012, 0.34, 6), std(GFX, '#c8c8d0', { metalness: 1 })), -w * 0.18, rise + 0.08, -d * 0.08);
  group.add(lid, prop);
  const keys = place(new GFX.Mesh(new GFX.BoxGeometry(w * 0.08, 0.03, d * 0.7), std(GFX, '#f4f0e8', { roughness: 0.3 })), -w * 0.46 + w * 0.05, rise + 0.015, 0);
  group.add(keys);
  for (let k = 0; k < 7; k++) {
    const black = new GFX.Mesh(new GFX.BoxGeometry(w * 0.045, 0.02, d * 0.03), std(GFX, '#101012'));
    group.add(place(black, -w * 0.46 + w * 0.045, rise + 0.04, (k - 3) * d * 0.09));
  }
  for (const [x, z] of [[-w * 0.38, -d * 0.36], [-w * 0.38, d * 0.36], [w * 0.3, 0]]) group.add(shadowed(place(new GFX.Mesh(new GFX.CylinderGeometry(0.05, 0.035, rise - 0.2, 8), gloss), x, (rise - 0.2) / 2, z)));
  return { group };
}

/** Straw for the hay bales' sides. */
function strawTexture(GFX) {
  return cached('straw', () => {
    const [c, ctx] = canvas(128);
    ctx.fillStyle = '#d8b050';
    ctx.fillRect(0, 0, 128, 128);
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 420; k++) {
      ctx.strokeStyle = `rgba(${150 + rnd() * 80},${110 + rnd() * 70},${30 + rnd() * 40},0.55)`;
      ctx.lineWidth = 1 + rnd() * 1.4;
      ctx.beginPath();
      const x = rnd() * 128, y = rnd() * 128;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 10);
      ctx.stroke();
    }
    return { map: texture(GFX, c, { wrap: true }) };
  });
}

/** A round hay bale on its side, strapped with two bands. */
function bale(GFX, { rise = 0.7 }) {
  const group = new GFX.Group();
  const straw = strawTexture(GFX);
  const body = shadowed(new GFX.Mesh(new GFX.CylinderGeometry(rise / 2, rise / 2, 0.86, 24), new GFX.MeshStandardMaterial({ map: tiled(GFX, straw.map, 2, 1), roughness: 0.95 })));
  body.rotation.z = Math.PI / 2;
  body.position.y = rise / 2;
  group.add(body);
  for (const x of [-0.24, 0.24]) {
    const band = new GFX.Mesh(new GFX.TorusGeometry(rise / 2 + 0.004, 0.012, 6, 28), std(GFX, '#3a6ad8'));
    band.rotation.y = Math.PI / 2;
    group.add(place(band, x, rise / 2, 0));
  }
  return { group };
}

/** A portable loo: a tall blue box with a lighter roof, a door, and an OCCUPIED lock. */
function loo(GFX, { rise = 1.3 }) {
  const group = new GFX.Group();
  const blue = std(GFX, '#2a6ad0', { roughness: 0.5 });
  const body = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(0.82, rise * 0.9, 0.82), blue), 0, rise * 0.45, 0));
  const roof = shadowed(place(new GFX.Mesh(new GFX.BoxGeometry(0.88, rise * 0.1, 0.88), std(GFX, '#e8eef8', { roughness: 0.5 })), 0, rise * 0.95, 0));
  const door = place(new GFX.Mesh(new GFX.BoxGeometry(0.58, rise * 0.7, 0.01), std(GFX, '#1e54a8', { roughness: 0.5 })), 0, rise * 0.4, 0.415);
  const lock = place(new GFX.Mesh(new GFX.BoxGeometry(0.1, 0.05, 0.012), glow(GFX, '#ff3a3a')), 0.15, rise * 0.52, 0.425);
  group.add(body, roof, door, lock);
  return { group };
}

/** A small marquee: a canvas pyramid roof on four poles, red and white. */
function tent(GFX, { w = 2, d = 2, rise = 1.4 }) {
  const group = new GFX.Group();
  const [c, ctx] = canvas(128);
  for (let k = 0; k < 8; k++) {
    ctx.fillStyle = k % 2 ? '#f4f0e4' : '#e0384a';
    ctx.fillRect(k * 16, 0, 16, 128);
  }
  const map = texture(GFX, c, { wrap: true });
  const roof = shadowed(new GFX.Mesh(new GFX.ConeGeometry(Math.max(w, d) * 0.72, rise * 0.55, 4, 1), new GFX.MeshStandardMaterial({ map, roughness: 0.9, side: GFX.DoubleSide })));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = rise * 0.72;
  group.add(roof);
  const pole = std(GFX, '#e8e8ec', { metalness: 0.6, roughness: 0.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) group.add(shadowed(place(new GFX.Mesh(new GFX.CylinderGeometry(0.03, 0.03, rise * 0.62, 6), pole), sx * (w / 2 - 0.1), rise * 0.31, sz * (d / 2 - 0.1))));
  return { group };
}

/**
 * Pallet racking over the block: orange uprights, blue beams, three levels
 * of pallets stacked with boxes, shrink-wrap and the odd flight case.
 */
function racking(GFX, { w = 1, d = 1, rise = 1.3 }) {
  const group = new GFX.Group();
  const upright = std(GFX, '#e0702a', { roughness: 0.5, metalness: 0.4 });
  const beam = std(GFX, '#2a5ab0', { roughness: 0.45, metalness: 0.5 });
  const pallet = std(GFX, '#b08a58', { roughness: 0.85 });
  const boxes = ['#c8a070', '#b89060', '#d4b080', '#2a2a30', '#e8e4dc'].map((c) => std(GFX, c, { roughness: c === '#e8e4dc' ? 0.25 : 0.8, transparent: c === '#e8e4dc', opacity: c === '#e8e4dc' ? 0.85 : 1 }));
  const long = w >= d, L = long ? w : d, S = long ? d : w;
  const height = rise + 0.9;
  const levels = [0.05, height * 0.42, height * 0.8];
  // Uprights at every tile end along it, both sides.
  const post = new GFX.BoxGeometry(0.07, height, 0.07);
  for (let i = 0; i <= L; i++) {
    for (const side of [-1, 1]) {
      const m = shadowed(new GFX.Mesh(post, upright));
      const a = i - L / 2, b = side * (S / 2 - 0.06);
      m.position.set(long ? a : b, height / 2, long ? b : a);
      group.add(m);
    }
  }
  for (const y of levels.slice(1)) {
    for (const side of [-1, 1]) {
      const m = shadowed(new GFX.Mesh(new GFX.BoxGeometry(long ? L : 0.06, 0.08, long ? 0.06 : L), beam));
      const b = side * (S / 2 - 0.06);
      m.position.set(long ? 0 : b, y, long ? b : 0);
      group.add(m);
    }
  }
  // Pallets and what is on them: a load on most bays of every level.
  let n = 0;
  for (const y of levels) {
    for (let i = 0; i < L; i++) {
      n++;
      const a = i - L / 2 + 0.5;
      const p = shadowed(new GFX.Mesh(new GFX.BoxGeometry(long ? 0.86 : S * 0.84, 0.06, long ? S * 0.84 : 0.86), pallet));
      p.position.set(long ? a : 0, y + 0.07, long ? 0 : a);
      group.add(p);
      if ((n * 5) % 7 === 3) continue;
      const tall = 0.25 + ((n * 37) % 10) / 40;
      const mat = boxes[(n * 3) % boxes.length];
      const box = shadowed(new GFX.Mesh(new GFX.BoxGeometry(long ? 0.78 : S * 0.74, tall, long ? S * 0.74 : 0.78), mat));
      box.position.set(long ? a : 0, y + 0.1 + tall / 2, long ? 0 : a);
      box.rotation.y = Math.sin(n * 4.1) * 0.05;
      group.add(box);
    }
  }
  return { group };
}

export const FURNITURE = { console: desk, rack, seat, piano, bale, loo, tent, racking };
