import { World } from './physics.js';

/**
 * A venue is a grid of tiles, as a Madness course is: each tile has its own
 * four corner heights, so one structure gives level floors, ramps, steps and
 * channels, with a wall down to whatever is next to it. Where there is no
 * tile there is the dark, and Rock falls into it.
 *
 * On top of that a venue has walls — tiles raised well above the floor beside
 * them, which nothing rolls over — electrified floor (`zap`), the stage door
 * (the exit), and everything that lives or lies about in it: the annoying
 * people, speaker stacks that slam down and pyro that fires on the beat,
 * lifts, gates and their passes, picks and road cases and gaff tape, the lamps
 * and the light rig, and the props that dress it.
 *
 * x runs down-right across the screen and z down-left; the camera looks from
 * high x and z, so a venue starts at the back, high up, and winds its way
 * down toward the front. Walls on the back sides of a room (low x, low z) can
 * stand tall without hiding Rock; walls on the front sides are kept low.
 */

/** How far the sides of the venue reach down into the dark below a tile. */
export const DEPTH = 6;

/** Walls on the back sides of a room and on the front, above the floor. */
export const WALL = Object.freeze({ back: 2.2, front: 0.7 });

/** Colour index for wall tops: the last colour in a palette's `tiles`. */
export const CAP = -1;

/** Corner order: (x, z), (x + 1, z), (x, z + 1), (x + 1, z + 1). */
const H00 = 0, H10 = 1, H01 = 2, H11 = 3;

/** Where in a crusher's or a pyro's cycle the slam, or the burst, lands. */
const SLAM_AT = 0.8;
const BURST_AT = 0.6;

export class Venue {
  /**
   * `palette`: `tiles` (floor, stairs, bridges, wall tops), `walls` (the
   * colours down the sides), `ambient`, `trap`, `lift`, `lamp` (a colour) and
   * the rest of what scenery.js reads. `tempo` is the beats a minute the
   * music and everything that moves in time with it keep.
   */
  constructor({ name, act = 1, cols, rows, palette, intro = '', tempo = 120, look = {} }) {
    this.name = name;
    /** Which night of the tour it is: 1 for the first venue. */
    this.act = act;
    this.intro = intro;
    this.tempo = tempo;
    /** How it is dressed: which floor and wall textures, sky, and music. Read by scenery.js and music.js. */
    this.look = look;
    this.cols = cols;
    this.rows = rows;
    this.palette = palette;
    this.cells = new Array(cols * rows).fill(null);
    /** Tiles kept empty — the gaps lifts cross — that no wall is put into. */
    this.open = new Set();
    this.start = { x: 0, z: 0 };
    this.foes = [];
    this.crushers = [];
    this.spikes = [];
    this.lifts = [];
    this.lamps = [];
    this.fixtures = [];
    this.props = [];
    this.bumpers = [];
    this.pickups = [];
    this.doors = [];
  }

  /** The length of a beat, in seconds. */
  get beat() {
    return 60 / this.tempo;
  }

  cell(x, z) {
    if (x < 0 || z < 0 || x >= this.cols || z >= this.rows) return null;
    return this.cells[z * this.cols + x];
  }

