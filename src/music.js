/**
 * The band. Every venue has a band playing in it, made on the spot with Web
 * Audio, no samples: a drum kit (kick, snare, hats, toms, crash), a bass, two
 * guitars through a distortion and a cabinet, a lead, and synths for the
 * clubs, all in a small room of reverb. Each plays its part in a style the
 * venue picks — its tempo, its key, a chord progression, a drum pattern and a
 * way of strumming — over eight-bar phrases: the verse, then the chorus with
 * the lead on top, with a fill into every change.
 *
 * The band keeps time for everything else in the game. `beatAt(now)` is how
 * many beats from the downbeat the music is, and the light show and the
 * speakers' slams are keyed to it.
 *
 * Nothing in here touches the page: it takes an AudioContext and gives back a
 * scheduler.
 */

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** The scales a lead picks from, in semitones above the key. */
const SCALES = {
  minor: [0, 3, 5, 7, 10, 12, 15, 17],
  major: [0, 2, 4, 7, 9, 12, 14, 16],
  blues: [0, 3, 5, 6, 7, 10, 12, 15],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
};

/**
 * Drum patterns on sixteen steps to the bar: where the kick, snare and
 * hat fall. `hat` is every step it plays on, `open` the steps it rings.
 */
const DRUMS = {
  rock: { kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [14], kicksLate: [6] },
  punk: { kick: [0, 6, 8, 14], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [], kicksLate: [] },
  disco: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], open: [2, 6, 10, 14], clap: [4, 12], kicksLate: [] },
  metal: { kick: [0, 1, 3, 4, 6, 8, 9, 11, 12, 14], snare: [4, 12], hat: [0, 4, 8, 12], open: [], kicksLate: [] },
  half: { kick: [0, 7, 10], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [], kicksLate: [] },
  stomp: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [], kicksLate: [], clap: [4, 12] },
};

/** How the rhythm guitars strum: 0 nothing, 1 a muted chug, 2 an open chord that rings. */
const STRUMS = {
  chug: [2, 0, 1, 1, 1, 0, 1, 1, 2, 0, 1, 1, 1, 0, 1, 1],
  eighths: [2, 0, 1, 0, 1, 0, 1, 0, 2, 0, 1, 0, 1, 0, 1, 0],
  gallop: [2, 0, 1, 1, 2, 0, 1, 1, 2, 0, 1, 1, 2, 0, 1, 1],
  anthem: [2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0],
  offbeat: [0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0],
  sparse: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 1, 0],
  stabs: [2, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 2, 0, 1, 0],
};

/**
 * The themes: key (MIDI of the tonic, low), scale for the lead, a
 * progression (a chord a bar, as semitones above the key), drums, strum,
 * the lead's riff (steps and scale degrees over two bars) and which extras play.
 */
