import { isBaked, ready } from './models/library.js';
import { createStatic } from './models/model.js';
import { PROPS } from './models/props/index.js';
import { gaffTexture, glowTexture, grilleTexture, panelTexture, shutterTexture, tiled } from './textures.js';

/**
 * What moves, and what lies about, as it is drawn: speaker stacks that slam
 * down on the beat, pyro in the floor, lifts, security gates, flimsy panels,
 * bumpers and the pickups. Each `create…` gives { group, update(...) }; the
 * logic is in actors.js.
 */

const dark = (GFX, hex, o = {}) => new GFX.MeshStandardMaterial({ color: new GFX.Color(hex), roughness: 0.6, ...o });

/**
 * A speaker stack: a black cabinet, silver corners, a handle on top, and a
 * big cone behind a grille on each side. It rocks with the beat as it
 * waits at the top.
 */
export function createSpeakerMesh(GFX, { w, d, height }) {
  const group = new GFX.Group();
  const grille = grilleTexture(GFX);
  const tolex = dark(GFX, '#17171a', { roughness: 0.7 });
  const side = (across) => {
    const n = Math.max(1, Math.round(across));
    return new GFX.MeshStandardMaterial({ color: new GFX.Color('#ffffff'), map: tiled(GFX, grille.map, n, 1), bumpMap: tiled(GFX, grille.bump, n, 1), bumpScale: 1.4, roughness: 0.92, metalness: 0 });
  };
  const metal = dark(GFX, '#b8bcc4', { metalness: 0.9, roughness: 0.3 });
  // BoxGeometry's material order: +x, -x, +y, -y, +z, -z.
  const mats = [side(d), side(d), tolex, tolex, side(w), side(w)];
  const body = new GFX.Mesh(new GFX.BoxGeometry(w, height, d), mats);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  // Corner protectors, and a handle.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const c = new GFX.Mesh(new GFX.BoxGeometry(0.1, 0.1, 0.1), metal);
      c.position.set(sx * (w / 2 - 0.02), height / 2 - 0.02, sz * (d / 2 - 0.02));
      group.add(c);
    }
  }
  const handle = new GFX.Mesh(new GFX.TorusGeometry(0.14, 0.025, 6, 14, Math.PI), metal);
  handle.position.set(0, height / 2 + 0.01, 0);
  group.add(handle);
  // The chain it hangs from, up into the dark.
  const chain = new GFX.Mesh(new GFX.CylinderGeometry(0.04, 0.04, 8, 8), metal);
  chain.position.y = height / 2 + 4;
  group.add(chain);
  return {
    group,
    update(up, time) {
      // Waiting up at the top, it pumps a little with the beat.
      body.scale.y = 1 + (up > 0.99 ? Math.sin(time * 9) * 0.012 : 0);
    },
  };
}

