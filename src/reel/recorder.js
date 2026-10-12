import '@fontsource/anton/400.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';

import { createAudio } from '../audio.js';
import { BOARD_DETAIL } from '../foes.js';
import { createGame } from '../game.js';
import { createHud } from '../hud.js';
import { preload, ready, SCULPTED } from '../models/library.js';
import { createStage } from '../stage.js';
import { createStorage } from '../storage.js';
import { loadVenue, VENUES } from '../venues/index.js';
import { createPilot } from '../../test/helpers/autopilot.js';

/**
 * The game, played by the autopilot a frame at a time, for scripts/reel.js
 * to film on a phone. Nothing here runs in real time: the page's clock (its
 * timers, and the CSS animations of the HUD) moves on only when a frame is
 * asked for, and the sound is rendered offline in step with the frames, so a
 * frame that takes a second to draw still lasts a thirtieth of one on film.
 *
 * `globalThis.recorder` is what the script drives: `scout()` plays a venue
 * through without drawing it and says what happened when; `start()`,
 * `cut()`, `frame()` and `finish()` film it.
 */

const FPS = 30;
const DT = 1 / FPS;
const RATE = 48000;

const realTimeout = globalThis.setTimeout.bind(globalThis);
const breathe = () => new Promise((r) => realTimeout(r, 0));

// ——— every model baked before anything starts, so a venue never waits on one (and a run is the same every time).

preload();
const jobs = new Map();
for (let i = 0; i < VENUES.length; i++) {
  const v = loadVenue(i);
  for (const f of v.foes) jobs.set(`${f.kind}@${BOARD_DETAIL}`, [f.kind, BOARD_DETAIL]);
  for (const p of v.pickups) jobs.set(`${p.kind}@1`, [p.kind, 1]);
}
await Promise.all([...jobs.values()].filter(([n]) => SCULPTED[n]).map(([n, d]) => ready(n, d)));
await Promise.all(['400 40px Anton', '500 20px "Barlow Condensed"', '600 20px "Barlow Condensed"', '700 20px "Barlow Condensed"'].map((f) => document.fonts.load(f)));

// ——— the page's clock: timers that go off as the frames go by, not as the seconds do.

const clock = { now: 0, timers: new Map(), id: 1 };
const addTimer = (fn, ms, every, args) => {
  const id = clock.id++;
  const s = Math.max(0, Number(ms) || 0) / 1000;
  clock.timers.set(id, { fn, at: clock.now + s, every: every ? Math.max(0.001, s) : 0, args });
  return id;
};
globalThis.setTimeout = (fn, ms, ...args) => addTimer(fn, ms, false, args);
globalThis.setInterval = (fn, ms, ...args) => addTimer(fn, ms, true, args);
globalThis.clearTimeout = globalThis.clearInterval = (id) => { clock.timers.delete(id); };

function advance(dt) {
  const end = clock.now + dt;
  for (;;) {
    let next = null;
    for (const [id, t] of clock.timers) if (t.at <= end && (!next || t.at < next[1].at)) next = [id, t];
    if (!next) break;
    const [id, t] = next;
    clock.now = Math.max(clock.now, t.at);
    if (t.every) t.at += t.every; else clock.timers.delete(id);
    try { t.fn(...t.args); } catch (err) { console.error(err); }
  }
  clock.now = end;
}

/**
 * Every CSS animation and transition held still (a playback rate of nought),
 * at where the page's clock says it has got to. They are kept track of here
 * until they end: one held still in its delay isn't one the page lists.
 */
const born = new WeakMap();
const held = new Set();
function holdAnimations() {
  for (const a of document.getAnimations()) {
    if (born.has(a)) continue;
    born.set(a, clock.now);
    a.playbackRate = 0;
    held.add(a);
  }
  for (const a of held) {
    if (a.playState === 'idle' || !a.effect?.target?.isConnected) { held.delete(a); continue; }
    const t = (clock.now - born.get(a)) * 1000;
    a.currentTime = t;
    if (t >= a.effect.getComputedTiming().endTime) held.delete(a);
  }
}

