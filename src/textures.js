/**
 * Every texture, painted on a canvas at startup: the floors and walls of the
 * venues (concrete, planks, lino, carpet, diamond plate, grass; plywood, foam,
 * brick papered with gig posters, curtain, corrugated iron, damask), and the
 * bits and pieces that go with them (speaker grilles, gaff tape, shutters,
 * glows, beams). A floor texture is one tile across and a wall texture one
 * tile across and high, and each comes with a `bump` map. Colour mostly comes
 * from the tile or wall under it, so the maps are near white. Under node (the
 * tests) there is no canvas, and everything is `{ map: null, bump: null }`.
 */

const textures = new Map();

/** A seeded random source, so every venue is painted the same. */
export function random(seed) {
  let s = (seed >>> 0) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function texture(GFX, c, { srgb = true, wrap = false } = {}) {
  const t = new GFX.CanvasTexture(c);
  if (srgb) t.colorSpace = GFX.SRGBColorSpace;
  t.anisotropy = 8;
  if (wrap) t.wrapS = t.wrapT = GFX.RepeatWrapping;
  return t;
}

const none = () => ({ map: null, bump: null });

/** A texture of its own over the same canvas, for something that turns or scrolls its texture by itself. */
export function copyOf(GFX, tex) {
  if (!tex) return null;
  const t = new GFX.CanvasTexture(tex.image);
  t.colorSpace = tex.colorSpace;
  t.anisotropy = tex.anisotropy;
  t.wrapS = t.wrapT = GFX.RepeatWrapping;
  return t;
}

const tiledMaps = new Map();

/**
 * `tex` repeated `rx` by `ry` times over whatever it is on: a texture of its
 * own, sharing the canvas, made once for each size. (Textures here don't
 * clone.) Null if there is no texture, as under node.
 */
export function tiled(GFX, tex, rx, ry = 1) {
  if (!tex) return null;
  const key = `${tex.id}:${rx}:${ry}`;
  if (!tiledMaps.has(key)) {
    const t = new GFX.CanvasTexture(tex.image);
    t.colorSpace = tex.colorSpace;
    t.anisotropy = tex.anisotropy;
    t.wrapS = t.wrapT = GFX.RepeatWrapping;
    t.repeat.set(rx, ry);
    tiledMaps.set(key, t);
  }
  return tiledMaps.get(key);
}

export const cached = (key, make) => {
  if (typeof document === 'undefined') return none();
  if (!textures.has(key)) textures.set(key, make());
  return textures.get(key);
};

export function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Value noise that wraps every `period` cells, so a texture painted with it tiles. */
function periodic(seed, period) {
  const rnd = random(seed);
  const grid = Array.from({ length: period * period }, () => rnd());
  const at = (i, j) => grid[(((j % period) + period) % period) * period + (((i % period) + period) % period)];
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y);
    const u = x - i, v = y - j;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * su;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * su;
    return a + (b - a) * sv;
  };
}

/** Fractal noise over a few octaves of `periodic`, 0 to 1, tiling across `cells` cells. */
function fractal(seed, cells = 4, octaves = 4) {
  const layers = Array.from({ length: octaves }, (_, o) => periodic(seed + o * 101, cells * 2 ** o));
  return (u, v) => {
    let sum = 0, amp = 0.5, total = 0;
    for (let o = 0; o < octaves; o++) {
      sum += layers[o](u * cells * 2 ** o, v * cells * 2 ** o) * amp;
      total += amp;
      amp *= 0.5;
    }
    return sum / total;
  };
}

/** Paints a `size`-square canvas a pixel at a time: `shade(u, v)` gives [r, g, b] each 0 to 255. */
function pixels(size, shade) {
  const [c, ctx] = canvas(size);
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = shade(x / size, y / size);
      const i = (y * size + x) * 4;
      image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = b; image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return c;
}

const grey = (v) => [v, v, v].map((x) => Math.max(0, Math.min(255, x)));

/** A map and a bump map from one pair of painters. */
function pair(GFX, size, color, height, opts = {}) {
  return { map: texture(GFX, color(size), opts), bump: texture(GFX, height(size), { srgb: false, ...opts }) };
}

// ———————————————————————————————————————————————————————————— floors

/**
 * Poured concrete, a slab to the tile: speckled, stained here and there with
 * oil, joints at two edges, a hairline crack. The garage, the dock, the arena.
 */