/** Pyro: a grating in the floor with a pilot light in it; on the beat it bursts into a column of flame. */
export function createPyroMesh(GFX, { x, z, w, d }) {
  const group = new GFX.Group();
  const iron = dark(GFX, '#2b2b30', { metalness: 0.8, roughness: 0.4 });
  const flameMat = new GFX.MeshBasicMaterial({ color: new GFX.Color('#ff7a1a'), transparent: true, opacity: 0.85, toneMapped: false, blending: GFX.AdditiveBlending, depthWrite: false });
  const coreMat = new GFX.MeshBasicMaterial({ color: new GFX.Color('#fff2b0'), transparent: true, opacity: 0.95, toneMapped: false, blending: GFX.AdditiveBlending, depthWrite: false });
  const glow = glowTexture(GFX).map;
  const haloMat = glow ? new GFX.SpriteMaterial({ map: glow, color: new GFX.Color('#ffa050'), blending: GFX.AdditiveBlending, depthWrite: false, opacity: 0.8 }) : null;
  const jets = [];
  const flameGeometry = new GFX.ConeGeometry(0.18, 1, 10);
  const coreGeometry = new GFX.ConeGeometry(0.09, 1, 8);
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < w; i++) {
      const cell = new GFX.Group();
      cell.position.set(x + i + 0.5, 0, z + j + 0.5);
      const plate = new GFX.Mesh(new GFX.BoxGeometry(0.8, 0.03, 0.8), iron);
      plate.position.y = 0.012;
      cell.add(plate);
      // Slots in the plate.
      for (let k = -2; k <= 2; k++) {
        const slot = new GFX.Mesh(new GFX.BoxGeometry(0.62, 0.035, 0.05), dark(GFX, '#050506', { roughness: 1 }));
        slot.position.set(0, 0.014, k * 0.14);
        cell.add(slot);
      }
      const flame = new GFX.Mesh(flameGeometry, flameMat);
      const core = new GFX.Mesh(coreGeometry, coreMat);
      flame.visible = core.visible = false;
      cell.add(flame, core);
      let halo = null;
      if (haloMat) {
        halo = new GFX.Sprite(haloMat);
        halo.visible = false;
        cell.add(halo);
      }
      group.add(cell);
      jets.push({ cell, flame, core, halo, seed: i * 1.7 + j * 2.3 });
    }
  }
  return {
    group,
    update(out, warn, time, base) {
      for (const j of jets) {
        j.cell.position.y = base;
        const pilot = warn > 0 && out < 0.01;
        const h = out > 0.01 ? 0.35 + out * 1.25 : pilot ? 0.1 + warn * 0.18 + Math.sin(time * 40 + j.seed) * 0.02 : 0;
        j.flame.visible = j.core.visible = h > 0.01;
        const wob = 1 + 0.12 * Math.sin(time * 31 + j.seed) + 0.07 * Math.sin(time * 47);
        j.flame.scale.set(out > 0.01 ? 1 : 0.5, h * wob, out > 0.01 ? 1 : 0.5);
        j.flame.position.y = h * wob / 2;
        j.core.scale.set(out > 0.01 ? 1 : 0.5, h * 0.62 * wob, out > 0.01 ? 1 : 0.5);
        j.core.position.y = h * 0.62 * wob / 2;
        if (j.halo) {
          j.halo.visible = out > 0.05;
          j.halo.position.y = h * 0.5 + 0.2;
          j.halo.scale.set(1.6 * out + 0.3, 1.6 * out + 0.3, 1);
        }
      }
    },
  };
}

/** A lift: a black stage riser with gaff tape round its edge and casters under it; or a raft of upraised arms. */
export function createLiftMesh(GFX, { w, d, thickness, style }) {
  const group = new GFX.Group();
  const gaff = gaffTexture(GFX);
  const rx = Math.max(1, Math.round(w / 2)), ry = Math.max(1, Math.round(d / 2));
  const deck = new GFX.MeshStandardMaterial({ color: new GFX.Color('#ffffff'), map: tiled(GFX, gaff.map, rx, ry), bumpMap: tiled(GFX, gaff.bump, rx, ry), bumpScale: 1, roughness: 0.75 });
  const side = dark(GFX, '#101012', { roughness: 0.8 });
  const slab = new GFX.Mesh(new GFX.BoxGeometry(w, thickness, d), [side, side, deck, side, side, side]);
  slab.castShadow = slab.receiveShadow = true;
  group.add(slab);
  const metal = dark(GFX, '#8a8f98', { metalness: 0.9, roughness: 0.35 });
  // Chains at the corners, up into the dark.
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const chain = new GFX.Mesh(new GFX.CylinderGeometry(0.03, 0.03, 9, 6), metal);
    chain.position.set(cx * (w / 2 - 0.12), 4.5, cz * (d / 2 - 0.12));
    group.add(chain);
  }
  return { group, style, update() {} };
}

/** A security gate: a roll-up shutter of corrugated steel, stencilled STAFF ONLY. */
export function createGateMesh(GFX, { span, height, thickness, across }) {
  const group = new GFX.Group();
  const tex = shutterTexture(GFX);
  const n = Math.max(1, Math.round(span / 2));
  const face = new GFX.MeshStandardMaterial({ color: new GFX.Color('#ffffff'), map: tiled(GFX, tex.map, n, 1), bumpMap: tiled(GFX, tex.bump, n, 1), bumpScale: 2, roughness: 0.55, metalness: 0.7 });
  const edge = dark(GFX, '#2a2b30', { metalness: 0.6 });
  const dx = across === 'x' ? span : thickness, dz = across === 'x' ? thickness : span;
  const slab = new GFX.Mesh(new GFX.BoxGeometry(dx, height, dz), across === 'x' ? [edge, edge, edge, edge, face, face] : [face, face, edge, edge, edge, edge]);
  slab.castShadow = slab.receiveShadow = true;
  group.add(slab);
  return { group, update() {} };
}