// ——— the sound: the game's own, into an offline context that is rendered a frame at a time.

let offline = null, rendering = null, started = false;
globalThis.AudioContext = function AudioContext() { return offline; };
const real = createAudio();
/** Whether what the game plays is heard: not while it is run forward to the next cut. */
let live = false;
// The reel chooses the music; the game's own calls to start and stop it, and to wake the sound, go nowhere.
const NOWHERE = new Set(['wake', 'startMusic', 'stopMusic', 'toggleMute', 'setVolume']);
const audio = new Proxy(real, {
  get(target, key) {
    const v = Reflect.get(target, key);
    if (typeof v !== 'function') return v;
    if (key === 'beat') return () => target.beat();
    if (NOWHERE.has(key)) return () => false;
    return (...args) => (live ? v.apply(target, args) : undefined);
  },
});

// ——— the game, on a phone, with nobody's hands on it.

const view = document.getElementById('view');
const storage = createStorage();
const hud = createHud(document.body, {});
hud.muted(false);
const input = {
  stick: () => ({ x: 0, y: 0 }),
  view: () => ({ turn: 0, tilt: 0, zoom: 1 }),
  rev: () => false,
  take: () => [],
  setRev() {},
  get pointing() { return false; },
};
const stage = await createStage(view);
const game = createGame({ stage, hud, input, audio, storage });
const { GFX } = stage;

// ——— what the reels put over it.

const layer = document.getElementById('reel');
layer.innerHTML = `
  <div class="thumb" id="thumb"></div>
  <div class="thumb" id="rev-thumb"></div>
  <div id="hook"></div>
  <div id="pill"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z" fill="#ffd23a"/></svg><b>Play free</b><span>rocknroller.vercel.app</span></div>
  <div id="card">
    <header class="logo">
      <h1 class="top">Rock <span class="amp">'n'</span></h1>
      <h1 class="bottom">Roller</h1>
      <p class="tag">a boulder's guide to the road</p>
    </header>
    <p class="cta">Play free in your browser</p>
    <div class="url">rocknroller.vercel.app</div>
    <div class="devices">
      <span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5" fill="none" stroke="#2de2ff" stroke-width="2"/><circle cx="12" cy="18.5" r="1.1" fill="#2de2ff"/></svg>Phone</span>
      <span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="11" rx="1.5" fill="none" stroke="#2de2ff" stroke-width="2"/><path d="M1.5 19h21" stroke="#2de2ff" stroke-width="2.4" stroke-linecap="round"/></svg>Desktop</span>
    </div>
    <p class="small">no download · no sign-up</p>
  </div>`;
const thumbEl = layer.querySelector('#thumb');
const revThumbEl = layer.querySelector('#rev-thumb');
const hookEl = layer.querySelector('#hook');
const pillEl = layer.querySelector('#pill');
const cardEl = layer.querySelector('#card');
const revButton = document.getElementById('rev-button');

/** Where a point in the venue is on the screen, in CSS pixels. */
const onScreen = (x, y, z) => {
  const rect = view.getBoundingClientRect();
  const v = new GFX.Vector3(x, y, z).project(stage.camera);
  return [rect.left + ((v.x + 1) / 2) * rect.width, rect.top + ((1 - v.y) / 2) * rect.height];
};

let lastMove = null;
const thumb = { at: null, on: 0 };
const revThumb = { on: 0 };
const ease = (rate) => 1 - Math.exp(-rate * DT);

/**
 * The hands: a thumb on the glass where a player's would be to push Rock the
 * way the autopilot is pushing him (toward it, harder the further it is,
 * as the touch controls have it), and one on REV while it is held.
 */