export const THEMES = {
  garage: {
    key: 40, scale: 'minor', prog: [0, 0, 3, 7, 0, 0, 5, 7], drums: 'punk', strum: 'chug', bass: 'eighths',
    riff: [[0, 4, 2], [2, 3, 2], [4, 2, 2], [6, 3, 2], [8, 4, 3], [12, 2, 2], [14, 1, 2], [16, 0, 4], [24, 2, 2], [26, 3, 2], [28, 4, 4]],
    lead: 'saw', gain: 1,
  },
  rehearsal: {
    key: 45, scale: 'dorian', prog: [0, 0, 5, 5, 3, 3, 7, 7], drums: 'rock', strum: 'eighths', bass: 'eighths',
    riff: [[0, 2, 2], [3, 4, 1], [4, 5, 3], [8, 4, 2], [10, 2, 2], [12, 3, 4], [16, 5, 3], [20, 4, 2], [22, 2, 2], [24, 0, 6]],
    lead: 'square', gain: 1,
  },
  dive: {
    key: 38, scale: 'blues', prog: [0, 0, 0, 0, 5, 5, 0, 7], drums: 'half', strum: 'sparse', bass: 'walk',
    riff: [[0, 3, 3], [4, 4, 1], [6, 3, 2], [8, 2, 4], [14, 3, 2], [16, 4, 3], [20, 5, 2], [22, 4, 2], [24, 2, 3], [28, 0, 4]],
    lead: 'tube', gain: 1,
  },
  club: {
    key: 45, scale: 'minor', prog: [0, 0, 8, 8, 5, 5, 7, 7], drums: 'disco', strum: 'offbeat', bass: 'octave', arp: true, pad: true,
    riff: [[0, 4, 2], [3, 5, 2], [6, 4, 2], [8, 2, 3], [12, 3, 2], [16, 5, 2], [19, 4, 2], [22, 3, 2], [24, 4, 6]],
    lead: 'square', gain: 1,
  },
  dock: {
    key: 38, scale: 'phrygian', prog: [0, 0, 1, 0, 0, 0, 10, 1], drums: 'metal', strum: 'gallop', bass: 'eighths',
    riff: [[0, 3, 1], [1, 3, 1], [2, 4, 2], [6, 3, 2], [8, 2, 4], [16, 3, 1], [17, 3, 1], [18, 5, 2], [22, 4, 2], [24, 2, 6]],
    lead: 'saw', gain: 1,
  },
  studio: {
    key: 43, scale: 'dorian', prog: [0, 5, 3, 7, 0, 5, 10, 7], drums: 'rock', strum: 'stabs', bass: 'eighths', pad: true,
    riff: [[0, 5, 3], [4, 4, 1], [6, 2, 2], [8, 3, 4], [14, 2, 2], [16, 5, 3], [20, 6, 2], [22, 4, 2], [24, 2, 6]],
    lead: 'tube', gain: 1,
  },
  theatre: {
    key: 38, scale: 'minor', prog: [0, 8, 3, 10, 0, 8, 5, 7], drums: 'half', strum: 'anthem', bass: 'octave', pad: true,
    riff: [[0, 4, 4], [6, 5, 2], [8, 6, 4], [14, 5, 2], [16, 4, 4], [22, 3, 2], [24, 2, 8]],
    lead: 'saw', gain: 1,
  },
  festival: {
    key: 43, scale: 'major', prog: [0, 5, 7, 5, 0, 5, 7, 7], drums: 'rock', strum: 'eighths', bass: 'eighths',
    riff: [[0, 4, 2], [2, 5, 2], [4, 4, 2], [6, 2, 2], [8, 3, 4], [14, 2, 2], [16, 4, 2], [18, 5, 2], [20, 4, 2], [22, 2, 2], [24, 0, 6]],
    lead: 'square', gain: 1,
  },
  arena: {
    key: 40, scale: 'minor', prog: [0, 8, 10, 7, 0, 8, 10, 5], drums: 'stomp', strum: 'anthem', bass: 'eighths', pad: true,
    riff: [[0, 4, 4], [6, 3, 2], [8, 5, 4], [14, 4, 2], [16, 6, 4], [22, 5, 2], [24, 4, 8]],
    lead: 'saw', gain: 1,
  },
  stadium: {
    key: 38, scale: 'minor', prog: [0, 8, 3, 10, 0, 8, 3, 7], drums: 'stomp', strum: 'chug', bass: 'eighths', pad: true,
    riff: [[0, 5, 3], [4, 6, 3], [8, 5, 2], [10, 4, 2], [12, 3, 4], [16, 5, 3], [20, 6, 3], [24, 7, 4], [28, 5, 4]],
    lead: 'saw', gain: 1.05,
  },
};

/** A distortion: a soft clip that gets harder as `k` goes up. */
function distortion(k = 40) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 0.35) / (Math.PI + k * Math.abs(x) * 0.35);
  }
  return curve;
}

/** A little room: two channels of noise dying away over `seconds`. */
function room(ctx, seconds = 0.9, decay = 3) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