function concrete(GFX) {
  const n = fractal(7, 4, 5), grit = fractal(19, 32, 2), stain = fractal(41, 3, 3);
  const rnd = random(5);
  const cracks = Array.from({ length: 2 }, () => {
    let x = rnd(), y = rnd();
    const pts = [[x, y]];
    for (let k = 0; k < 7; k++) { x += (rnd() - 0.5) * 0.18; y += (rnd() - 0.5) * 0.18; pts.push([x, y]); }
    return pts;
  });
  const paint = (relief) => (size) => {
    const c = pixels(size, (u, v) => {
      const base = 0.8 + n(u, v) * 0.14 + (grit(u, v) - 0.5) * 0.1;
      const oil = smoothstep(0.7, 0.9, stain(u, v)) * 0.16;
      const joint = Math.min(u, v) < 0.006 ? 0.8 : 1;
      const k = relief ? 0.55 + n(u, v) * 0.4 + (grit(u, v) - 0.5) * 0.2 : base - oil * 0.8;
      return grey(Math.round(255 * k * joint));
    });
    const ctx = c.getContext('2d');
    ctx.strokeStyle = relief ? '#202020' : 'rgba(40,36,32,0.5)';
    ctx.lineWidth = relief ? 2 : 1.2;
    for (const pts of cracks) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * size, y * size) : ctx.moveTo(x * size, y * size)));
      ctx.stroke();
    }
    return c;
  };
  return pair(GFX, 256, paint(false), paint(true));
}

/** Boards, three to the tile, laid end to end: each its own shade, a soft grain, dark thin seams and nail heads. Stage decks and barroom floors. */
function planks(GFX) {
  const rnd = random(23);
  const boards = Array.from({ length: 3 }, () => ({ tone: 0.8 + rnd() * 0.2, offset: rnd() * 5, butt: 0.15 + rnd() * 0.7 }));
  const grain = fractal(3, 2, 4);
  const paint = (relief) => (size) => {
    const [c, ctx] = canvas(size);
    ctx.fillStyle = relief ? '#000' : '#1a1410';
    ctx.fillRect(0, 0, size, size);
    const w = size / boards.length;
    const img = ctx.getImageData(0, 0, size, size);
    boards.forEach((b, i) => {
      for (let y = 0; y < size; y++) {
        for (let x = Math.floor(i * w) + 1; x < Math.floor((i + 1) * w) - 1; x++) {
          // Long soft figure along the board, with a faint fine grain across it.
          const along = y / size, across = (x - i * w) / w;
          const g = grain(across * 0.7 + i * 1.3, along * 0.25 + b.offset);
          const fine = 0.5 + 0.5 * Math.sin((across * 9 + g * 6) * Math.PI);
          const shade = relief ? 0.55 + g * 0.25 + fine * 0.08 : b.tone * (0.84 + g * 0.2 + fine * 0.04);
          const edge = Math.min(across, 1 - across) < 0.03 ? 0.78 : 1;
          const v = Math.round(255 * Math.min(1, shade * edge));
          const k = (y * size + x) * 4;
          img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
        }
      }
    });
    ctx.putImageData(img, 0, 0);
    boards.forEach((b, i) => {
      const x = i * w;
      ctx.fillStyle = relief ? '#000' : '#14100c';
      ctx.fillRect(x + 1, b.butt * size, w - 2, 2);
      ctx.fillStyle = relief ? '#fff' : '#4a3a2c';
      for (const y of [b.butt * size - 10, b.butt * size + 11]) {
        ctx.beginPath(); ctx.arc(x + 9, y, 1.8, 0, 7); ctx.arc(x + w - 9, y, 1.8, 0, 7); ctx.fill();
      }
    });
    return c;
  };
  return pair(GFX, 256, paint(false), paint(true));
}