function hands() {
  const gig = game.debug.gig, b = gig.ball;
  const playing = live && game.state === 'play';
  const push = playing && lastMove?.push ? lastMove.push : null;
  const strength = push ? Math.min(1, Math.hypot(...push)) : 0;
  if (strength > 0.06) {
    const [rx, ry] = onScreen(b.x, b.y, b.z);
    const [ax, ay] = onScreen(b.x + push[0], b.y, b.z + push[1]);
    const d = Math.hypot(ax - rx, ay - ry) || 1;
    // Held well off him, as a thumb is, so he isn't hidden under it: further the harder it pushes.
    const reach = 80 + strength * 60;
    // On the glass, clear of the HUD's top row.
    const want = [
      Math.max(34, Math.min(innerWidth - 34, rx + ((ax - rx) / d) * reach)),
      Math.max(190, Math.min(innerHeight - 40, ry + ((ay - ry) / d) * reach)),
    ];
    if (!thumb.at || thumb.on < 0.05) thumb.at = want;
    else for (const i of [0, 1]) thumb.at[i] += (want[i] - thumb.at[i]) * ease(16);
  }
  thumb.on += ((strength > 0.06 ? 1 : 0) - thumb.on) * ease(14);
  if (thumb.at) {
    thumbEl.style.transform = `translate(${thumb.at[0]}px, ${thumb.at[1]}px) scale(${0.9 + 0.1 * thumb.on})`;
    thumbEl.style.opacity = String(thumb.on);
  }
  const held = playing && gig.revving;
  revButton.classList.toggle('held', held);
  revThumb.on += ((held ? 1 : 0) - revThumb.on) * ease(20);
  const r = revButton.getBoundingClientRect();
  revThumbEl.style.transform = `translate(${r.left + r.width / 2 + 6}px, ${r.top + r.height / 2 + 8}px)`;
  revThumbEl.style.opacity = String(revThumb.on);
}

// ——— running the game.

let venueIndex = null;
let listen = null;

/** Venue `index` from the top, the autopilot at the wheel. */
async function begin(index) {
  live = false;
  game.startVenue(index);
  const pilot = createPilot(game.debug.gig);
  game.debug.pilot = {
    next() { lastMove = pilot.next(); return lastMove; },
    saw(out) { listen?.(out); pilot.saw(out); },
    get stuck() { return pilot.stuck; },
  };
  venueIndex = index;
  // What it is waiting on is baked already: let it see so before the first step.
  await breathe();
}

/** One frame of the game. */
function tick() {
  advance(DT);
  game.update(DT, []);
}

