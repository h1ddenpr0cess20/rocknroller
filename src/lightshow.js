import { canvas, cached, copyOf, glowTexture, random, texture } from './textures.js';

/**
 * The light show. Every venue is lit by a rig, and the rig keeps the beat:
 *
 *   bulb     a caged bulb: warm, steady, with a little flicker.
 *   par      a PAR can: a coloured wash and a shaft of haze, changing colour
 *            on the beat (`program`: 'chase', 'pulse', 'rainbow', 'static').
 *   spot     a moving head: a beam and a pool of light that wander the floor.
 *   strobe   flashes white on the beat. Never more than three times a
 *            second, and where `flashing` is off it only glows.
 *   ball     a mirror ball: it turns, and throws a field of sparkles across
 *            the floor, in colours that chase.
 *   laser    a fan of thin beams, sweeping.
 *   chandelier  crystal and candle-bulbs on brass arms, hung high: warm,
 *            steady, glittering a little as it sways.
 *   festoon  a string of bulbs slung between two points (`to`, an offset
 *            in tiles), sagging, the bulbs taking turns in `colors`.
 *   neon     a neon sign: a word in tube, flickering.
 *
 * Each draws its own meshes (additive, so they glow), and gives lights: the
 * few nearest Rock get real ones (the stage owns a fixed number), and the
 * rest are baked into the floor (`venue.js`).
 *
 * `createLightshow(GFX, venue)` gives { group, update(frame), flash }; call
 * `update({ time, beat, rock, lights, flashing })` each frame with the beat
 * (a number of beats from the downbeat), where Rock is, and the stage's
 * fixture lights to set.
 */

/** The most flashes a second a strobe makes. */
export const STROBE_MAX_HZ = 3;

/** A colour as [r, g, b] each 0–1, linear enough for lights. */
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};
const mixRGB = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The colour a fixture shows at `beat`: it steps through its `colors`, one
 * every `every` beats (`shift` of them out of step with the rest), fading
 * across the step in the last tenth of it.
 */
export function colorAt(f, beat) {
  const colors = f.colors.map(rgb);
  if (colors.length === 1 || f.program === 'static') return colors[0];
  if (f.program === 'rainbow') {
    const h = ((beat / (f.every ?? 8)) + (f.shift ?? 0) * 0.17) % 1;
    const k = h * 6, i = Math.floor(k), t = k - i;
    const [r, g, b] = [[1, t, 0], [1 - t, 1, 0], [0, 1, t], [0, 1 - t, 1], [t, 0, 1], [1, 0, 1 - t]][i % 6];
    return [r, g, b];
  }
  const step = beat / (f.every ?? 2) + (f.shift ?? 0);
  const i = Math.floor(step), t = smooth(0.85, 1, step - i);
  const n = colors.length;
  return mixRGB(colors[((i % n) + n) % n], colors[(((i + 1) % n) + n) % n], t);
}

/** How bright a fixture is at `beat`: `pulse` kicks on every beat and dies away; the rest are steady. */
export function levelAt(f, beat) {
  if (f.program === 'pulse') {
    const u = ((beat % 1) + 1) % 1;
    return 0.35 + 0.65 * Math.pow(1 - u, 2.2);
  }
  return 1;
}

/**
 * Whether a strobe is flashing at `beat`, and how bright: eight bars on, in
 * bursts of four beats, one flash a beat (or one a bar beat in two, if the
 * tempo would make it more than `STROBE_MAX_HZ`). Returns 0 to 1.
 */
export function strobeAt(f, beat, tempo, flashing = true) {
  if (!flashing) return 0;
  const every = tempo / 60 > STROBE_MAX_HZ ? 2 : 1;
  const cycle = f.cycle ?? 16, on = f.on ?? 4;
  const phase = (((beat + (f.shift ?? 0)) % cycle) + cycle) % cycle;
  if (phase >= on) return 0;
  const u = (phase / every) % 1;
  // A flash: instant on, gone in under a tenth of a second at 120 beats a minute.
  return u < 0.14 ? 1 - u / 0.14 : 0;
}

// ———————————————————————————————————————————————————————————— textures

/** A shaft of light: bright at the lens, fading to nothing along it (v), and soft at the sides (u). */
function beamTexture(GFX) {
  return cached('beam', () => {
    const [c, ctx] = canvas(64, 128);
    const g = ctx.createLinearGradient(0, 128, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 128);
    return { map: texture(GFX, c), bump: null };
  });
}