  _check(i, j) {
    if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) throw new Error(`${this.name}: tile ${i},${j} is off the grid`);
  }

  /** Tiles over the rectangle, each corner at `height(X, Z)` (grid coordinates). Floors go over anything. */
  surface(x, z, w, d, height, { color = 0, kind = 'floor', tex = null } = {}) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        this._check(i, j);
        const cell = {
          h: [height(i, j), height(i + 1, j), height(i, j + 1), height(i + 1, j + 1)],
          color, kind,
        };
        if (tex) cell.tex = tex;
        this.cells[j * this.cols + i] = cell;
      }
    }
    return this;
  }

  flat(x, z, w, d, h, opts) {
    return this.surface(x, z, w, d, () => h, opts);
  }

  /** A ramp: `from` along its first edge, `to` along its last, running along `axis`. */
  slope(x, z, w, d, from, to, axis, opts) {
    const along = axis === 'x' ? (X) => (X - x) / w : (X, Z) => (Z - z) / d;
    return this.surface(x, z, w, d, (X, Z) => from + (to - from) * along(X, Z), opts);
  }

  /** A flight of steps along `axis`, a tile deep each: the first at `from`, the last at `to`. */
  stairs(x, z, w, d, from, to, axis, { color = 1, ...opts } = {}) {
    const n = axis === 'x' ? w : d;
    const step = n > 1 ? (to - from) / (n - 1) : 0;
    for (let k = 0; k < n; k++) {
      if (axis === 'x') this.flat(x + k, z, 1, d, from + step * k, { color, ...opts });
      else this.flat(x, z + k, w, 1, from + step * k, { color, ...opts });
    }
    return this;
  }

  /** A ramp banked up toward both sides, like a channel: level across the middle third. */
  chute(x, z, w, d, from, to, axis, { bank = 0.9, ...opts } = {}) {
    const along = axis === 'x' ? (X) => (X - x) / w : (X, Z) => (Z - z) / d;
    const across = axis === 'x' ? (X, Z) => (Z - z) / d : (X) => (X - x) / w;
    return this.surface(x, z, w, d, (X, Z) => from + (to - from) * along(X, Z) + banked(across(X, Z), bank), opts);
  }

  /** A banked corner joining two chutes, curving round its inner corner `pivot`. */
  bend(x, z, size, h, pivot, { bank = 0.9, ...opts } = {}) {
    return this.surface(x, z, size, size, (X, Z) => h + banked(Math.hypot(X - pivot[0], Z - pivot[1]) / size, bank), opts);
  }

  /** A shallow dish, `depth` deep in the middle, level with `h` all round its rim. */
  bowl(x, z, w, d, h, depth, opts) {
    return this.surface(x, z, w, d, (X, Z) => {
      const u = (2 * (X - x)) / w - 1, v = (2 * (Z - z)) / d - 1;
      return h - depth * (1 - u * u) * (1 - v * v);
    }, opts);
  }

  /**
   * Electrified floor, level at `h`: live cables and spilled drinks. Roll onto
   * it and Rock is zapped. With `fill`, only into tiles nothing has been dug
   * in yet — round a bridge, under a lift — and never over floor or wall.
   */
  zap(x, z, w, d, h, { fill = false } = {}) {
    if (!fill) return this.flat(x, z, w, d, h, { kind: 'zap', color: 0 });
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        if (i < 0 || j < 0 || i >= this.cols || j >= this.rows || this.cell(i, j)) continue;
        this.flat(i, j, 1, 1, h, { kind: 'zap', color: 0 });
      }
    }
    return this;
  }

  /** The stage door: the way on to the next venue. */
  exit(x, z, w, d, h) {
    return this.flat(x, z, w, d, h, { kind: 'exit', color: 0 });
  }

  /**
   * Wall over the rectangle, its top at `top`. A wall never goes over floor,
   * and where two walls meet the lower one stands, so a wall that is one
   * room's back wall and another's front never hides Rock in either.
   */
  wall(x, z, w, d, top, { color = CAP, tex = null } = {}) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        this._check(i, j);
        const c = this.cells[j * this.cols + i];
        if ((c && c.kind !== 'wall') || this.open.has(j * this.cols + i)) continue;
        const h = c ? Math.min(c.h[0], top) : top;
        const cell = { h: [h, h, h, h], color, kind: 'wall' };
        if (tex) cell.wtex = tex;
        this.cells[j * this.cols + i] = cell;
      }
    }
    return this;
  }

  /**
   * Walls round the rectangle, one tile thick and just outside it, on the
   * `sides` named — x0 and z0 at the back, x1 and z1 at the front — each
   * standing `back` or `front` above the floor beside it. Floors laid after
   * cut doorways through them. With `lamps`, one sits on the back walls
   * every so many tiles.
   */
  enclose(x, z, w, d, { sides = 'x0 z0 x1 z1', back = WALL.back, front = WALL.front, lamps = 0, color = CAP, wall = null } = {}) {
    const on = new Set(sides.split(/\s+/));
    const floorBeside = (i, j) => {
      const c = this.cell(Math.max(x, Math.min(x + w - 1, i)), Math.max(z, Math.min(z + d - 1, j)));
      return c && c.kind !== 'wall' ? Math.max(...c.h) : null;
    };
    const put = (i, j, rise) => {
      if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return;
      const h = floorBeside(i, j);
      if (h !== null) this.wall(i, j, 1, 1, h + rise, { color, tex: wall });
    };
    // A corner only where both its sides are walled, as high as the lower of them.
    const rise = (a, b) => (on.has(a) && on.has(b) ? Math.min(a[1] === '0' ? back : front, b[1] === '0' ? back : front) : Infinity);
    if (on.has('z0')) for (let i = x; i < x + w; i++) put(i, z - 1, back);
    if (on.has('z1')) for (let i = x; i < x + w; i++) put(i, z + d, front);
    if (on.has('x0')) for (let j = z; j < z + d; j++) put(x - 1, j, back);
    if (on.has('x1')) for (let j = z; j < z + d; j++) put(x + w, j, front);
    for (const [i, j, a, b] of [[x - 1, z - 1, 'x0', 'z0'], [x + w, z - 1, 'x1', 'z0'], [x - 1, z + d, 'x0', 'z1'], [x + w, z + d, 'x1', 'z1']]) {
      const r = rise(a, b);
      if (Number.isFinite(r)) put(i, j, r);
    }
    if (lamps > 0) {
      if (on.has('z0')) for (let i = x + Math.floor(lamps / 2); i < x + w; i += lamps) this.lamp(i, z - 1);
      if (on.has('x0')) for (let j = z + Math.floor(lamps / 2); j < z + d; j += lamps) this.lamp(x - 1, j);
    }
    return this;
  }

  /** A floor with walls round it: a room, or a corridor if it is narrow. */
  room(x, z, w, d, h, { color = 0, floor = null, ...walls } = {}) {
    this.flat(x, z, w, d, h, { color, tex: floor });
    return this.enclose(x, z, w, d, walls);
  }

  /** Lays a different floor — 'planks', 'checker', 'panels', 'carpet', 'mud'... — over the floor tiles in the rectangle. */
  floorOf(x, z, w, d, tex) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        const c = this.cell(i, j);
        if (c && c.kind === 'floor') c.tex = tex;
      }
    }
    return this;
  }

  /** A pillar: wall standing `rise` above the floor under it. With `prop`, it is drawn as that (an amp, a stack of cases...). */
  pillar(x, z, rise = 1.1, { prop = null, rot = 0, wall = null, ...more } = {}) {
    const c = this.cell(x, z);
    const h = c ? Math.max(...c.h) : 0;
    this.cells[z * this.cols + x] = null;
    this.wall(x, z, 1, 1, h + rise, { tex: wall });
    const cell = this.cell(x, z);
    if (prop && cell) {
      cell.prop = prop;
      this.props.push({ kind: prop, x, z, w: 1, d: 1, rot, base: h, rise, ...more });
    }
    return this;
  }

  /** Like `pillar`, but `w` × `d` tiles of it, drawn as one `prop` (a drum kit, a bar, a stack of cases). */
  block(x, z, w, d, rise = 1.0, { prop = null, rot = 0, wall = null, ...more } = {}) {
    let h = 0;
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        const c = this.cell(i, j);
        h = Math.max(h, c ? Math.max(...c.h) : 0);
      }
    }
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        this.cells[j * this.cols + i] = null;
        this.wall(i, j, 1, 1, h + rise, { tex: wall });
        const cell = this.cell(i, j);
        if (prop && cell) cell.prop = prop;
      }
    }
    if (prop) this.props.push({ kind: prop, x, z, w, d, rot, base: h, rise, ...more });
    return this;
  }

  /** Something to look at that nothing collides with: set on the floor (or a wall top) at tile (x, z). */
  prop(kind, x, z, opts = {}) {
    const c = this.cell(x, z);
    this.props.push({ kind, x, z, w: 1, d: 1, rot: 0, base: c ? Math.max(...c.h) : 0, rise: 0, free: true, ...opts });
    return this;
  }

  clear(x, z, w, d) {
    for (let j = z; j < z + d; j++) for (let i = x; i < x + w; i++) this.cells[j * this.cols + i] = null;
    return this;
  }

  /** Clears the tiles and keeps them clear of walls dug round them later: a gap for a lift to cross. */
  gap(x, z, w, d) {
    this.clear(x, z, w, d);
    for (let j = z; j < z + d; j++) for (let i = x; i < x + w; i++) this.open.add(j * this.cols + i);
    return this;
  }

  /**
   * One of the people (see foes.js): `kind` is one of `FOES`. Walkers stay
   * within `range` of where they start, and go round `path` (a loop of tile
   * centres) when nothing is near; crawlers and flyers only go round it.
   * `facing` is which way it looks to begin with, in radians from +z toward +x.
   */
  foe(kind, x, z, { range = 6, path = null, facing = 0 } = {}) {
    this.foes.push({ kind, x: x + 0.5, z: z + 0.5, range, facing, path: path && path.map(([px, pz]) => [px + 0.5, pz + 0.5]) });
    return this;
  }

  /**
   * A speaker stack over the tiles, rising `lift` above them and slamming
   * down on the beat: every `beats` beats, `offset` of the way round the
   * cycle later (so two of them can be out of step).
   */
  speaker(x, z, { w = 1, d = 1, lift = 2.4, beats = 4, offset = 0 } = {}) {
    const period = beats * this.beat;
    this.crushers.push({ x, z, w, d, lift, period, phase: (SLAM_AT + offset) * period, beats });
    this._mark(x, z, w, d, 'crush');
    return this;
  }

  /** Pyro in the floor, bursting every `beats` beats, on the beat. */
  pyro(x, z, { w = 1, d = 1, beats = 4, offset = 0 } = {}) {
    const period = beats * this.beat;
    this.spikes.push({ x, z, w, d, period, phase: (BURST_AT + offset) * period, beats });
    this._mark(x, z, w, d, 'trap');
    return this;
  }

  /** A platform with its top at `h`, gliding out by `to` and back every `period` seconds. */
  lift(x, z, w, d, h, { to, period = 6, phase = 0, pause = 0.26, style = null }) {
    this.lifts.push({ x, z, w, d, h, to, period, phase, pause, style });
    return this;
  }

  /** A lamp on top of the wall at (x, z): a bulb, a stage light, a neon tube, as the palette's `lamp` says. */
  lamp(x, z) {
    this.lamps.push({ x, z });
    return this;
  }

  /**
   * One of the light rig (lightshow.js), set over tile (x, z): `kind` is
   * 'par', 'spot', 'strobe', 'ball', 'laser', 'neon' or 'bulb'. `colors` are
   * what it cycles through; `reach` how far it is baked into the stone.
   */
  light(kind, x, z, opts = {}) {
    this.fixtures.push({ kind, x: x + 0.5, z: z + 0.5, ...opts });
    return this;
  }

  /** Sticky floor — spilled beer, mud — which slows what rolls over it. */
  sticky(x, z, w, d) {
    this._fx(x, z, w, d, 'sticky');
    return this;
  }

  /** A conveyor belt over the tiles, carrying whatever is on it along `heading` ('+x', '-x', '+z' or '-z'). */
  belt(x, z, w, d, heading) {
    this._fx(x, z, w, d, 'belt', { heading });
    return this;
  }

  _fx(x, z, w, d, fx, extra = {}) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        const c = this.cell(i, j);
        if (c && c.kind === 'floor') Object.assign(c, { fx }, extra);
      }
    }
  }

  /** A bumper — a pinball post, a drum — that throws Rock back, at tile (x, z). */
  bumper(x, z, { radius = 0.55, look = 'post' } = {}) {
    this.bumpers.push({ x: x + 0.5, z: z + 0.5, radius, look });
    return this;
  }

  /** A pile of guitar picks, to roll over: they are the hype. */
  pick(x, z, amount = 10) {
    this.pickups.push({ kind: 'pick', x: x + 0.5, z: z + 0.5, amount });
    return this;
  }

  /** A road case, packed with picks. */
  road(x, z, amount = 60) {
    this.pickups.push({ kind: 'case', x: x + 0.5, z: z + 0.5, amount });
    return this;
  }

  /** A roll of gaff tape: holds Rock together. */
  tape(x, z, amount = 25) {
    this.pickups.push({ kind: 'tape', x: x + 0.5, z: z + 0.5, amount });
    return this;
  }

  /** A lighter, held up: when Rock is done for, the crowd calls for an encore and he gets up. */
  lighter(x, z) {
    this.pickups.push({ kind: 'lighter', x: x + 0.5, z: z + 0.5, amount: 1 });
    return this;
  }

  /** An all-access pass, for the gates. */
  pass(x, z) {
    this.pickups.push({ kind: 'pass', x: x + 0.5, z: z + 0.5, amount: 1 });
    return this;
  }

  /** A gold record: three hide in every venue. */
  record(x, z) {
    this.pickups.push({ kind: 'record', x: x + 0.5, z: z + 0.5, amount: 100 });
    return this;
  }

  /**
   * A security gate across the tiles, barring the way along `axis` ('x' or
   * 'z'; by default, along the rectangle's short side). Roll into it with a
   * pass and it lifts.
   */
  gate(x, z, w, d, { axis = w > d ? 'z' : 'x' } = {}) {
    this.doors.push({ x, z, w, d, axis, kind: 'gate' });
    this._mark(x, z, w, d, 'door');
    return this;
  }

  /**
   * A flimsy panel across the tiles — a stage flat, drywall, a curtain wall
   * — that gives way to anything coming at it faster than `breakAt` tiles a
   * second, and hides what is behind it.
   */
  panel(x, z, w, d, { axis = w > d ? 'z' : 'x', breakAt = 6, look = 'flat' } = {}) {
    this.doors.push({ x, z, w, d, axis, kind: 'panel', breakAt, look });
    this._mark(x, z, w, d, 'door');
    return this;
  }

  _mark(x, z, w, d, what) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        const c = this.cell(i, j);
        if (c) c[what] = true;
      }
    }
  }

  /** The height of the venue floor under (x, z), or null over the dark. */
  heightAt(x, z) {
    const i = Math.floor(x), j = Math.floor(z);
    const c = this.cell(i, j);
    if (!c) return null;
    const u = x - i, w = z - j, h = c.h;
    if (u + w <= 1) return h[H00] + (h[H10] - h[H00]) * u + (h[H01] - h[H00]) * w;
    return h[H11] + (h[H01] - h[H11]) * (1 - u) + (h[H10] - h[H11]) * (1 - w);
  }

  /**
   * Somewhere to put Rock back after a fall: a plain level floor, with
   * nothing round it that drops away — level floor at the same height or
   * wall standing over it on every side — and nothing that moves it.
   */
  isSafe(x, z) {
    const c = this.cell(x, z);
    if (!c || c.kind !== 'floor' || !isFlat(c) || c.trap || c.crush || c.door || c.fx === 'belt') return false;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const n = this.cell(x + i, z + j);
        if (!n) return false;
        if (n.kind === 'wall' && Math.min(...n.h) >= c.h[0] + 0.3) continue;
        if (n.kind === 'zap' || !isFlat(n) || Math.abs(n.h[0] - c.h[0]) > 1e-6) return false;
      }
    }
    return true;
  }

  get lowest() {
    let low = Infinity;
    for (const c of this.cells) if (c) low = Math.min(low, ...c.h);
    return low;
  }

  get highest() {
    let high = -Infinity;
    for (const c of this.cells) if (c) high = Math.max(high, ...c.h);
    return high;
  }
}