/** The finished sound as a WAV file, base64. */
function wav(buffer) {
  const channels = buffer.numberOfChannels, frames = buffer.length;
  const bytes = new Uint8Array(44 + frames * channels * 2);
  const data = new DataView(bytes.buffer);
  const text = (at, s) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  text(0, 'RIFF'); data.setUint32(4, 36 + frames * channels * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, channels, true);
  data.setUint32(24, buffer.sampleRate, true); data.setUint32(28, buffer.sampleRate * channels * 2, true);
  data.setUint16(32, channels * 2, true); data.setUint16(34, 16, true);
  text(36, 'data'); data.setUint32(40, frames * channels * 2, true);
  const chans = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(at, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      at += 2;
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

let frames = 0;

globalThis.recorder = {
  fps: FPS,

  /**
   * Plays venue `index` through without drawing it, as far as the stage door
   * or `limit` seconds, and says what happened and when (on the gig's
   * clock): who was hit and how, what was picked up or broken, the speaker
   * stacks and pyro going off near Rock, and his speed every frame.
   */
  async scout(index, { limit = 300 } = {}) {
    const events = [];
    const track = [];
    await begin(index);
    const gig = game.debug.gig;
    listen = (out) => {
      const t = +gig.time.toFixed(3), b = gig.ball;
      for (const h of out.hits) events.push({ t, type: 'hit', kind: h.foe.kind, grade: h.grade, down: h.down, boss: Boolean(h.foe.stats.boss), multiplier: h.multiplier, gain: h.gain });
      for (const p of out.picked) events.push({ t, type: 'pick', kind: p.kind });
      for (let i = 0; i < out.broke.length; i++) events.push({ t, type: 'panel' });
      for (let i = 0; i < out.smashed.length; i++) events.push({ t, type: 'prop' });
      for (let i = 0; i < out.bumped.length; i++) events.push({ t, type: 'bumper' });
      if (out.door === 'opened') events.push({ t, type: 'gate' });
      if (out.encore) events.push({ t, type: 'encore' });
      if (out.outcome) events.push({ t, type: 'outcome', how: out.outcome });
      if (out.hurt && out.hurt.how !== 'foe') events.push({ t, type: 'hurt', how: out.hurt.how });
      for (const e of out.events) {
        const d = Math.hypot(e.x - b.x, e.z - b.z);
        if (d < 7) events.push({ t, type: e.type, near: +d.toFixed(1) });
      }
    };
    try {
      while (gig.time < limit) {
        tick();
        const b = gig.ball;
        track.push([+gig.time.toFixed(3), +Math.hypot(b.vx, b.vz).toFixed(2), gig.revving ? 1 : 0, game.state === 'play' ? 1 : 0, +b.x.toFixed(3), +b.z.toFixed(3)]);
        if (game.state === 'clear' || game.state === 'over' || game.debug.pilot.stuck) break;
      }
    } finally {
      listen = null;
    }
    const venue = gig.venue;
    return { index, name: venue.name, tempo: venue.tempo, theme: venue.look?.theme, end: game.state, stuck: game.debug.pilot.stuck, events, track };
  },

  /**
   * Readies a reel `seconds` long, with `music` ({ theme, tempo, bar }) for
   * its soundtrack, bar `bar` of the song coming in on the first beat. Says
   * when that is, and how long a bar is.
   */
  start({ seconds, music }) {
    offline = new OfflineAudioContext({ numberOfChannels: 2, length: Math.ceil((seconds + 0.5) * RATE), sampleRate: RATE });
    started = false;
    frames = 0;
    real.wake();
    const beat = 60 / music.tempo, bar = beat * 4;
    real.startMusic({ look: { theme: music.theme }, tempo: music.tempo }, { gig: { time: music.bar * bar - 0.15 } });
    // When the band's downbeat 0 falls, by its own clock.
    const t0 = -real.beat() * beat;
    return { first: t0 + music.bar * bar, bar };
  },

  /** Runs on (silently) to venue `venue` at `at` seconds on its gig's clock, from the top if it has to. */
  async cut({ venue, at }) {
    live = false;
    if (venue !== venueIndex || game.debug.gig.time > at + 1e-6) await begin(venue);
    const gig = game.debug.gig;
    while (gig.time + DT / 2 < at) {
      tick();
      holdAnimations();
    }
    return { time: gig.time, state: game.state, ball: [gig.ball.x, gig.ball.z] };
  },

  /** The opening line (`text`, and a smaller `sub` under it), or none. */
  hook(text, sub = '') {
    if (text) {
      hookEl.textContent = text;
      if (sub) {
        const small = document.createElement('small');
        small.textContent = sub;
        hookEl.appendChild(small);
      }
      hookEl.className = 'on';
      document.body.classList.add('hooked');
    } else {
      hookEl.className = 'off';
      document.body.classList.remove('hooked');
    }
  },

  /** The address, while it plays. */
  pill(on) { pillEl.className = on ? 'on' : ''; },

  /** The card to end on: the name, the address, phone and desktop. */
  card(on) {
    cardEl.className = on ? 'on' : '';
    document.body.classList.toggle('carded', on);
    if (on) pillEl.className = '';
  },

  /** One frame on: the game, what is over it, the picture drawn and a frame's worth of sound rendered. */
  async frame() {
    live = true;
    tick();
    stage.look();
    hands();
    holdAnimations();
    stage.render();
    const reached = offline.suspend((frames + 1) / FPS);
    if (started) offline.resume();
    else { started = true; rendering = offline.startRendering(); }
    await reached;
    frames++;
    const b = game.debug.gig.ball;
    return { frame: frames, time: game.debug.gig.time, state: game.state, ball: [b.x, b.z] };
  },

  /** The rest of the sound, as a WAV file in base64. */
  async finish() {
    live = false;
    if (started) offline.resume();
    else rendering = offline.startRendering();
    return wav(await rendering);
  },
};