/** A flimsy panel: stage-flat plywood, painted to match the wall it stands in. It splinters when it goes. */
export function createPanelMesh(GFX, { span, height, thickness, across, look }) {
  const group = new GFX.Group();
  const tex = panelTexture(GFX, look);
  const n = Math.max(1, Math.round(span));
  const face = new GFX.MeshStandardMaterial({ color: new GFX.Color('#ffffff'), map: tiled(GFX, tex.map, n, 1), bumpMap: tiled(GFX, tex.bump, n, 1), bumpScale: 1.4, roughness: 0.85 });
  const edge = dark(GFX, '#6b5238', { roughness: 0.9 });
  const dx = across === 'x' ? span : thickness, dz = across === 'x' ? thickness : span;
  const slab = new GFX.Mesh(new GFX.BoxGeometry(dx, height, dz), across === 'x' ? [edge, edge, edge, edge, face, face] : [face, face, edge, edge, edge, edge]);
  slab.castShadow = slab.receiveShadow = true;
  group.add(slab);
  return { group, update() {} };
}

/** A bumper: a squat chrome post with a glowing ring, which flashes when Rock bounces off it. */
export function createBumperMesh(GFX, { radius }) {
  const group = new GFX.Group();
  const chrome = dark(GFX, '#d8dce4', { metalness: 1, roughness: 0.18 });
  const ringMat = new GFX.MeshBasicMaterial({ color: new GFX.Color('#ff3a8a'), toneMapped: false });
  const post = new GFX.Mesh(new GFX.CylinderGeometry(radius * 0.8, radius, 0.5, 20), chrome);
  post.position.y = 0.25;
  const cap = new GFX.Mesh(new GFX.SphereGeometry(radius * 0.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), chrome);
  cap.position.y = 0.5;
  const ring = new GFX.Mesh(new GFX.TorusGeometry(radius * 0.92, 0.04, 8, 28), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.22;
  for (const m of [post, cap]) m.castShadow = true;
  group.add(post, cap, ring);
  return {
    group,
    update(since) {
      const flash = since >= 0 && since < 0.25 ? 1 - since / 0.25 : 0;
      ring.material.color.setRGB(1, 0.23 + 0.7 * flash, 0.54 + 0.4 * flash);
      group.scale.setScalar(1 + flash * 0.12);
    },
  };
}

/** The look of each pickup when it has no model (under node, or until the model has baked). */
const STAND_INS = {
  pick: { color: '#ffcf4a', make: (GFX) => new GFX.CylinderGeometry(0.1, 0.1, 0.02, 3), y: 0.04 },
  case: { color: '#2a2a2e', make: (GFX) => new GFX.BoxGeometry(0.42, 0.28, 0.28), y: 0.14 },
  tape: { color: '#9aa0a8', make: (GFX) => new GFX.TorusGeometry(0.1, 0.05, 8, 14), y: 0.2 },
  lighter: { color: '#e8e8ee', make: (GFX) => new GFX.BoxGeometry(0.08, 0.2, 0.04), y: 0.2 },
  pass: { color: '#ff3a8a', make: (GFX) => new GFX.BoxGeometry(0.16, 0.22, 0.02), y: 0.25 },
  record: { color: '#ffcf4a', make: (GFX) => new GFX.CylinderGeometry(0.2, 0.2, 0.02, 24), y: 0.3, tilt: true },
};

/** A pickup to put in the world: its sculpted model as soon as it is baked, a stand-in till then. */
export function createPickupMesh(GFX, kind, { amount = 10 } = {}) {
  const group = new GFX.Group();
  const standIn = new GFX.Group();
  const s = STAND_INS[kind];
  if (s) {
    const m = new GFX.Mesh(s.make(GFX), new GFX.MeshStandardMaterial({ color: new GFX.Color(s.color), roughness: 0.4, metalness: 0.4, emissive: new GFX.Color(s.color), emissiveIntensity: 0.25 }));
    m.position.y = s.y;
    if (s.tilt) m.rotation.x = Math.PI / 2;
    standIn.add(m);
  }
  group.add(standIn);
  const put = () => {
    const prop = createStatic(GFX, PROPS[kind]);
    // A heap as big as what's in it.
    if (kind === 'pick') prop.scale.setScalar(0.95 + 0.55 * Math.min(1, Math.max(0, (amount - 3) / 30)));
    group.add(prop);
    group.remove(standIn);
  };
  if (PROPS[kind]) {
    if (isBaked(kind, 1)) put();
    else if (typeof window !== 'undefined') ready(kind, 1).then(put);
  }
  return { group };
}

