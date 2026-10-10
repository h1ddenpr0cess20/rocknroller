import { canvas, cached, grilleTexture, random, texture, tiled } from './textures.js';

/**
 * What the venues are furnished with. Each prop stands over the tiles of a
 * wall block (`Venue.pillar`/`block` with a `prop`), which is what Rock
 * bumps into; the prop is drawn over it, so it should fill its footprint.
 * Heights are kept low, so a prop in front of Rock never hides him.
 *
 * A prop is a function `(GFX, spec) => { group, update?(time, beat) }`,
 * with `spec` = { w, d, rise, rot, base, venue, ...whatever the venue gave }.
 * It stands on y = 0 at the middle of its footprint, front toward +z (`rot`
 * turns it; the group is placed and turned by `createProps`).
 */

const std = (GFX, hex, o = {}) => new GFX.MeshStandardMaterial({ color: new GFX.Color(hex), roughness: 0.6, ...o });
const shadowed = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };

/** Black cabinet tolex, with a grain you can only just see. */
function tolexTexture(GFX) {
  return cached('tolex', () => {
    const [c, ctx] = canvas(128);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, 128, 128);
    const rnd = random(3);
    for (let k = 0; k < 1400; k++) {
      ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.18})`;
      ctx.fillRect(rnd() * 128, rnd() * 128, 2, 2);
    }
    const t = texture(GFX, c, { wrap: true });
    return { map: t, bump: t };
  });
}

/** An amp's face: a silver plate with a row of knobs' marks and a name. */
function plateTexture(GFX, text) {
  return cached(`plate:${text}`, () => {
    const [c, ctx] = canvas(256, 64);
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, '#d9dce2'); g.addColorStop(1, '#9ea3ad');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#16161a';
    ctx.font = '700 26px "Anton", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 28);
    for (let k = 0; k < 7; k++) {
      ctx.beginPath(); ctx.arc(26 + k * 34, 48, 3, 0, 7); ctx.fill();
    }
    return { map: texture(GFX, c), bump: null };
  });
}

/** A guitar amp stack: a head over a cabinet, a big cone behind cloth on the front. */
function amp(GFX, { venue }) {
  const group = new GFX.Group();
  const tolex = tolexTexture(GFX);
  const grille = grilleTexture(GFX);
  const black = std(GFX, '#1a1a1d', { map: tolex.map, bumpMap: tolex.bump, bumpScale: 0.6, roughness: 0.85 });
  const front = new GFX.MeshStandardMaterial({ color: new GFX.Color('#ffffff'), map: tiled(GFX, grille.map, 2, 1), bumpMap: tiled(GFX, grille.bump, 2, 1), bumpScale: 1.2, roughness: 0.6 });
  const metal = std(GFX, '#b9bdc6', { metalness: 0.9, roughness: 0.3 });
  const cab = shadowed(new GFX.Mesh(new GFX.BoxGeometry(0.94, 0.62, 0.84), [black, black, black, black, front, black]));
  cab.position.y = 0.31;
  const plate = plateTexture(GFX, venue?.look?.ampName ?? 'ROCK');
  const faceMat = new GFX.MeshStandardMaterial({ color: new GFX.Color('#ffffff'), map: plate.map, roughness: 0.4, metalness: 0.5 });
  const head = shadowed(new GFX.Mesh(new GFX.BoxGeometry(0.94, 0.32, 0.46), [black, black, black, black, faceMat, black]));
  head.position.set(0, 0.62 + 0.16, 0);
  group.add(cab, head);
  // Corners, a handle, a red pilot light.
  for (const sx of [-1, 1]) for (const y of [0.02, 0.6]) {
    const c = new GFX.Mesh(new GFX.BoxGeometry(0.07, 0.07, 0.07), metal);
    c.position.set(sx * 0.46, y, 0.41);
    group.add(c);
  }
  const handle = new GFX.Mesh(new GFX.TorusGeometry(0.1, 0.018, 6, 12, Math.PI), metal);
  handle.position.set(0, 0.94, 0);
  group.add(handle);
  const pilot = new GFX.Mesh(new GFX.SphereGeometry(0.022, 8, 6), new GFX.MeshBasicMaterial({ color: new GFX.Color('#ff3a2a'), toneMapped: false }));
  pilot.position.set(0.4, 0.76, 0.235);
  group.add(pilot);
  group.scale.y = 1;
  return {
    group,
    update(time, beat) { pilot.material.color.setRGB(1, 0.2 + 0.1 * Math.sin(time * 3), 0.15); void beat; },
  };
}

/** A road case: black laminate in a silver frame, latches, a stencil; two of them stacked. */
function roadCase(GFX, { rise }) {
  const group = new GFX.Group();
  const [c, ctx] = canvas(256, 128);
  ctx.fillStyle = '#26262b';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#a9adb6';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 118);
  ctx.fillStyle = '#e9e5da';
  ctx.font = '700 36px "Anton", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FRAGILE', 128, 62);
  ctx.font = '700 18px "Anton", Impact, sans-serif';
  ctx.fillText('THIS WAY UP  ▲', 128, 92);
  ctx.fillStyle = '#c8c8d0';
  ctx.fillRect(100, 110, 56, 8);
  const tex = typeof document === 'undefined' ? null : texture(GFX, c);
  const face = new GFX.MeshStandardMaterial({ color: new GFX.Color('#ffffff'), map: tex, roughness: 0.55 });
  const top = std(GFX, '#202024', { roughness: 0.6 });
  const lower = Math.min(0.56, rise * 0.58);
  const upper = Math.max(0.3, rise - lower - 0.02);
  const a = shadowed(new GFX.Mesh(new GFX.BoxGeometry(0.92, lower, 0.84), [face, face, top, top, face, face]));
  a.position.y = lower / 2;
  const b = shadowed(new GFX.Mesh(new GFX.BoxGeometry(0.82, upper, 0.7), [face, face, top, top, face, face]));
  b.position.set(0.02, lower + upper / 2, 0.02);
  b.rotation.y = 0.06;
  group.add(a, b);
  return { group };
}

/** A drum kit on a riser: a kick drum, snare, toms, hi-hat and cymbals, 2 × 2 tiles. */
function drums(GFX, { w = 2, d = 2, rise }) {
  const group = new GFX.Group();
  const carpet = std(GFX, '#3a2428', { roughness: 0.98 });
  const riser = shadowed(new GFX.Mesh(new GFX.BoxGeometry(w * 0.98, rise, d * 0.98), carpet));
  riser.position.y = rise / 2;
  group.add(riser);
  const shell = std(GFX, '#b8232f', { roughness: 0.2, clearcoat: 1 });
  const skin = std(GFX, '#ece8dc', { roughness: 0.5 });
  const chrome = std(GFX, '#d6d9e0', { metalness: 1, roughness: 0.18 });
  const brass = std(GFX, '#e0b44a', { metalness: 1, roughness: 0.25, emissive: new GFX.Color('#3a2400'), emissiveIntensity: 0.4 });
  const drum = (r, h, x, y, z, tilt = 0) => {
    const g = new GFX.Group();
    const body = new GFX.Mesh(new GFX.CylinderGeometry(r, r, h, 20), shell);
    const head = new GFX.Mesh(new GFX.CylinderGeometry(r * 0.94, r * 0.94, 0.012, 20), skin);
    head.position.y = h / 2 + 0.004;
    const rim = new GFX.Mesh(new GFX.TorusGeometry(r, 0.012, 6, 20), chrome);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = h / 2;
    g.add(body, head, rim);
    g.position.set(x, y, z);
    g.rotation.x = tilt;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  };
  const top = rise;
  // The kick faces the front, on its side.
  const kick = drum(0.3, 0.42, 0, top + 0.3, -0.1);
  kick.rotation.x = Math.PI / 2;
  const snare = drum(0.15, 0.13, 0.36, top + 0.42, 0.34);
  const tom1 = drum(0.12, 0.14, -0.1, top + 0.66, 0.1, 0.35);
  const tom2 = drum(0.14, 0.15, 0.2, top + 0.66, 0.1, 0.35);
  const floorTom = drum(0.19, 0.28, -0.5, top + 0.3, 0.28);
  group.add(kick, snare, tom1, tom2, floorTom);
  const cymbal = (r, x, y, z, tilt) => {
    const g = new GFX.Group();
    const disc = new GFX.Mesh(new GFX.CylinderGeometry(r, r * 0.96, 0.012, 24), brass);
    const stand = new GFX.Mesh(new GFX.CylinderGeometry(0.01, 0.01, y - top, 6), chrome);
    stand.position.y = -(y - top) / 2;
    disc.rotation.x = tilt;
    g.add(disc, stand);
    g.position.set(x, y, z);
    return g;
  };
  group.add(cymbal(0.2, -0.5, top + 0.82, -0.2, 0.15), cymbal(0.22, 0.55, top + 0.84, -0.15, -0.12), cymbal(0.14, 0.62, top + 0.52, 0.42, 0.05));
  const stool = new GFX.Mesh(new GFX.CylinderGeometry(0.15, 0.15, 0.1, 14), std(GFX, '#202024'));
  stool.position.set(0.0, top + 0.32, 0.62);
  const leg = new GFX.Mesh(new GFX.CylinderGeometry(0.02, 0.02, 0.28, 6), chrome);
  leg.position.set(0, top + 0.16, 0.62);
  group.add(stool, leg);
  return { group };
}

/** A PA speaker on a stand: a tall black cabinet, cone behind a grille, a horn above. */
function speaker(GFX, { rise }) {
  const group = new GFX.Group();
  const tolex = tolexTexture(GFX);
  const grille = grilleTexture(GFX);
  const black = std(GFX, '#17171a', { map: tolex.map, bumpMap: tolex.bump, bumpScale: 0.6, roughness: 0.85 });
  const front = new GFX.MeshStandardMaterial({ color: new GFX.Color('#ffffff'), map: grille.map, bumpMap: grille.bump, bumpScale: 1.2, roughness: 0.6 });
  const body = shadowed(new GFX.Mesh(new GFX.BoxGeometry(0.88, rise, 0.74), [black, black, black, black, front, black]));
  body.position.y = rise / 2;
  const horn = shadowed(new GFX.Mesh(new GFX.CylinderGeometry(0.12, 0.2, 0.18, 14), std(GFX, '#2a2a30', { metalness: 0.6 })));
  horn.rotation.x = Math.PI / 2;
  horn.position.set(0, rise * 0.84, 0.4);
  group.add(body, horn);
  return { group };
}

/** A box, for a prop with no look of its own yet. */
function plain(GFX, { w = 1, d = 1, rise }) {
  const group = new GFX.Group();
  const m = shadowed(new GFX.Mesh(new GFX.BoxGeometry(w * 0.96, rise, d * 0.96), std(GFX, '#555560')));
  m.position.y = rise / 2;
  group.add(m);
  return { group };
}

export const PROPS = { amp, case: roadCase, drums, speaker };

/**
 * The props of a venue, each over its tiles: { group, update(time, beat) }.
 * A venue's `props` name them by kind; one with no look gets a plain box.
 */
export function createProps(GFX, venue, extra = {}) {
  const group = new GFX.Group();
  group.name = 'props';
  const library = { ...PROPS, ...extra };
  const live = [];
  for (const spec of venue.props) {
    if (spec.free) continue;
    const make = library[spec.kind] ?? plain;
    const made = make(GFX, { ...spec, venue });
    const holder = new GFX.Group();
    holder.position.set(spec.x + spec.w / 2, spec.base, spec.z + spec.d / 2);
    holder.rotation.y = spec.rot ?? 0;
    holder.add(made.group);
    group.add(holder);
    if (made.update) live.push(made);
  }
  return {
    group,
    update(time, beat) { for (const p of live) p.update(time, beat); },
  };
}
