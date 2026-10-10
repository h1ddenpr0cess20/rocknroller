/**
 * Rock: several tons of granite that is not impressed. The stone is the
 * boulder from github.com/h1ddenpr0cess20/rock — an icosphere pushed out by
 * layers of noise, sliced flat by a dozen cutting planes, faceted, coloured
 * grain by grain — cut a little rounder so it rolls true, and with two big,
 * heavy-lidded eyes stuck on the front of it.
 *
 * The stone rolls (`body`, turned by the physics); the face (`face`) does
 * not. It stays turned toward the camera, swinging a little toward wherever
 * Rock is going, so he can always be seen to be unimpressed. The pupils slosh
 * about on springs as he accelerates, like googly eyes; the lids droop, blink,
 * and narrow when he is going for something. As he takes damage, cracks come
 * up in the stone.
 *
 * `createRock` gives { group, setCracks(0–1), react(kind), update(frame) }.
 */

// Rock's noise (geometry.js there), as it is.
const hash = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const noise = (x, y, z) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(
    L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w) * 2 - 1;
};

/** Rock's cutting planes: the flats that make it look broken from a bigger stone. */
function cuttingPlanes() {
  const planes = [];
  for (let i = 0; i < 13; i++) {
    const a = i * 2.399963;
    const y = 1 - (2 * (i + 0.5)) / 13;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const n = [Math.cos(a) * r, y * 0.75, Math.sin(a) * r];
    const l = Math.hypot(...n);
    planes.push({ n: n.map((v) => v / l), d: 0.8 + hash(i, i * 3, 7) * 0.14 });
  }
  return planes;
}

/** How big the stone is, mean radius over the largest: it is scaled so the biggest bits just fill the ball Rock rolls as. */
const FIT = 1.0;

/** Where the eyes sit on the face: out from the middle, up a little, and just proud of the stone. */
const EYE = Object.freeze({ x: 0.36, y: 0.2, z: 0.88, r: 0.3, out: 1.0 });

let shared = null;