const isFlat = (c) => c.h.every((v) => Math.abs(v - c.h[0]) < 1e-6);

/** How far up the bank is `u` of the way across a chute: nothing over the middle third, `bank` at the edges. */
function banked(u, bank) {
  const k = Math.max(0, Math.abs(2 * u - 1) * 1.5 - 0.5);
  return bank * Math.min(k * k, 1.8);
}

/** sRGB hex to linear RGB — vertex colours are linear. */
export function linearRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
}

/** A little per-tile variety in the floor: the same for the same tile every time. */
function grain(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The unit vector along a heading ('+x', ...), as [x, z]. */
export const HEADING = Object.freeze({ '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] });

/**
 * The light baked into the floor and walls: a dim wash everywhere, and a
 * glow round every lamp, every fixture of the light rig, every electrified
 * tile and the stage door. The fixtures nearest Rock also get real lights
 * when it is drawn (`stage.js`, `lightshow.js`); this is what keeps the rest
 * of the venue from being black, and what gives each one its colour.
 */
export function bakeLight(venue) {
  const lampColour = linearRGB(venue.palette.lamp ?? '#ffb060').map((v) => v * 1.1);
  const lamps = venue.lamps.map(({ x, z }) => {
    const c = venue.cell(x, z);
    return [x + 0.5, (c ? Math.max(...c.h) : 0) + 0.6, z + 0.5];
  });
  const rig = venue.fixtures.filter((f) => f.reach !== 0).map((f) => {
    const c = venue.cell(Math.floor(f.x), Math.floor(f.z));
    const y = (c ? Math.max(...c.h) : 0) + (f.height ?? 1.2);
    const colour = linearRGB((f.colors?.[0]) ?? '#ffffff');
    const k = f.glow ?? 0.5;
    return { pos: [f.x, y, f.z], reach: f.reach ?? 6, colour: colour.map((v) => v * k) };
  });
  const zaps = [];
  const exits = [];
  for (let z = 0; z < venue.rows; z++) {
    for (let x = 0; x < venue.cols; x++) {
      const c = venue.cell(x, z);
      if (c?.kind === 'zap') zaps.push([x + 0.5, c.h[0], z + 0.5]);
      else if (c?.kind === 'exit') exits.push([x + 0.5, c.h[0] + 0.5, z + 0.5]);
    }
  }
  const ambient = venue.palette.ambient ?? [0.42, 0.44, 0.55];
  const zapColour = linearRGB(venue.palette.zap ?? '#3acbff').map((v) => v * 0.28);
  const exitColour = linearRGB(venue.palette.exit ?? '#ff3fa4').map((v) => v * 0.4);
  const glow = (sources, x, y, z, reach, colour, out) => {
    for (const s of sources) {
      const [sx, sy, sz] = s.pos ?? s;
      const dx = x - sx, dz = z - sz;
      const r = s.reach ?? reach;
      if (Math.abs(dx) > r || Math.abs(dz) > r) continue;
      const d = Math.hypot(dx, (y - sy) * 0.8, dz);
      if (d >= r) continue;
      const k = (1 - d / r) ** 2;
      const col = s.colour ?? colour;
      out[0] += col[0] * k; out[1] += col[1] * k; out[2] += col[2] * k;
    }
  };
  return (x, y, z) => {
    const out = [...ambient];
    glow(lamps, x, y, z, 5.5, lampColour, out);
    glow(rig, x, y, z, 6, null, out);
    glow(zaps, x, y, z, 2.6, zapColour, out);
    glow(exits, x, y, z, 4, exitColour, out);
    return out.map((v) => Math.min(1.7, v));
  };
}

/**
 * Everything drawn and everything collided with, from the tiles: the tops
 * (one quad per tile, with the whole floor texture; a layer for each kind
 * of floor), sticky floor, belts and electrified floor (each its own mesh,
 * with its own material), the walls down the sides (cut into bands a tile
 * high, so the bricks line up; a layer for each kind of wall), and a World
 * holding all of it as triangles for the physics.
 */
export function buildVenue(venue) {
  const world = new World({ cols: venue.cols, rows: venue.rows });
  const blank = () => ({ position: [], normal: [], color: [], uv: [] });
  const floors = new Map(), wallLayers = new Map();
  const layer = (map, key) => {
    if (!map.has(key)) map.set(key, blank());
    return map.get(key);
  };
  const sticky = blank(), belts = blank(), zap = blank();
  const palette = venue.palette;
  const tileColours = palette.tiles.map(linearRGB);
  const exitColour = linearRGB(palette.exit ?? '#2a2a36');
  const trapColour = linearRGB(palette.trap ?? '#3a3a40');
  const wallColours = (palette.walls ?? palette.tiles).map(linearRGB);
  const light = bakeLight(venue);

  const colourAt = (i) => tileColours[((i % tileColours.length) + tileColours.length) % tileColours.length];

  const normalOf = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };

  const lit = (base, p) => {
    const l = light(p[0], p[1], p[2]);
    return [base[0] * l[0], base[1] * l[1], base[2] * l[2]];
  };

  const face = (out, a, b, c, normal, colours, uvs) => {
    out.position.push(...a, ...b, ...c);
    for (let k = 0; k < 3; k++) out.normal.push(...normal);
    out.color.push(...colours[0], ...colours[1], ...colours[2]);
    out.uv.push(...uvs[0], ...uvs[1], ...uvs[2]);
  };

  /**
   * One wall: the polygon between the bottom line (b0 → b1) and the top
   * (a0 → a1) along the edge p0 → p1, facing `out`. The physics gets it
   * whole; the mesh gets it in bands a tile high.
   */
  let wallKey = 'wall';
  const wall = (p0, p1, poly, out, shade, hidden = false) => {
    const at = (t, y) => [p0[0] + (p1[0] - p0[0]) * t, y, p0[1] + (p1[1] - p0[1]) * t];
    const pts = poly.map(([t, y]) => at(t, y));
    const facing = (a, b, c) => {
      let n = normalOf(a, b, c);
      if (n[0] * out[0] + n[2] * out[2] < 0) return null;
      return n;
    };
    // Into the world, as a fan.
    for (let k = 1; k < pts.length - 1; k++) {
      let a = pts[0], b = pts[k], c = pts[k + 1];
      if (!facing(a, b, c)) [b, c] = [c, b];
      world.addTriangle(...a, ...b, ...c);
    }
    if (hidden) return;
    const lowY = Math.min(...poly.map((p) => p[1])), highY = Math.max(...poly.map((p) => p[1]));
    for (let y0 = Math.floor(lowY); y0 < highY; y0++) {
      const band = clip(clip(poly, (p) => p[1] - y0), (p) => y0 + 1 - p[1]);
      if (band.length < 3) continue;
      const bp = band.map(([t, y]) => at(t, y));
      for (let k = 1; k < band.length - 1; k++) {
        let ia = 0, ib = k, ic = k + 1;
        let n = facing(bp[ia], bp[ib], bp[ic]);
        if (!n) { [ib, ic] = [ic, ib]; n = normalOf(bp[ia], bp[ib], bp[ic]); }
        const vs = [ia, ib, ic];
        face(layer(wallLayers, wallKey), bp[ia], bp[ib], bp[ic], n,
          vs.map((v) => lit(shade(band[v][1]), bp[v])),
          vs.map((v) => [band[v][0], band[v][1] - y0]));
      }
    }
  };

  for (let z = 0; z < venue.rows; z++) {
    for (let x = 0; x < venue.cols; x++) {
      const c = venue.cell(x, z);
      if (!c) continue;
      const [h00, h10, h01, h11] = c.h;
      const checker = (x + z) % 2;
      let base;
      if (c.kind === 'exit') base = exitColour;
      else if (c.kind === 'zap') base = [1, 1, 1];
      else if (c.trap) base = trapColour;
      else base = c.kind === 'wall' ? colourAt(CAP) : colourAt(c.color);
      const tint = c.kind === 'zap' ? 1 : (checker ? 0.94 : 1) * (0.84 + 0.22 * grain(x, z));
      const col = base.map((v) => v * tint);
      const A = [x, h00, z], B = [x + 1, h10, z], C = [x, h01, z + 1], D = [x + 1, h11, z + 1];
      const out = c.kind === 'zap' ? zap : c.fx === 'sticky' ? sticky : c.fx === 'belt' ? belts : layer(floors, c.tex ?? 'floor');
      const shadeOf = (p) => (c.kind === 'zap' ? col : lit(col, p));
      // Each flagstone, plank or tile turned and flipped its own way, so the floor doesn't repeat.
      const spin = Math.floor(grain(z, x) * 8);
      let uv = ([u, v]) => {
        if (spin & 4) u = 1 - u;
        for (let k = 0; k < (spin & 3); k++) [u, v] = [v, 1 - u];
        return [u, v];
      };
      if (c.fx === 'belt') {
        // Every belt's texture runs along the way it carries: v along, u across.
        const [dx, dz] = HEADING[c.heading ?? '+x'];
        uv = ([u, v]) => {
          // (u, v) as a corner of the tile: u along x, v along z in the unrotated texture frame.
          const px = u, pz = 1 - v;
          const along = dx !== 0 ? (dx > 0 ? px : 1 - px) : (dz > 0 ? pz : 1 - pz);
          const across = dx !== 0 ? pz : px;
          return [across, along];
        };
      }
      if (!c.prop) {
        face(out, A, C, B, normalOf(A, C, B), [shadeOf(A), shadeOf(C), shadeOf(B)], [uv([0, 1]), uv([0, 0]), uv([1, 1])]);
        face(out, B, C, D, normalOf(B, C, D), [shadeOf(B), shadeOf(C), shadeOf(D)], [uv([1, 1]), uv([0, 0]), uv([1, 0])]);
      }
      world.addTriangle(...A, ...C, ...B);
      world.addTriangle(...B, ...C, ...D);

      // The sides: down to the next tile, or into the dark.
      const wallBase = wallColours[((c.color % wallColours.length) + wallColours.length) % wallColours.length];
      wallKey = c.wtex ?? 'wall';
      const low = Math.min(...c.h) - DEPTH;
      const edges = [
        // [ends, this tile's heights there, neighbour, its heights there, outward]
        [[x, z], [x + 1, z], h00, h10, venue.cell(x, z - 1), (n) => [n.h[H01], n.h[H11]], [0, 0, -1]],
        [[x, z + 1], [x + 1, z + 1], h01, h11, venue.cell(x, z + 1), (n) => [n.h[H00], n.h[H10]], [0, 0, 1]],
        [[x, z], [x, z + 1], h00, h01, venue.cell(x - 1, z), (n) => [n.h[H10], n.h[H11]], [-1, 0, 0]],
        [[x + 1, z], [x + 1, z + 1], h10, h11, venue.cell(x + 1, z), (n) => [n.h[H00], n.h[H01]], [1, 0, 0]],
      ];
      for (const [p0, p1, a0, a1, n, theirs, outward] of edges) {
        const [b0, b1] = n ? theirs(n) : [low, low];
        const top = Math.max(a0, a1);
        const shade = (y) => {
          const k = Math.max(0, Math.min(1, 1 - (top - y) / DEPTH));
          return wallBase.map((v) => v * (0.08 + 0.92 * k * k));
        };
        const d0 = a0 - b0, d1 = a1 - b1;
        if (d0 <= 1e-6 && d1 <= 1e-6) continue;
        if (d0 >= -1e-6 && d1 >= -1e-6) {
          wall(p0, p1, [[0, b0], [1, b1], [1, a1], [0, a0]], outward, shade, Boolean(c.prop));
        } else {
          // The two edges cross: this tile is higher on one side of the crossing only.
          const t = d0 / (d0 - d1);
          const ym = a0 + (a1 - a0) * t;
          if (d0 > 0) wall(p0, p1, [[0, b0], [t, ym], [0, a0]], outward, shade, Boolean(c.prop));
          else wall(p0, p1, [[1, b1], [1, a1], [t, ym]], outward, shade, Boolean(c.prop));
        }
      }
    }
  }

  world.finish();
  const typed = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, new Float32Array(v)]));
  const typedLayers = (map) => Object.fromEntries([...map].map(([k, o]) => [k, typed(o)]));
  return { floors: typedLayers(floors), walls: typedLayers(wallLayers), sticky: typed(sticky), belts: typed(belts), zap: typed(zap), world };
}

/** The part of a polygon of [t, y] points where `inside(p) >= 0` (Sutherland–Hodgman, against one line). */
function clip(poly, inside) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const fa = inside(a), fb = inside(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  // Drop points that came out on top of each other.
  return out.filter((p, i) => {
    const q = out[(i + 1) % out.length];
    return out.length < 2 || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-7;
  });
}