/** The sparkles a mirror ball throws: a field of small bright squares, thinning out toward the edge. */
function sparkleTexture(GFX, seed) {
  return cached(`sparkle:${seed}`, () => {
    const size = 512;
    const [c, ctx] = canvas(size);
    const rnd = random(seed * 977 + 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    const mid = size / 2;
    for (let k = 0; k < 900; k++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * mid * 0.96;
      const edge = (1 - (r / mid) ** 2) ** 1.6;
      if (rnd() > edge) continue;
      const w = 1.4 + rnd() * 2.6;
      const x = mid + Math.cos(a) * r, y = mid + Math.sin(a) * r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd() * 3);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`;
      ctx.fillRect(-w / 2, -w / 2, w, w * (0.7 + rnd() * 0.6));
      ctx.restore();
    }
    return { map: texture(GFX, c, { wrap: true }), bump: null };
  });
}

/** A word in neon tube: bright letters with a glow round them, on nothing. */
function neonTexture(GFX, text, colour) {
  return cached(`neon:${text}:${colour}`, () => {
    const h = 128, w = Math.max(160, Math.round(text.length * 78 + 60));
    const [c, ctx] = canvas(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '700 84px "Anton", Impact, "Arial Narrow", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.shadowColor = colour;
    for (const [blur, alpha] of [[30, 0.8], [16, 0.9], [6, 1]]) {
      ctx.shadowBlur = blur;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 5;
      ctx.globalAlpha = alpha;
      ctx.strokeText(text, w / 2, h / 2);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.strokeText(text, w / 2, h / 2);
    return { map: texture(GFX, c), bump: null, aspect: w / h };
  });
}

// ———————————————————————————————————————————————————————————— the rig

export function createLightshow(GFX, venue) {
  const group = new GFX.Group();
  group.name = 'lightshow';
  const glow = glowTexture(GFX).map;
  const beamMap = beamTexture(GFX).map;
  const additive = { transparent: true, blending: GFX.AdditiveBlending, depthWrite: false, toneMapped: false };
  const tempo = venue.tempo;
  const iron = new GFX.MeshStandardMaterial({ name: 'rig-iron', color: new GFX.Color('#25252b'), roughness: 0.45, metalness: 0.85 });
  const heightOf = (x, z) => venue.heightAt(x, z) ?? venue.lowest;
  const rig = venue.look.rig ?? {};
  const defaults = { colors: rig.colors ?? ['#ff3a8a', '#2ad0ff'], program: rig.program ?? 'chase', every: rig.every ?? 2 };

  /** What every fixture offers the stage's lights: where, what colour, how bright, how far it carries. */
  const sources = [];

  const halo = (colour, size) => {
    const m = new GFX.SpriteMaterial({ map: glow, color: new GFX.Color(...colour), opacity: 0.8, ...additive });
    const s = new GFX.Sprite(m);
    s.scale.set(size, size, 1);
    return s;
  };
  const tint = (material, colour, k = 1) => material.color.setRGB(colour[0] * k, colour[1] * k, colour[2] * k);

  /** A cone of light from `from` down to `to`, wider at the foot. */
  const beam = (angle, colour) => {
    const geometry = new GFX.ConeGeometry(1, 1, 20, 1, true);
    geometry.translate(0, -0.5, 0);
    const material = new GFX.MeshBasicMaterial({ map: beamMap, color: new GFX.Color(...colour), side: GFX.DoubleSide, opacity: 0.55, ...additive });
    const mesh = new GFX.Mesh(geometry, material);
    mesh.frustumCulled = false;
    const up = new GFX.Vector3(0, -1, 0), d = new GFX.Vector3();
    return {
      mesh, material,
      aim(from, to) {
        d.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
        const len = d.length() || 1;
        mesh.position.set(from[0], from[1], from[2]);
        mesh.quaternion.setFromUnitVectors(up, d.divideScalar(len));
        mesh.scale.set(len * Math.tan(angle), len, len * Math.tan(angle));
      },
    };
  };

  /** A pool of light on the floor. */
  const pool = (colour) => {
    const material = new GFX.MeshBasicMaterial({ map: glow, color: new GFX.Color(...colour), opacity: 0.7, ...additive });
    const mesh = new GFX.Mesh(new GFX.CircleGeometry(1, 28), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.frustumCulled = false;
    return { mesh, material };
  };

  const fixtures = [];

  const add = (spec) => {
    const f = { ...defaults, ...spec };
    const make = { bulb, par, spot, strobe, ball, laser, neon, chandelier, festoon }[f.kind];
    if (!make) throw new Error(`${venue.name}: no such light as ${f.kind}`);
    const made = make(f);
    if (made) fixtures.push(made);
  };

  // ——— a chandelier: a brass hoop in two tiers of arms, candle bulbs on them, crystal drops hanging below.
  function chandelier(f) {
    const y = heightOf(f.x, f.z);
    const high = f.height ?? 3.2;
    const centre = [f.x, y + high, f.z];
    const colour = rgb(f.color ?? '#ffd59a');
    const brass = new GFX.MeshStandardMaterial({ name: 'chandelier-brass', color: new GFX.Color('#c89a48'), roughness: 0.3, metalness: 0.95 });
    const crystal = new GFX.MeshStandardMaterial({ name: 'chandelier-crystal', color: new GFX.Color('#f4f0ff'), roughness: 0.05, metalness: 0.4, emissive: new GFX.Color(...colour), emissiveIntensity: 0.6, flatShading: true });
    const flame = new GFX.MeshBasicMaterial({ color: new GFX.Color(colour[0] * 1.3, colour[1] * 1.2, colour[2]), toneMapped: false });
    const g = new GFX.Group();
    g.position.set(...centre);
    const chain = new GFX.Mesh(new GFX.CylinderGeometry(0.015, 0.015, 6, 6), brass);
    chain.position.y = 3.3;
    const stem = new GFX.Mesh(new GFX.CylinderGeometry(0.05, 0.09, 0.6, 10), brass);
    const bowl = new GFX.Mesh(new GFX.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), brass);
    bowl.position.y = -0.3;
    g.add(chain, stem, bowl);
    const drops = [];
    const tier = (radius, at, n) => {
      const ring = new GFX.Mesh(new GFX.TorusGeometry(radius, 0.022, 6, 32), brass);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = at;
      g.add(ring);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const cx = Math.cos(a) * radius, cz = Math.sin(a) * radius;
        const cup = new GFX.Mesh(new GFX.CylinderGeometry(0.05, 0.035, 0.05, 8), brass);
        cup.position.set(cx, at + 0.04, cz);
        const candle = new GFX.Mesh(new GFX.CylinderGeometry(0.022, 0.022, 0.14, 6), new GFX.MeshStandardMaterial({ color: '#f6f0e4', roughness: 0.6 }));
        candle.position.set(cx, at + 0.13, cz);
        const bulbMesh = new GFX.Mesh(new GFX.SphereGeometry(0.035, 8, 6), flame);
        bulbMesh.scale.y = 1.5;
        bulbMesh.position.set(cx, at + 0.24, cz);
        const drop = new GFX.Mesh(new GFX.IcosahedronGeometry(0.045, 0), crystal);
        drop.scale.y = 1.8;
        drop.position.set(cx, at - 0.12, cz);
        g.add(cup, candle, bulbMesh, drop);
        drops.push(drop);
      }
      // Swags of crystal between the arms.
      for (let i = 0; i < n * 2; i++) {
        const a = ((i + 0.5) / (n * 2)) * Math.PI * 2;
        const bead = new GFX.Mesh(new GFX.IcosahedronGeometry(0.025, 0), crystal);
        bead.position.set(Math.cos(a) * radius * 0.92, at - 0.07, Math.sin(a) * radius * 0.92);
        g.add(bead);
        drops.push(bead);
      }
    };
    tier(0.62, -0.2, 8);
    tier(0.36, 0.12, 6);
    const tip = new GFX.Mesh(new GFX.IcosahedronGeometry(0.09, 0), crystal);
    tip.scale.y = 2;
    tip.position.y = -0.55;
    g.add(tip);
    const h = halo(colour, 3.2);
    h.position.y = -0.05;
    g.add(h);
    g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    group.add(g);
    // A warm pool on the floor below.
    const p = pool(colour);
    p.mesh.position.set(f.x, y + 0.04, f.z);
    p.mesh.scale.setScalar(f.radius ?? 3.2);
    group.add(p.mesh);
    sources.push({ pos: centre, colour, reach: f.reach ?? 8, strength: 1 });
    const seed = f.x * 1.3 + f.z * 0.7;
    return {
      update(time, beat, ctx) {
        g.rotation.y = Math.sin(time * 0.25 + seed) * 0.12;
        g.rotation.z = Math.sin(time * 0.4 + seed) * 0.015;
        crystal.emissiveIntensity = 0.45 + 0.2 * Math.sin(time * 3 + seed);
        h.material.opacity = 0.5 + 0.06 * Math.sin(time * 7 + seed);
        tint(p.material, colour, 0.35);
        ctx.offer({ pos: [f.x, centre[1] - 0.4, f.z], color: colour, intensity: 10, reach: f.reach ?? 9 });
      },
    };
  }

  // ——— a festoon: bulbs on a sagging cable from (x, z) to (x, z) + `to`, at `height`.
  function festoon(f) {
    const [dx, dz] = f.to ?? [4, 0];
    const high = f.height ?? 2.2;
    const n = f.bulbs ?? Math.max(4, Math.round(Math.hypot(dx, dz) * 1.6));
    const sag = f.sag ?? 0.35;
    const colours = (f.colors ?? ['#ffd28a']).map(rgb);
    const at = (t) => {
      const x = f.x + dx * t, z = f.z + dz * t;
      return [x, heightOf(f.x, f.z) * (1 - t) + heightOf(f.x + dx, f.z + dz) * t + high - sag * 4 * t * (1 - t), z];
    };
    // The cable, in short straight lengths.
    const up = new GFX.Vector3(0, 1, 0), d = new GFX.Vector3();
    for (let i = 0; i < 12; i++) {
      const a = at(i / 12), b = at((i + 1) / 12);
      d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const length = d.length();
      const piece = new GFX.Mesh(new GFX.CylinderGeometry(0.012, 0.012, length, 4), iron);
      piece.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      piece.quaternion.setFromUnitVectors(up, d.divideScalar(length));
      group.add(piece);
    }
    for (const end of [0, 1]) {
      const [px, , pz] = at(end);
      const post = new GFX.Mesh(new GFX.CylinderGeometry(0.03, 0.04, high, 6), iron);
      post.position.set(px, heightOf(px, pz) + high / 2, pz);
      group.add(post);
    }
    const lamps = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const c = colours[i % colours.length];
      const p = at(t);
      const mat = new GFX.MeshBasicMaterial({ color: new GFX.Color(...c), toneMapped: false });
      const glass = new GFX.Mesh(new GFX.SphereGeometry(0.06, 8, 6), mat);
      glass.position.set(p[0], p[1] - 0.08, p[2]);
      const hh = halo(c, 0.7);
      hh.position.copy(glass.position);
      group.add(glass, hh);
      lamps.push({ mat, hh, c, i });
    }
    const mid = at(0.5);
    sources.push({ pos: mid, colour: colours[0], reach: f.reach ?? 6, strength: 0.6 });
    return {
      update(time, beat, ctx) {
        // The bulbs take turns being brightest, round the string, on the beat.
        for (const l of lamps) {
          const k = 0.7 + 0.3 * Math.max(0, Math.cos(((beat / 2) - l.i / 3) * Math.PI));
          tint(l.mat, l.c, k * 1.1);
          l.hh.material.opacity = 0.45 * k;
        }
        ctx.offer({ pos: mid, color: colours[0], intensity: 5, reach: 7 });
      },
    };
  }

  // ——— a caged bulb.
  function bulb(f) {
    const y = heightOf(f.x, f.z) + (f.wall ? 0 : 0);
    const colour = rgb(f.color ?? venue.palette.lamp ?? '#ffb766');
    const g = new GFX.Group();
    g.position.set(f.x, y, f.z);
    const post = new GFX.Mesh(new GFX.CylinderGeometry(0.03, 0.045, 0.34, 8), iron);
    post.position.y = 0.17;
    const socket = new GFX.Mesh(new GFX.CylinderGeometry(0.07, 0.07, 0.09, 10), iron);
    socket.position.y = 0.38;
    const glass = new GFX.Mesh(new GFX.SphereGeometry(0.1, 14, 10), new GFX.MeshBasicMaterial({ color: new GFX.Color(colour[0] * 1.2, colour[1] * 1.1, colour[2]), toneMapped: false }));
    glass.position.y = 0.52;
    // A cage round it: three rings.
    const cage = new GFX.Group();
    for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      const ring = new GFX.Mesh(new GFX.TorusGeometry(0.15, 0.007, 5, 16), iron);
      ring.rotation.y = a;
      cage.add(ring);
    }
    cage.position.y = 0.52;
    const h = halo(colour, 1.5);
    h.position.y = 0.55;
    post.castShadow = true;
    g.add(post, socket, glass, cage, h);
    group.add(g);
    const seed = f.x * 3.1 + f.z * 1.7;
    const at = [f.x, y + 0.6, f.z];
    sources.push({ pos: at, colour, reach: f.reach ?? 5.5, strength: 0.9 });
    return {
      update(time, beat, ctx) {
        const flicker = 1 + 0.05 * Math.sin(time * 11 + seed) + 0.03 * Math.sin(time * 23 + seed * 2);
        const buzz = f.buzz && Math.sin(time * 1.3 + seed) > 0.985 ? 0.35 : 1;
        const k = flicker * buzz;
        h.material.opacity = 0.6 * k;
        ctx.offer({ pos: at, color: colour, intensity: 6.5 * k, reach: 7 });
      },
    };
  }

  // ——— a PAR can on a post: a wash of colour, a shaft down, a pool where it lands.
  function par(f) {
    const y = heightOf(f.x, f.z);
    const high = f.height ?? 1.6;
    const lens = [f.x, y + high, f.z];
    const aim = f.aim ?? [0, 0];
    const target = [f.x + aim[0], heightOf(f.x + aim[0], f.z + aim[1]) + 0.03, f.z + aim[1]];
    const g = new GFX.Group();
    g.position.set(f.x, y, f.z);
    const post = new GFX.Mesh(new GFX.CylinderGeometry(0.025, 0.04, high, 8), iron);
    post.position.y = high / 2;
    const can = new GFX.Mesh(new GFX.CylinderGeometry(0.16, 0.12, 0.3, 14), iron);
    can.position.y = high;
    can.lookAt(target[0], target[1], target[2]);
    can.rotateX(Math.PI / 2);
    const lensMat = new GFX.MeshBasicMaterial({ color: new GFX.Color(1, 1, 1), toneMapped: false });
    const lensMesh = new GFX.Mesh(new GFX.CircleGeometry(0.11, 14), lensMat);
    lensMesh.position.set(0, -0.16, 0);
    lensMesh.rotation.x = Math.PI / 2;
    can.add(lensMesh);
    post.castShadow = can.castShadow = true;
    g.add(post, can);
    const h = halo([1, 1, 1], 1.4);
    h.position.y = high;
    g.add(h);
    group.add(g);
    const b = beam(f.angle ?? 0.2, [1, 1, 1]);
    b.aim(lens, target);
    group.add(b.mesh);
    const p = pool([1, 1, 1]);
    p.mesh.position.set(...target);
    p.mesh.scale.setScalar(Math.hypot(...lens.map((v, i) => v - target[i])) * (f.angle ?? 0.2) * 1.1);
    group.add(p.mesh);
    sources.push({ pos: lens, colour: rgb(f.colors?.[0] ?? defaults.colors[0]), reach: f.reach ?? 6, strength: 0.7 });
    return {
      update(time, beat, ctx) {
        const c = colorAt(f, beat), l = levelAt(f, beat);
        tint(lensMat, c, 1.2);
        h.material.color.setRGB(c[0], c[1], c[2]);
        h.material.opacity = 0.35 + 0.45 * l;
        const k = f.faint ? 0.3 : 1;
        tint(b.material, c, (0.7 * l + 0.2) * k);
        tint(p.material, c, (0.55 * l + 0.2) * (f.faint ? 0.6 : 1));
        ctx.offer({ pos: lens, color: c, intensity: 9 * l, reach: 8 });
      },
    };
  }

  // ——— a moving head: the same, but the beam wanders.
  function spot(f) {
    const y = heightOf(f.x, f.z);
    const high = f.height ?? 2.1;
    const lens = [f.x, y + high, f.z];
    const g = new GFX.Group();
    g.position.set(f.x, y, f.z);
    const post = new GFX.Mesh(new GFX.CylinderGeometry(0.03, 0.05, high, 8), iron);
    post.position.y = high / 2;
    const head = new GFX.Mesh(new GFX.BoxGeometry(0.26, 0.3, 0.26), iron);
    head.position.y = high;
    post.castShadow = head.castShadow = true;
    const h = halo([1, 1, 1], 1.5);
    h.position.y = high;
    g.add(post, head, h);
    group.add(g);
    const angle = f.angle ?? 0.16;
    const b = beam(angle, [1, 1, 1]);
    group.add(b.mesh);
    const p = pool([1, 1, 1]);
    group.add(p.mesh);
    const reach = f.radius ?? 3.5;
    const seed = (f.shift ?? 0) * 1.9 + f.x * 0.3;
    const target = [0, 0, 0];
    sources.push({ pos: lens, colour: rgb(f.colors?.[0] ?? defaults.colors[0]), reach: f.reach ?? 6, strength: 0.6 });
    return {
      update(time, beat, ctx) {
        // A Lissajous round the fixture.
        const t = beat * 0.5 + seed;
        const tx = f.x + Math.sin(t * 0.9) * reach, tz = f.z + Math.cos(t * 0.63 + 1) * reach;
        const ty = heightOf(tx, tz);
        target[0] = tx; target[1] = ty + 0.03; target[2] = tz;
        const c = colorAt(f, beat), l = levelAt(f, beat);
        b.aim(lens, target);
        p.mesh.position.set(tx, ty + 0.03, tz);
        p.mesh.scale.setScalar(Math.hypot(lens[0] - tx, lens[1] - ty, lens[2] - tz) * angle * 1.15);
        tint(b.material, c, (0.75 * l + 0.2) * (f.faint ? 0.35 : 1));
        tint(p.material, c, (0.7 * l + 0.2) * (f.faint ? 0.7 : 1));
        h.material.color.setRGB(c[0], c[1], c[2]);
        ctx.offer({ pos: [tx, ty + 0.9, tz], color: c, intensity: 8 * l, reach: 6 });
      },
    };
  }

  // ——— a strobe: white, on the beat, never more than three times a second.
  function strobe(f) {
    const y = heightOf(f.x, f.z);
    const high = f.height ?? 1.5;
    const lens = [f.x, y + high, f.z];
    const g = new GFX.Group();
    g.position.set(f.x, y, f.z);
    const post = new GFX.Mesh(new GFX.CylinderGeometry(0.025, 0.04, high, 8), iron);
    post.position.y = high / 2;
    const bar = new GFX.Mesh(new GFX.BoxGeometry(0.62, 0.16, 0.22), iron);
    bar.position.y = high;
    const faceMat = new GFX.MeshBasicMaterial({ color: new GFX.Color(0.25, 0.25, 0.3), toneMapped: false });
    const faceMesh = new GFX.Mesh(new GFX.BoxGeometry(0.54, 0.1, 0.02), faceMat);
    faceMesh.position.set(0, high, 0.115);
    const h = halo([1, 1, 1], 2.4);
    h.position.y = high;
    h.material.opacity = 0;
    post.castShadow = bar.castShadow = true;
    g.add(post, bar, faceMesh, h);
    group.add(g);
    sources.push({ pos: lens, colour: [0.9, 0.95, 1], reach: f.reach ?? 6, strength: 0.4 });
    return {
      strobe: true,
      update(time, beat, ctx) {
        const s = ctx.flashing ? strobeAt(f, beat, tempo) : 0;
        // With flashing off, a slow breath of white instead.
        const calm = ctx.flashing ? 0 : 0.18 + 0.1 * Math.sin(time * 1.4);
        const k = Math.max(s, calm);
        faceMat.color.setRGB(0.25 + k * 3, 0.25 + k * 3, 0.3 + k * 3);
        h.material.opacity = k * 0.95;
        if (k > 0.01) ctx.offer({ pos: [lens[0], lens[1] + 0.3, lens[2]], color: [0.92, 0.96, 1], intensity: 38 * k, reach: 11, flash: s });
      },
    };
  }

  // ——— a mirror ball, and the sparkles it throws.
  function ball(f) {
    const y = heightOf(f.x, f.z);
    const high = f.height ?? 2.6;
    const centre = [f.x, y + high, f.z];
    const g = new GFX.Group();
    g.position.set(...centre);
    const geometry = new GFX.IcosahedronGeometry(0.34, 2).toNonIndexed();
    const rnd = random(Math.floor(f.x * 31 + f.z * 7));
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 9) {
      const v = 0.4 + rnd() * 0.6;
      for (let k = 0; k < 9; k += 3) { colors[i + k] = v; colors[i + k + 1] = v * 0.98; colors[i + k + 2] = v * 1.06; }
    }
    geometry.setAttribute('color', new GFX.BufferAttribute(colors, 3));
    const mat = new GFX.MeshStandardMaterial({ name: 'mirror-ball', vertexColors: true, metalness: 0.9, roughness: 0.15, flatShading: true, emissive: new GFX.Color('#9aa0c0'), emissiveIntensity: 0.55 });
    const sphere = new GFX.Mesh(geometry, mat);
    sphere.castShadow = true;
    const chain = new GFX.Mesh(new GFX.CylinderGeometry(0.012, 0.012, 6, 6), iron);
    chain.position.y = 3.3;
    const h = halo([1, 1, 1], 2.4);
    g.add(sphere, chain, h);
    // The glints: four bright points that wink on its face.
    const glints = Array.from({ length: 5 }, (_, i) => {
      const s = halo([1, 1, 1], 0.5);
      g.add(s);
      return { s, a: i * 1.3 };
    });
    group.add(g);
    // The sparkles on the floor: a plane of them, turning.
    const radius = f.radius ?? 6;
    const sp = sparkleTexture(GFX, Math.floor(f.x * 13 + f.z * 5) % 7);
    // Its own copy, as each ball's field turns on its own.
    const map = copyOf(GFX, sp.map);
    if (map) map.center.set(0.5, 0.5);
    const spMat = new GFX.MeshBasicMaterial({ map, color: new GFX.Color(1, 1, 1), opacity: 0.5, ...additive });
    const floor = new GFX.Mesh(new GFX.PlaneGeometry(radius * 2, radius * 2), spMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(f.x, y + 0.045, f.z);
    floor.frustumCulled = false;
    group.add(floor);
    sources.push({ pos: centre, colour: rgb(f.colors?.[0] ?? defaults.colors[0]), reach: radius, strength: 0.5, glow: 0.4 });
    return {
      update(time, beat, ctx) {
        sphere.rotation.y = time * 0.5;
        const c = colorAt({ ...f, every: f.every ?? 4 }, beat);
        const l = 0.75 + 0.25 * Math.pow(1 - (((beat % 1) + 1) % 1), 2);
        if (map) { map.rotation = time * 0.22; map.offset.set(Math.sin(time * 0.3) * 0.02, Math.cos(time * 0.27) * 0.02); }
        tint(spMat, c, l);
        h.material.color.setRGB(...mixRGB(c, [1, 1, 1], 0.4));
        h.material.opacity = 0.35 + 0.3 * l;
        for (const gl of glints) {
          const a = gl.a + time * 0.5;
          gl.s.position.set(Math.cos(a) * 0.32, Math.sin(a * 1.7) * 0.3, Math.sin(a) * 0.32);
          gl.s.material.opacity = 0.2 + 0.8 * Math.max(0, Math.sin(time * 9 + gl.a * 4));
        }
        // A real light, wandering round the floor under it.
        const t = time * 0.6;
        const lx = f.x + Math.cos(t) * radius * 0.45, lz = f.z + Math.sin(t * 1.3) * radius * 0.45;
        ctx.offer({ pos: [lx, heightOf(lx, lz) + 1.2, lz], color: c, intensity: 7 * l, reach: radius });
      },
    };
  }

  // ——— a laser: a fan of thin beams, sweeping.
  function laser(f) {
    const y = heightOf(f.x, f.z);
    const high = f.height ?? 2.6;
    const from = [f.x, y + high, f.z];
    const colour = rgb(f.color ?? '#3aff7a');
    const material = new GFX.MeshBasicMaterial({ color: new GFX.Color(...colour), opacity: 0.85, ...additive });
    const count = f.beams ?? 5;
    const reach = f.radius ?? 5;
    const up = new GFX.Vector3(0, 1, 0), d = new GFX.Vector3();
    const geometry = new GFX.CylinderGeometry(0.012, 0.012, 1, 5);
    geometry.translate(0, 0.5, 0);
    const beams = Array.from({ length: count }, () => {
      const m = new GFX.Mesh(geometry, material);
      m.frustumCulled = false;
      group.add(m);
      return m;
    });
    const base = new GFX.Mesh(new GFX.BoxGeometry(0.2, 0.2, 0.2), iron);
    base.position.set(f.x, from[1], f.z);
    group.add(base);
    const dots = Array.from({ length: count }, () => {
      const s = halo(colour, 0.35);
      group.add(s);
      return s;
    });
    return {
      update(time, beat) {
        const sweep = Math.sin(beat * 0.5 + (f.shift ?? 0)) * 0.9;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + sweep + time * 0.2;
          const r = reach * (0.55 + 0.45 * Math.sin(time * 0.7 + i));
          const tx = f.x + Math.cos(a) * r, tz = f.z + Math.sin(a) * r;
          const ty = heightOf(tx, tz) + 0.05;
          d.set(tx - from[0], ty - from[1], tz - from[2]);
          const len = d.length();
          beams[i].position.set(...from);
          beams[i].quaternion.setFromUnitVectors(up, d.divideScalar(len));
          beams[i].scale.set(1, len, 1);
          dots[i].position.set(tx, ty + 0.02, tz);
        }
      },
    };
  }

  // ——— a neon sign: a word, in tube.
  function neon(f) {
    const y = heightOf(f.x, f.z);
    const colour = f.color ?? f.colors?.[0] ?? '#ff3a8a';
    const tex = neonTexture(GFX, f.text ?? 'LIVE', colour);
    const c = rgb(colour);
    const height = f.size ?? 0.55;
    const material = new GFX.SpriteMaterial({ map: tex.map, color: new GFX.Color(1, 1, 1), ...additive });
    const sign = new GFX.Sprite(material);
    const width = height * (tex.aspect ?? 3);
    sign.scale.set(width, height, 1);
    const at = [f.x, y + (f.height ?? 1.2), f.z];
    sign.position.set(...at);
    const h = halo(c, Math.max(width, 1.6) * 1.1);
    h.position.set(...at);
    h.material.opacity = 0.35;
    group.add(sign, h);
    const seed = f.x * 7.7 + f.z * 3.1;
    sources.push({ pos: at, colour: c, reach: f.reach ?? 5, strength: 0.5 });
    return {
      update(time, beat, ctx) {
        // The odd stutter, as neon does.
        const out = Math.sin(time * 1.9 + seed) > 0.992 || Math.sin(time * 4.7 + seed * 2) > 0.998;
        const k = out ? 0.25 : 1 + 0.03 * Math.sin(time * 40 + seed);
        material.opacity = k;
        h.material.opacity = 0.35 * k;
        ctx.offer({ pos: at, color: c, intensity: 4.5 * k, reach: 6 });
      },
    };
  }

  // ——— build the rig.
  const style = venue.look.lamp ?? 'bulb';
  for (const { x, z } of venue.lamps) {
    // House lights on the walls: soft, so the venue's own rig is what catches the eye.
    if (style === 'par' || style === 'spot') add({ kind: style, x: x + 0.5, z: z + 0.5, shift: (x + z) * 0.37, aim: [1.5, 1.5], faint: true });
    else add({ kind: 'bulb', x: x + 0.5, z: z + 0.5, buzz: venue.look.buzz });
  }
  for (const f of venue.fixtures) add(f);

  // ——— the lights offered each frame, and the few that become real.
  let offers = [];
  const ctx = {
    flashing: true,
    offer(o) { offers.push(o); },
  };

  return {
    group,
    flash: 0,
    /** Every fixture's source, for baking and for tests. */
    sources,
    count: fixtures.length,

    /**
     * Once a frame. `rock` is where he is ([x, y, z]); `lights` the stage's
     * fixture lights; `flashing` false stops the strobes flashing.
     */
    update({ time, beat, rock, lights, flashing = true }) {
      ctx.flashing = flashing;
      offers = [];
      for (const f of fixtures) f.update(time, beat, ctx);
      // The nearest, by how much they would light him.
      const scored = offers.map((o) => {
        const d = Math.hypot(o.pos[0] - rock[0], o.pos[1] - rock[1], o.pos[2] - rock[2]);
        return { o, d };
      }).sort((a, b) => a.d - b.d);
      const n = lights.length;
      const edge = scored[n]?.d ?? Infinity;
      let flash = 0;
      for (let i = 0; i < n; i++) {
        const light = lights[i];
        const s = scored[i];
        if (!s) { light.intensity = 0; continue; }
        const { o, d } = s;
        // Each fades in as it comes into reach, and out as the next one in line comes closer than it.
        const reach = o.reach * 1.7;
        const fade = smooth(reach, reach * 0.6, d) * (Number.isFinite(edge) ? smooth(0, 1.6, edge - d) : 1);
        light.position.set(o.pos[0], o.pos[1], o.pos[2]);
        light.color.setRGB(o.color[0], o.color[1], o.color[2]);
        light.distance = o.reach + 2;
        light.intensity = o.intensity * fade;
        if (o.flash) flash = Math.max(flash, o.flash * smooth(10, 3, d));
      }
      this.flash = flash;
    },
  };
}