/** The stone, faceted and coloured; made once and shared. Also the crack field, for the colours to be remade from. */
function stone(GFX) {
  if (shared) return shared;
  const geometry = new GFX.IcosahedronGeometry(1, 5).toNonIndexed();
  const planes = cuttingPlanes();
  const p = geometry.attributes.position.array;
  const count = p.length / 3;
  const base = new Float32Array(p.length);
  const crack = new Float32Array(count * 3);
  const c0 = new GFX.Color('#8a8278'), dark = new GFX.Color('#453f39'), pale = new GFX.Color('#b8b0a2');
  const tc = new GFX.Color();
  const v = [0, 0, 0];
  for (let i = 0; i < p.length; i += 3) {
    const l = Math.hypot(p[i], p[i + 1], p[i + 2]);
    const u = [p[i] / l, p[i + 1] / l, p[i + 2] / l];
    // Pushed in only, so nothing stands out past the unit sphere and the face never has to float above it.
    const d = 1
      - (0.5 + 0.5 * noise(u[0] * 2.1 + 11, u[1] * 2.1, u[2] * 2.1)) * 0.11
      - (0.5 + 0.5 * noise(u[0] * 4.7, u[1] * 4.7 + 5, u[2] * 4.7)) * 0.05
      - (0.5 + 0.5 * noise(u[0] * 11, u[1] * 11, u[2] * 11 + 3)) * 0.02;
    v[0] = u[0] * d; v[1] = u[1] * d; v[2] = u[2] * d;
    for (const pl of planes) {
      const t = v[0] * pl.n[0] + v[1] * pl.n[1] + v[2] * pl.n[2];
      if (t > pl.d) for (let k = 0; k < 3; k++) v[k] -= pl.n[k] * (t - pl.d) * 0.92;
    }
    p[i] = v[0]; p[i + 1] = v[1]; p[i + 2] = v[2];

    const m = noise(v[0] * 6, v[1] * 6, v[2] * 6) * 0.5 + 0.5;
    const grit = hash(Math.round(v[0] * 90), Math.round(v[1] * 90), Math.round(v[2] * 90));
    tc.copy(c0).lerp(dark, Math.pow(m, 1.6) * 0.7).lerp(pale, grit > 0.93 ? 0.6 : 0);
    base[i] = tc.r; base[i + 1] = tc.g; base[i + 2] = tc.b;

    // Three sets of cracks, thin lines where a noise field crosses its middle: the first shows at a little damage, the others at more.
    const j = (i / 3) * 3;
    for (let k = 0; k < 3; k++) {
      const n = noise(v[0] * (2.2 + k * 0.7) + k * 17, v[1] * (2.2 + k * 0.7) + k * 5, v[2] * (2.2 + k * 0.7) - k * 9);
      crack[j + k] = 1 - Math.min(1, Math.abs(n) * (7 - k));
    }
  }
  geometry.setAttribute('color', new GFX.BufferAttribute(new Float32Array(base), 3));
  geometry.computeVertexNormals();
  shared = { geometry, base, crack, count };
  return shared;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const spring = (s, k, c, dt, to = 0) => {
  s.v += (to - s.p) * k * dt - s.v * c * dt;
  s.p += s.v * dt;
};

/** The moods: where the lids sit (0 wide open, 1 shut), how far they slant, how wide the pupils, and the brow's tilt. */
export const MOODS = Object.freeze({
  idle: { lid: 0.42, slant: 0.0, pupil: 1, glow: 0 },
  rolling: { lid: 0.5, slant: 0.14, pupil: 0.95, glow: 0 },
  rev: { lid: 0.62, slant: 0.42, pupil: 0.85, glow: 0.5 },
  smash: { lid: 0.66, slant: 0.5, pupil: 0.8, glow: 0.8 },
  hurt: { lid: 0.05, slant: -0.18, pupil: 0.55, glow: 0 },
  fall: { lid: 0.0, slant: -0.1, pupil: 0.5, glow: 0 },
  shatter: { lid: 0.9, slant: -0.2, pupil: 1.2, glow: 0 },
  proud: { lid: 0.56, slant: -0.06, pupil: 1, glow: 0 },
});

export function createRock(GFX, { radius = 0.42 } = {}) {
  const { geometry, base, crack, count } = stone(GFX);
  const group = new GFX.Group();
  group.name = 'rock';
  const body = new GFX.Group();
  body.name = 'rock_body';
  const face = new GFX.Group();
  face.name = 'rock_face';
  group.add(body, face);

  // There is only the one Rock: his stone is the shared geometry, and its colours are remade in place as the cracks come.
  const stoneGeometry = geometry;
  const colors = geometry.attributes.color.array;
  const material = new GFX.MeshStandardMaterial({ name: 'granite', vertexColors: true, roughness: 0.9, metalness: 0.06, flatShading: true });
  const mesh = new GFX.Mesh(stoneGeometry, material);
  mesh.name = 'rock_stone';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.scale.setScalar(radius * FIT);
  body.add(mesh);

  // ——— the face, in the unit stone's frame; scaled with it.
  face.scale.setScalar(radius * FIT);
  const white = new GFX.MeshPhysicalMaterial({ name: 'eye', color: new GFX.Color('#f6f1e6'), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  const black = new GFX.MeshPhysicalMaterial({ name: 'pupil', color: new GFX.Color('#0a0a0e'), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 });
  const glowMat = new GFX.MeshBasicMaterial({ name: 'eye-glow', color: new GFX.Color('#ff6a2a'), toneMapped: false, transparent: true, opacity: 0 });
  const lidMat = new GFX.MeshStandardMaterial({ name: 'lid', color: new GFX.Color('#6f685f'), roughness: 0.92, flatShading: true });
  const eyeGeometry = new GFX.SphereGeometry(EYE.r, 28, 18);
  const pupilGeometry = new GFX.SphereGeometry(EYE.r * 0.46, 16, 12);
  const lidGeometry = new GFX.SphereGeometry(EYE.r * 1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const glowGeometry = new GFX.SphereGeometry(EYE.r * 0.62, 12, 8);
  const eyes = [1, -1].map((side) => {
    const socket = new GFX.Group();
    socket.position.set(side * EYE.x, EYE.y, EYE.z);
    socket.rotation.y = side * 0.18;
    const ball = new GFX.Mesh(eyeGeometry, white);
    const pupil = new GFX.Mesh(pupilGeometry, black);
    const halo = new GFX.Mesh(glowGeometry, glowMat);
    // The lid: a cap over the top of the eye, tipped down over it as it closes.
    const hinge = new GFX.Group();
    const lid = new GFX.Mesh(lidGeometry, lidMat);
    hinge.add(lid);
    for (const m of [ball, pupil, lid]) m.castShadow = false;
    ball.castShadow = true;
    socket.add(ball, halo, pupil, hinge);
    face.add(socket);
    return { side, socket, ball, pupil, halo, hinge, p: { p: 0, v: 0 }, q: { p: 0, v: 0 } };
  });

  // ——— the state.
  const mood = { ...MOODS.idle };
  let want = 'idle';
  let hold = 0;
  let blink = 0, nextBlink = 2 + Math.random() * 3;
  let time = 0;
  let squash = { p: 0, v: 0 };
  let facing = Math.PI / 4;
  const last = { vx: 0, vy: 0, vz: 0 };
  const accel = { x: 0, y: 0, z: 0 };
  let cracks = -1;

  /** Remakes the stone's colours with the cracks of `level` (0, whole, to 1, about to go) in them. */
  function setCracks(level) {
    const l = Math.max(0, Math.min(1, level));
    if (Math.abs(l - cracks) < 0.02) return;
    cracks = l;
    for (let i = 0; i < count; i++) {
      const j = i * 3;
      // Each set comes in as the damage passes its own mark.
      const a = smooth(0.12, 0.3, l) * crack[j];
      const b = smooth(0.4, 0.55, l) * crack[j + 1];
      const c = smooth(0.7, 0.85, l) * crack[j + 2];
      const line = Math.max(a, b, c);
      const k = 1 - 0.82 * smooth(0.55, 0.9, line);
      colors[j] = base[j] * k; colors[j + 1] = base[j + 1] * k; colors[j + 2] = base[j + 2] * k;
    }
    stoneGeometry.attributes.color.needsUpdate = true;
  }

  return {
    group, body, face, mesh, material,
    get cracks() { return cracks; },
    setCracks,

    /** A mood for a moment: `kind` is one of MOODS, held for `seconds`. */
    react(kind, seconds = 0.5) {
      if (!MOODS[kind]) return;
      want = kind;
      hold = seconds;
      if (kind === 'smash' || kind === 'hurt') squash.v += 4;
    },

    /** The squash, as a spring: landings and knocks add to it. */
    knock(amount) { squash.v += amount; },

    /**
     * Once a frame. `frame`: `q` (how the stone is turned), `position` (the
     * ball's, [x, y, z]), `velocity` ([x, y, z]), `yaw` (the camera's),
     * `pitch`, `rev` (is he revving), `falling` (is he off the edge).
     */
    update(dt, { q, position, velocity, yaw, pitch = 0.7, rev = false, falling = false }) {
      time += dt;
      body.quaternion.set(q[0], q[1], q[2], q[3]);
      // The squash, as the die's: down on landing, springing back, a little long when it flies.
      spring(squash, 185, 11, dt);
      const s = squash.p * 0.04;
      body.scale.set(1 + s * 0.45, 1 - s * 0.8, 1 + s * 0.45);
      // The stone is a ball: its middle is where the physics ball's is.
      group.position.set(position[0], position[1], position[2]);

      // How it is accelerating, smoothed, for the pupils to slosh with.
      if (dt > 0) {
        const k = Math.min(1, dt * 12);
        accel.x += ((velocity[0] - last.vx) / dt - accel.x) * k;
        accel.y += ((velocity[1] - last.vy) / dt - accel.y) * k;
        accel.z += ((velocity[2] - last.vz) / dt - accel.z) * k;
      }
      last.vx = velocity[0]; last.vy = velocity[1]; last.vz = velocity[2];

      // The face: toward the camera, swung a little toward where he is going.
      const speed = Math.hypot(velocity[0], velocity[2]);
      let target = yaw;
      if (speed > 0.8) {
        const heading = Math.atan2(velocity[0], velocity[2]);
        let off = heading - yaw;
        off = Math.atan2(Math.sin(off), Math.cos(off));
        target = yaw + Math.max(-1.0, Math.min(1.0, off)) * Math.min(0.5, speed / 14);
      }
      let turn = target - facing;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      facing += turn * Math.min(1, dt * 7);
      face.rotation.set(-pitch * 0.35, facing, 0, 'YXZ');

      // Which mood he is in.
      hold -= dt;
      let now = want;
      if (hold <= 0) now = falling ? 'fall' : rev ? 'rev' : speed > 3 ? 'rolling' : 'idle';
      const m = MOODS[now];
      const kk = Math.min(1, dt * (now === 'hurt' || now === 'smash' ? 22 : 9));
      for (const key of Object.keys(m)) mood[key] += (m[key] - mood[key]) * kk;

      // Blinking: every few seconds, quick.
      nextBlink -= dt;
      if (nextBlink <= 0 && blink <= 0) { blink = 0.14; nextBlink = 2.2 + Math.random() * 3.5; }
      blink = Math.max(0, blink - dt);
      const shut = blink > 0 ? Math.sin((1 - blink / 0.14) * Math.PI) : 0;
      const lid = Math.min(1, mood.lid + (1 - mood.lid) * shut);

      // The accelerations, in the face's own frame: right, up, toward the viewer.
      const c = Math.cos(facing), sn = Math.sin(facing);
      const ax = accel.x * c - accel.z * sn;
      const pull = 0.014;
      for (const e of eyes) {
        // Gravity drags the pupil down; whatever pushes the stone, the pupil lags behind it.
        const tx = Math.max(-1, Math.min(1, -ax * pull)) * 0.7;
        const ty = Math.max(-1, Math.min(1, -0.2 - accel.y * pull)) * 0.7;
        spring(e.p, 120, 5.5, dt, tx);
        spring(e.q, 120, 5.5, dt, ty);
        const dx = e.p.p, dy = e.q.p;
        const l = Math.min(0.62, Math.hypot(dx, dy));
        const ang = Math.atan2(dy, dx);
        const px = Math.cos(ang) * l, py = Math.sin(ang) * l;
        const pz = Math.sqrt(Math.max(0.05, 1 - px * px - py * py));
        e.pupil.position.set(px * EYE.r * 0.78, py * EYE.r * 0.78, pz * EYE.r * 0.78);
        e.pupil.scale.setScalar(mood.pupil);
        // The lid, tipped down over the eye as far as it is shut, and slanted: the inner end low when he means business.
        e.hinge.rotation.set(lerp(-1.45, 0.25, lid), 0, e.side * mood.slant * -1);
        e.halo.visible = mood.glow > 0.05;
        e.halo.position.copy(e.pupil.position);
      }
      glowMat.opacity = Math.min(0.9, mood.glow);
    },
  };
}