/** Linoleum: two by two squares, light and dark, scuffed and worn at the edges. The dive bar. */
function checker(GFX) {
  const n = fractal(11, 6, 4);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    const cx = Math.floor(u * 2), cy = Math.floor(v * 2);
    const dark = (cx + cy) % 2;
    const fx = (u * 2) % 1, fy = (v * 2) % 1;
    const edge = Math.min(fx, fy, 1 - fx, 1 - fy);
    const wear = n(u, v);
    const grime = smoothstep(0.1, 0.0, edge) * 0.25;
    const base = dark ? 0.42 : 0.96;
    const k = relief ? 0.6 + wear * 0.3 - (edge < 0.012 ? 0.5 : 0) : (base - grime) * (0.84 + wear * 0.26) * (edge < 0.012 ? 0.45 : 1);
    return grey(Math.round(255 * k));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** Carpet: a field of woven pile with a diamond pattern laid in it. The theatre. */
function carpet(GFX) {
  const pile = fractal(31, 48, 2), cloud = fractal(5, 3, 3);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    // Diamonds, a tile across, with a small one inside each.
    const a = Math.abs((u * 2) % 1 - 0.5) + Math.abs((v * 2) % 1 - 0.5);
    const big = smoothstep(0.34, 0.3, a), small = smoothstep(0.14, 0.1, a);
    const line = smoothstep(0.025, 0, Math.abs(a - 0.42));
    const p = pile(u, v);
    const k = relief ? 0.5 + p * 0.5 : (0.7 + 0.18 * big + 0.28 * small + 0.3 * line) * (0.82 + p * 0.3) * (0.92 + cloud(u, v) * 0.14);
    return grey(Math.round(255 * Math.min(1, k)));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** Diamond plate: raised lozenges in alternating directions. The loading dock. */
function plate(GFX) {
  const wear = fractal(13, 5, 4);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    const cells = 4;
    const cu = (u * cells) % 1, cv = (v * cells) % 1;
    const flip = (Math.floor(u * cells) + Math.floor(v * cells)) % 2;
    // A lozenge: a thin diamond along one of the diagonals.
    const x = cu - 0.5, y = (flip ? cv : 1 - cv) - 0.5;
    const along = (x + y) * 0.7071, across = (x - y) * 0.7071;
    const d = Math.hypot(along / 0.4, across / 0.095);
    const raised = smoothstep(1, 0.7, d);
    const w = wear(u, v);
    const k = relief ? 0.2 + raised * 0.8 : (0.58 + raised * 0.34) * (0.8 + w * 0.3);
    return grey(Math.round(255 * Math.min(1, k)));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** Grass, trodden and thin in patches: a blotchy lawn with blades in it. The festival. */
function grass(GFX) {
  const patch = fractal(17, 3, 4), blade = fractal(29, 64, 2);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    const p = patch(u, v), b = blade(u, v);
    const k = relief ? 0.4 + b * 0.6 : (0.62 + p * 0.38) * (0.74 + b * 0.4);
    return grey(Math.round(255 * Math.min(1, k)));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** Dance-floor panels: two by two glossy squares in two shades, a bright bevel round each. The club. */
function panels(GFX) {
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    const cx = Math.floor(u * 2), cy = Math.floor(v * 2);
    const alt = (cx + cy) % 2;
    const fx = (u * 2) % 1, fy = (v * 2) % 1;
    const edge = Math.min(fx, fy, 1 - fx, 1 - fy);
    const bevel = smoothstep(0.1, 0.02, edge);
    const gap = edge < 0.022 ? 1 : 0;
    const k = relief ? 0.7 - gap * 0.7 - bevel * 0.1 : gap ? 0.1 : (alt ? 0.62 : 1) * (0.9 + bevel * 0.2);
    return grey(Math.round(255 * Math.min(1, k)));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** Trodden mud: wet brown churned with the prints of a thousand boots. Sticky floors. */
function mud(GFX) {
  const a = fractal(37, 4, 5), b = fractal(53, 12, 3);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    const churn = a(u, v), rut = b(u, v);
    const puddle = smoothstep(0.52, 0.6, churn);
    const k = relief ? 0.35 + churn * 0.5 + rut * 0.2 : (0.7 + rut * 0.3) * (1 - puddle * 0.35);
    return grey(Math.round(255 * Math.min(1, k)));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** A belt: dark rubber with a chevron pointing along it (v), which the scenery scrolls. */
function belt(GFX) {
  const rub = fractal(61, 24, 2);
  const [c, ctx] = canvas(256);
  const image = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const u = x / 256, v = y / 256;
      // The bright chevron: a V pointing up the texture (toward +v, which is the top row when flipped).
      const w = Math.abs(u - 0.5);
      const line = Math.abs(((1 - v) - 0.15 - w * 0.9) % 0.5);
      const chevron = smoothstep(0.05, 0.02, Math.min(line, 0.5 - line)) * (w < 0.42 ? 1 : 0);
      const k = (0.2 + rub(u, v) * 0.12) + chevron * 0.75;
      const i = (y * 256 + x) * 4;
      const val = Math.round(255 * Math.min(1, k));
      image.data[i] = val; image.data[i + 1] = val; image.data[i + 2] = Math.round(val * 0.9); image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const t = texture(GFX, c, { wrap: true });
  return { map: t, bump: null };
}

export const FLOORS = { concrete, planks, checker, carpet, plate, grass, panels, mud };

// ———————————————————————————————————————————————————————————— walls

/** Poster names, for the walls: the bands every venue has had on its walls. */
const BANDS = ['THE DEAD BATTERIES', 'GRAVEL PIT', 'VELVET HAMMER', 'WET CONCRETE', 'THE FEEDBACKS', 'SKULL SOCKS', 'CRASH TEST', 'LOUD NEIGHBOURS', 'DEAD AIR', 'MOSH POTATO', 'SIXTH STRING', 'THE RIFFRAFF'];

/** Bricks, a tile wide and a tile high: four courses, each set half a brick over from the last. With `posters`, papered with gig flyers. */
function brick(GFX, { posters = false } = {}) {
  const size = 256;
  const rnd = random(5);
  const tones = Array.from({ length: 40 }, () => rnd());
  const paint = (face, joint, vary, art) => {
    const [c, ctx] = canvas(size);
    ctx.fillStyle = joint;
    ctx.fillRect(0, 0, size, size);
    const rows = 4, per = 2, bh = size / rows, bw = size / per;
    let n = 0;
    for (let r = 0; r < rows; r++) {
      const shift = (r % 2) * bw / 2;
      for (let k = -1; k < per + 1; k++) {
        const x = k * bw + shift;
        ctx.fillStyle = vary ? mix(face, '#8a847a', tones[n++ % tones.length] * 0.5) : face;
        ctx.beginPath();
        ctx.roundRect(x + 4, r * bh + 4, bw - 8, bh - 8, 5);
        ctx.fill();
      }
    }
    if (art) art(ctx);
    return c;
  };
  const poster = (ctx) => {
    const r = random(77);
    const pick = (list) => list[Math.floor(r() * list.length)];
    // A flyer: a bold block of colour, a big shape, a name in poster letters, tape at the corners.
    const flyer = (x, y, w, h, bg, fg, name, shape, tilt) => {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(tilt);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
      ctx.fillStyle = bg;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = fg;
      if (shape === 'sun') {
        ctx.beginPath(); ctx.arc(0, -h * 0.08, w * 0.34, 0, 7); ctx.fill();
        for (let k = 0; k < 12; k++) {
          ctx.save(); ctx.rotate((k / 12) * Math.PI * 2); ctx.fillRect(-2, -w * 0.5, 4, w * 0.12); ctx.restore();
        }
      } else if (shape === 'bolt') {
        ctx.beginPath(); ctx.moveTo(w * 0.1, -h * 0.42); ctx.lineTo(-w * 0.28, h * 0.02); ctx.lineTo(-w * 0.02, h * 0.02); ctx.lineTo(-w * 0.14, h * 0.3); ctx.lineTo(w * 0.3, -h * 0.08); ctx.lineTo(w * 0.04, -h * 0.08); ctx.closePath(); ctx.fill();
      } else {
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(0, -h * 0.05, w * (0.36 - k * 0.07), 0, 7); ctx.lineWidth = 5; ctx.strokeStyle = k % 2 ? bg : fg; ctx.fillStyle = k % 2 ? bg : fg; ctx.fill(); }
      }
      ctx.fillStyle = '#0c0c10';
      ctx.fillRect(-w / 2, h * 0.28, w, h * 0.22);
      ctx.fillStyle = fg;
      ctx.font = `${Math.round(h * 0.15)}px "Anton", Impact, "Arial Narrow", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 0, h * 0.39, w - 8);
      ctx.fillStyle = 'rgba(240,230,190,0.85)';
      ctx.fillRect(-w / 2 - 5, -h / 2 - 3, 18, 8);
      ctx.fillRect(w / 2 - 13, -h / 2 - 3, 18, 8);
      ctx.restore();
    };
    const names = BANDS.map((b) => b.split(' ').slice(0, 2).join(' '));
    flyer(10, 18, 104, 138, pick(['#e63a6a', '#2ac6e8', '#f5c518']), '#ffffff', pick(names), 'sun', -0.05);
    flyer(134, 96, 112, 142, pick(['#8a4be8', '#3ae88a', '#ff7a1a']), '#101014', pick(names), 'bolt', 0.04);
    flyer(150, 8, 80, 78, '#f5f0e6', '#d9232f', 'LIVE', 'rings', 0.06);
  };
  return {
    map: texture(GFX, paint(posters ? '#b8a89a' : '#e2ddd4', '#3a342e', true, posters ? poster : null)),
    bump: texture(GFX, paint('#ffffff', '#000000', false), { srgb: false }),
  };
}

/** Plywood: a sheet to the tile, screwed to the studs, with a stencilled mark. The garage. */
function plywood(GFX) {
  const grain = fractal(43, 3, 4);
  const rnd = random(9);
  const knots = Array.from({ length: 4 }, () => [rnd(), rnd(), 0.015 + rnd() * 0.02]);
  const paint = (relief) => (size) => {
    const c = pixels(size, (u, v) => {
      const g = grain(u * 0.5, v * 6);
      const lines = 0.5 + 0.5 * Math.sin(v * 90 + g * 14);
      let k = relief ? 0.5 + g * 0.3 + lines * 0.1 : 0.62 + g * 0.3 + lines * 0.07;
      for (const [x, y, r] of knots) {
        const d = Math.hypot((u - x) * 1.6, v - y) / r;
        if (d < 1) k *= relief ? 0.7 : 0.62 + 0.38 * d;
      }
      const seam = Math.min(u, 1 - u) < 0.008 || v < 0.006 ? 0.35 : 1;
      return grey(Math.round(255 * Math.min(1, k) * seam));
    });
    const ctx = c.getContext('2d');
    // Screws along the studs.
    ctx.fillStyle = relief ? '#fff' : '#403830';
    for (const x of [16, 128, 240]) for (const y of [20, 100, 180, 240]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    return c;
  };
  return pair(GFX, 256, paint(false), paint(true));
}

/** Acoustic foam: wedges in a grid, each lit on one side. Practice rooms and studios. */
function foam(GFX) {
  const sp = fractal(71, 16, 2);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    const cells = 4;
    const fu = (u * cells) % 1, fv = (v * cells) % 1;
    // A pyramid in each cell: height falls away from the middle.
    const h = 1 - Math.max(Math.abs(fu - 0.5), Math.abs(fv - 0.5)) * 2;
    const light = 0.55 + (fu - fv) * 0.5 * (1 - h * 0.2);
    const k = relief ? h : (0.3 + h * 0.6 * light) * (0.85 + sp(u, v) * 0.25);
    return grey(Math.round(255 * Math.max(0, Math.min(1, k))));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** Curtain: deep vertical folds, a tile wide. The stage drapes. */
function curtain(GFX) {
  const wob = fractal(83, 4, 2);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    const f = Math.sin((u * 4 + wob(u, v * 0.2) * 0.6) * Math.PI * 2);
    const fold = 0.5 + 0.5 * f;
    const k = relief ? 0.3 + fold * 0.7 : 0.45 + fold * 0.55 - v * 0.05;
    return grey(Math.round(255 * k));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** Corrugated iron: vertical ribs. The dock, the tents. */
function corrugated(GFX) {
  const rust = fractal(89, 5, 4);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    const rib = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 8);
    const r = rust(u, v);
    const k = relief ? 0.2 + rib * 0.8 : (0.5 + rib * 0.45) * (0.8 + r * 0.3);
    return grey(Math.round(255 * Math.min(1, k)));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** Breeze block: three courses of hollow blocks. */
function block(GFX) {
  const n = fractal(97, 8, 3);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    const rows = 3;
    const r = Math.floor(v * rows), fr = (v * rows) % 1;
    const shift = (r % 2) * 0.25;
    const fu = ((u + shift) * 2) % 1;
    const joint = Math.min(fr, 1 - fr) < 0.045 || Math.min(fu, 1 - fu) < 0.03;
    const k = relief ? (joint ? 0 : 0.6 + n(u, v) * 0.3) : joint ? 0.28 : 0.74 + n(u, v) * 0.26;
    return grey(Math.round(255 * k));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

/** Damask paper over panelling, with a gold rail: the theatre's walls. */
function damask(GFX) {
  const n = fractal(101, 6, 2);
  const paint = (relief) => (size) => pixels(size, (u, v) => {
    // A repeating motif: a lozenge with a bud in it.
    const fu = (u * 2) % 1 - 0.5, fv = (v * 2) % 1 - 0.5;
    const d = Math.abs(fu) * 1.4 + Math.abs(fv);
    const motif = smoothstep(0.34, 0.3, d) * (1 - smoothstep(0.2, 0.16, d)) + smoothstep(0.08, 0.04, Math.hypot(fu, fv));
    const rail = v > 0.9 ? 1 : 0;
    const k = relief ? 0.4 + motif * 0.5 + rail * 0.3 : (0.55 + motif * 0.45) * (0.9 + n(u, v) * 0.15) + rail * 0.3;
    return grey(Math.round(255 * Math.min(1, k)));
  });
  return pair(GFX, 256, paint(false), paint(true));
}

export const WALLS = {
  brick: (GFX) => brick(GFX),
  posters: (GFX) => brick(GFX, { posters: true }),
  plywood, foam, curtain, corrugated, block, damask,
};

/** The floor texture called `name`, painted once. */
export function floorTexture(GFX, name = 'concrete') {
  return cached(`floor:${name}`, () => (FLOORS[name] ?? FLOORS.concrete)(GFX));
}

/** The wall texture called `name`, painted once. */
export function wallTexture(GFX, name = 'brick') {
  return cached(`wall:${name}`, () => (WALLS[name] ?? WALLS.brick)(GFX));
}

/** A conveyor belt's chevrons. */
export function beltTexture(GFX) {
  return cached('belt', () => belt(GFX));
}

// ———————————————————————————————————————————————————————————— the machinery's

/** A speaker cabinet's face: black cloth over a big cone, silver trim. */
export function grilleTexture(GFX) {
  return cached('grille', () => {
    const size = 256;
    const paint = (relief) => {
      const [c, ctx] = canvas(size);
      ctx.fillStyle = relief ? '#808080' : '#18181b';
      ctx.fillRect(0, 0, size, size);
      const mid = size / 2;
      // The cone behind the cloth: rings, a dust cap, a glint.
      for (let r = 108; r > 10; r -= 7) {
        ctx.strokeStyle = relief ? (r % 14 ? '#c0c0c0' : '#606060') : (r % 14 ? '#2a2a30' : '#0e0e10');
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(mid, mid, r, 0, 7); ctx.stroke();
      }
      ctx.fillStyle = relief ? '#fff' : '#33343a';
      ctx.beginPath(); ctx.arc(mid, mid, 22, 0, 7); ctx.fill();
      // Cloth weave.
      ctx.fillStyle = relief ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)';
      for (let y = 0; y < size; y += 3) for (let x = (y / 3) % 2 ? 0 : 1; x < size; x += 3) ctx.fillRect(x, y, 1, 1);
      // Trim.
      ctx.strokeStyle = relief ? '#fff' : '#9ea3ad';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, size - 8, size - 8);
      return c;
    };
    return { map: texture(GFX, paint(false), { wrap: true }), bump: texture(GFX, paint(true), { srgb: false, wrap: true }) };
  });
}

/** Black stage deck with gaff tape laid across it, and the glow of spike marks. */
export function gaffTexture(GFX) {
  return cached('gaff', () => {
    const size = 256;
    const rnd = random(61);
    const paint = (relief) => {
      const [c, ctx] = canvas(size);
      ctx.fillStyle = relief ? '#909090' : '#1c1c20';
      ctx.fillRect(0, 0, size, size);
      for (let k = 0; k < 400; k++) {
        ctx.fillStyle = relief ? `rgba(255,255,255,${rnd() * 0.3})` : `rgba(255,255,255,${rnd() * 0.05})`;
        ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
      }
      // Plywood seams.
      ctx.strokeStyle = relief ? '#000' : '#08080a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(size, 2); ctx.moveTo(2, 0); ctx.lineTo(2, size); ctx.stroke();
      // Gaff tape: a strip along the edge, and a spike mark.
      ctx.fillStyle = relief ? '#bbb' : '#cfd2d8';
      ctx.fillRect(0, 14, size, 8);
      ctx.fillStyle = relief ? '#bbb' : '#ffcf3a';
      ctx.fillRect(size * 0.5 - 18, size * 0.5 - 4, 36, 8);
      ctx.fillRect(size * 0.5 - 4, size * 0.5 - 18, 8, 36);
      return c;
    };
    return { map: texture(GFX, paint(false), { wrap: true }), bump: texture(GFX, paint(true), { srgb: false, wrap: true }) };
  });
}

/** A roll-up shutter: ribbed steel, scuffed, with STAFF ONLY stencilled across it and hazard stripes at the foot. */
export function shutterTexture(GFX) {
  return cached('shutter', () => {
    const size = 256;
    const rnd = random(13);
    const paint = (relief) => {
      const [c, ctx] = canvas(size);
      ctx.fillStyle = relief ? '#808080' : '#8d939d';
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 16) {
        ctx.fillStyle = relief ? '#fff' : 'rgba(255,255,255,0.28)';
        ctx.fillRect(0, y, size, 3);
        ctx.fillStyle = relief ? '#000' : 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, y + 11, size, 5);
      }
      if (!relief) {
        for (let k = 0; k < 60; k++) {
          ctx.fillStyle = `rgba(60,40,30,${rnd() * 0.12})`;
          ctx.fillRect(rnd() * size, rnd() * size, 2 + rnd() * 18, 1 + rnd() * 5);
        }
        ctx.fillStyle = '#c8261d';
        ctx.font = '800 54px Impact, "Arial Narrow", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('STAFF', size / 2, 98);
        ctx.fillText('ONLY', size / 2, 156);
        // Hazard stripes along the bottom rail.
        for (let x = -20; x < size; x += 32) {
          ctx.fillStyle = '#f0c020';
          ctx.beginPath(); ctx.moveTo(x, size); ctx.lineTo(x + 16, size); ctx.lineTo(x + 32, size - 24); ctx.lineTo(x + 16, size - 24); ctx.fill();
        }
      }
      return c;
    };
    return { map: texture(GFX, paint(false), { wrap: true }), bump: texture(GFX, paint(true), { srgb: false, wrap: true }) };
  });
}

/**
 * The look of a stage flat, by name: `flat` (black-painted ply with gaff tape
 * on it), `drywall`, `wood` and `curtain`. Painted to be just a little
 * different from the wall it hides in, so a keen eye might wonder.
 */
export function panelTexture(GFX, look = 'flat') {
  return cached(`panel:${look}`, () => {
    const size = 256;
    const rnd = random(29);
    const base = { flat: '#34343a', drywall: '#c8c0b0', wood: '#8a6a48', curtain: '#5a1424' }[look] ?? '#34343a';
    const paint = (relief) => {
      const [c, ctx] = canvas(size);
      ctx.fillStyle = relief ? '#909090' : base;
      ctx.fillRect(0, 0, size, size);
      for (let k = 0; k < 300; k++) {
        ctx.fillStyle = relief ? `rgba(255,255,255,${rnd() * 0.3})` : `rgba(255,255,255,${rnd() * 0.06})`;
        ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 3, 1 + rnd() * 2);
      }
      if (!relief) {
        // A hairline crack, staples at the edge, a strip of tape holding it together.
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let x = 40 + rnd() * 120, y = 0;
        ctx.moveTo(x, y);
        while (y < size * 0.7) { x += (rnd() - 0.5) * 26; y += 14 + rnd() * 16; ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(230,230,235,0.8)';
        ctx.fillRect(0, 118, size, 9);
        ctx.fillStyle = '#d0d0d8';
        for (let sx = 12; sx < size; sx += 28) ctx.fillRect(sx, 8, 6, 2);
      }
      return c;
    };
    return { map: texture(GFX, paint(false), { wrap: true }), bump: texture(GFX, paint(true), { srgb: false, wrap: true }) };
  });
}

/** A soft round glow, for halos. White in the middle, clear at the edge: tint it with the material's colour. */
export function glowTexture(GFX) {
  return cached('glow', () => {
    const [c, ctx] = canvas(64);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)');
    g.addColorStop(0.55, 'rgba(255, 255, 255, 0.12)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return { map: texture(GFX, c), bump: null };
  });
}