export function createBand(ctx, out, noise) {
  // The bus: everything through a compressor, a little of it through the room.
  const bus = ctx.createGain();
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -16;
  glue.knee.value = 12;
  glue.ratio.value = 4;
  glue.attack.value = 0.006;
  glue.release.value = 0.18;
  const verb = ctx.createConvolver();
  verb.buffer = room(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.16;
  // And a limiter on the end, so a loud chorus can't clip.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;
  bus.connect(glue);
  bus.connect(verb).connect(wet).connect(glue);
  glue.connect(limiter).connect(out);

  const curve = distortion(46);
  const curveLead = distortion(22);

  let target = bus;
  const env = (g, when, peak, attack, hold, release) => {
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.setValueAtTime(peak, when + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
    return when + attack + hold + release + 0.04;
  };
  const osc = (type, freq, when, end, dest, detune = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    o.detune.value = detune;
    o.connect(dest);
    o.start(when);
    o.stop(end);
    return o;
  };
  const voice = (level = 1) => {
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(target);
    return g;
  };
  const noiseHit = (when, { freq = 1000, type = 'bandpass', q = 1, level = 0.3, length = 0.1, to = null }) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, when);
    if (to) f.frequency.exponentialRampToValueAtTime(to, when + length);
    f.Q.value = q;
    const g = voice();
    g.gain.setValueAtTime(level, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + length);
    s.connect(f).connect(g);
    s.start(when, Math.random() * 1.5);
    s.stop(when + length + 0.05);
  };

  // ——— the kit.
  function kick(when, level = 1) {
    const g = voice();
    const end = env(g, when, 0.95 * level, 0.002, 0.01, 0.2);
    const o = osc('sine', 160, when, end, g);
    o.frequency.exponentialRampToValueAtTime(46, when + 0.1);
    noiseHit(when, { freq: 3200, type: 'highpass', level: 0.18 * level, length: 0.012 });
  }
  function snare(when, level = 1) {
    noiseHit(when, { freq: 2200, type: 'bandpass', q: 0.8, level: 0.5 * level, length: 0.17 });
    noiseHit(when, { freq: 6500, type: 'highpass', level: 0.14 * level, length: 0.09 });
    const g = voice();
    const end = env(g, when, 0.42 * level, 0.001, 0.01, 0.11);
    const o = osc('triangle', 230, when, end, g);
    o.frequency.exponentialRampToValueAtTime(150, when + 0.09);
  }
  function clap(when, level = 1) {
    for (let i = 0; i < 3; i++) noiseHit(when + i * 0.011, { freq: 1500, type: 'bandpass', q: 1.2, level: 0.28 * level, length: 0.07 });
  }
  function hat(when, level = 1, open = false) {
    noiseHit(when, { freq: 7800, type: 'highpass', q: 0.7, level: 0.25 * level, length: open ? 0.28 : 0.045 });
  }
  function tom(when, pitch = 120, level = 1) {
    const g = voice();
    const end = env(g, when, 0.6 * level, 0.002, 0.02, 0.28);
    const o = osc('sine', pitch * 1.6, when, end, g);
    o.frequency.exponentialRampToValueAtTime(pitch, when + 0.12);
    noiseHit(when, { freq: 900, type: 'bandpass', level: 0.1 * level, length: 0.05 });
  }
  function crash(when, level = 1) {
    noiseHit(when, { freq: 4800, type: 'highpass', q: 0.5, level: 0.3 * level, length: 1.5 });
    noiseHit(when, { freq: 9000, type: 'bandpass', q: 0.8, level: 0.14 * level, length: 0.9 });
  }

  // ——— the strings.
  /** A guitar: a chord of saws (root, fifth, octave) through the distortion and a cabinet, panned. */
  function guitar(when, root, length, { open = false, pan = 0, level = 1, third = null } = {}) {
    const shape = ctx.createWaveShaper();
    shape.curve = curve;
    shape.oversample = '2x';
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 110;
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking'; mid.frequency.value = 1400; mid.gain.value = 5; mid.Q.value = 0.9;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3300; lp.Q.value = 0.6;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    const g = voice(0.16 * level);
    shape.connect(hp).connect(mid).connect(lp).connect(p).connect(g);
    const hold = open ? Math.max(0.1, length - 0.05) : 0.04;
    const gain = ctx.createGain();
    gain.connect(shape);
    const end = env(gain, when, 1, 0.004, hold, open ? 0.3 : 0.06);
    const notes = [root, root + 7, root + 12, third ?? root + 19];
    notes.forEach((n, i) => {
      osc('sawtooth', NOTE(n), when, end, gain, i % 2 ? 6 : -6);
      if (i < 2) osc('sawtooth', NOTE(n), when, end, gain, i % 2 ? -9 : 9);
    });
  }

  function bass(when, note, length, level = 1) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, when);
    f.frequency.exponentialRampToValueAtTime(260, when + 0.18);
    const g = voice(0.72 * level);
    f.connect(g);
    const end = env(g, when, 1, 0.005, Math.max(0.02, length * 0.55), 0.09);
    osc('sawtooth', NOTE(note), when, end, f);
    osc('sine', NOTE(note - 12), when, end, g);
  }

  /** The lead: a single line, with a vibrato it takes a moment to start, through a milder distortion and an echo. */
  function lead(when, note, length, kind = 'saw', level = 1) {
    const shape = ctx.createWaveShaper();
    shape.curve = curveLead;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = kind === 'tube' ? 2400 : 3600;
    const g = voice(0.2 * level);
    shape.connect(lp).connect(g);
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.3;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const send = ctx.createGain();
    send.gain.value = 0.35;
    lp.connect(send).connect(echo);
    echo.connect(fb).connect(echo);
    echo.connect(g);
    const gain = ctx.createGain();
    gain.connect(shape);
    const end = env(gain, when, 1, 0.012, Math.max(0.05, length * 0.8), 0.14);
    const type = kind === 'square' ? 'square' : 'sawtooth';
    const a = osc(type, NOTE(note), when, end, gain, -7);
    const b = osc(type, NOTE(note), when, end, gain, 7);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, when);
    depth.gain.linearRampToValueAtTime(14, when + 0.25);
    vib.connect(depth);
    depth.connect(a.detune); depth.connect(b.detune);
    vib.start(when); vib.stop(end);
  }

  /** A synth arpeggio and pad, for the clubs: saws through a filter that opens and closes. */
  function arp(when, note, length, level = 1) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(500, when);
    f.frequency.exponentialRampToValueAtTime(3200, when + length * 0.6);
    const g = voice(0.065 * level);
    f.connect(g);
    const end = env(g, when, 1, 0.003, length * 0.4, length * 0.5);
    osc('sawtooth', NOTE(note), when, end, f, -8);
    osc('square', NOTE(note + 12), when, end, f, 8);
  }
  function pad(when, notes, length, level = 1) {
    for (const n of notes) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1100;
      const g = voice(0.032 * level);
      f.connect(g);
      const end = env(g, when, 1, length * 0.3, length * 0.3, length * 0.5);
      for (const d of [-9, 0, 9]) osc('sawtooth', NOTE(n), when, end, f, d);
    }
  }

  let playing = null;

  /** Bar `bar` of `theme` from time `when`, at `tempo`. */
  function playBar(theme, tempo, bar, when) {
    const beat = 60 / tempo;
    const step = beat / 4;
    const phrase = bar % 8;
    const chorus = phrase >= 4;
    const drums = DRUMS[theme.drums] ?? DRUMS.rock;
    const root = theme.key + (theme.prog[phrase] ?? 0);
    const level = theme.gain ?? 1;

    // Drums: the pattern, a crash on the top of every phrase, a fill into every fourth bar.
    const fill = phrase === 3 || phrase === 7;
    for (let i = 0; i < 16; i++) {
      const t = when + step * i;
      if (fill && i >= 12) {
        // A roll down the toms into the next bar.
        if (i % 2 === 0) tom(t, [190, 150, 120, 95][(i - 12) / 2], 0.9);
        if (i === 12) kick(t);
        continue;
      }
      if (drums.kick.includes(i) || (chorus && drums.kicksLate.includes(i))) kick(t, i === 0 ? 1 : 0.85);
      if (drums.snare.includes(i)) snare(t, 1);
      if (drums.clap?.includes(i)) clap(t, 0.9);
      if (drums.hat.includes(i)) hat(t, i % 4 === 0 ? 1 : 0.7, drums.open.includes(i) && chorus);
    }
    if (phrase === 0) crash(when, 0.9);
    if (phrase === 4) crash(when, 0.7);

    // The bass.
    const bassNote = root + 12;
    if (theme.bass === 'octave') {
      for (let i = 0; i < 16; i += 2) bass(when + step * i, bassNote + (i % 4 === 2 ? 12 : 0), step * 2, 0.95);
    } else if (theme.bass === 'walk') {
      const walk = [0, 0, 3, 5, 7, 5, 3, 0];
      for (let i = 0; i < 8; i++) bass(when + step * 2 * i, bassNote + walk[i], step * 2, 1);
    } else {
      for (let i = 0; i < 16; i += 2) bass(when + step * i, bassNote, step * 1.6, i === 0 ? 1.05 : 0.9);
    }

    // Two guitars, double-tracked, a hair apart and panned either side.
    const strum = STRUMS[theme.strum] ?? STRUMS.chug;
    for (let i = 0; i < 16; i++) {
      const hit = strum[i];
      if (!hit) continue;
      const len = hit === 2 ? step * (theme.strum === 'anthem' ? 5 : 3.2) : step * 0.9;
      const t = when + step * i;
      guitar(t, root + 24, len, { open: hit === 2, pan: -0.55, level: level * (chorus ? 1.05 : 0.95) });
      guitar(t + 0.006, root + 24, len, { open: hit === 2, pan: 0.55, level: level * (chorus ? 1.05 : 0.95) });
    }

    // The lead takes the choruses, and plays the riff over two bars.
    if (chorus && bar % 2 === 0) {
      const scale = SCALES[theme.scale] ?? SCALES.minor;
      for (const [s, degree, len] of theme.riff) {
        if (s >= 32) continue;
        lead(when + step * s, theme.key + 36 + scale[degree % scale.length] + (theme.prog[phrase] ?? 0) * 0, step * len, theme.lead, level);
      }
    }

    // Synths: an arpeggio round the chord, a pad under it.
    if (theme.arp) {
      const chord = [0, 3, 7, 12];
      for (let i = 0; i < 16; i++) arp(when + step * i, root + 36 + chord[i % 4] + (i % 8 >= 4 ? 12 : 0), step * 0.9, level);
    }
    if (theme.pad && phrase % 2 === 0) pad(when, [root + 36, root + 43, root + 48], beat * 8, level);
  }

  return {
    /**
     * Plays `theme` at `tempo` from now, until stopped, with the downbeat
     * `beat0` beats ago (so it can come back in step with a clock that kept
     * running). The first bar it plays is the next one that starts.
     */
    start(theme, tempo, beat0 = 0) {
      this.stop();
      target = ctx.createGain();
      target.connect(bus);
      const beat = 60 / tempo;
      const t0 = ctx.currentTime - beat0 * beat;
      const firstBar = Math.max(0, Math.ceil((beat0 * beat + 0.12) / (beat * 4)));
      const state = { theme, tempo, t0, bar: firstBar, out: target };
      state.timer = setInterval(() => {
        while (t0 + state.bar * beat * 4 < ctx.currentTime + 0.7) {
          playBar(theme, tempo, state.bar, t0 + state.bar * beat * 4);
          state.bar++;
        }
      }, 90);
      playing = state;
    },

    stop() {
      if (!playing) return;
      clearInterval(playing.timer);
      // What was already scheduled fades out rather than playing on.
      const gain = playing.out;
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      setTimeout(() => gain.disconnect(), 1500);
      playing = null;
    },

    get playing() { return Boolean(playing); },

    /** How many beats from the downbeat the band is, at the audio clock's `now`; null if it isn't playing. */
    beatAt(now = ctx.currentTime) {
      return playing ? ((now - playing.t0) * playing.tempo) / 60 : null;
    },

    /** `bars` bars of `theme` scheduled at once from now: for rendering offline (an OfflineAudioContext). */
    sketch(theme, tempo, bars) {
      target = ctx.createGain();
      target.connect(bus);
      const bar = (60 / tempo) * 4;
      for (let i = 0; i < bars; i++) playBar(theme, tempo, i, ctx.currentTime + 0.05 + i * bar);
    },
  };
}
