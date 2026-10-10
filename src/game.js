import { createEffects } from './effects.js';
import { createGig, putBack, resultOf, STEP, stepGig, toGround } from './gig.js';
import { comboAt, earn, windowLeft } from './hype.js';
import { HARM } from './integrity.js';
import { createLightshow } from './lightshow.js';
import { createProps } from './decor.js';
import { readyAll } from './models/library.js';
import { stars } from './rating.js';
import { createRock } from './rock.js';
import { ROCK_RADIUS } from './roll.js';
import { createExit, createVenueMeshes } from './scenery.js';
import { GRADES } from './smash.js';
import { say } from './quips.js';
import { BOARD_DETAIL } from './foes.js';
import { VENUES } from './venues/index.js';

/**
 * The game: the venues of the tour, one after another, each a gig. Rock
 * rolls through it, smashing the people in the way at speed, picking up
 * picks and gaff tape and passes, and keeping out of the way of speaker
 * stacks, pyro and live floor, until he reaches the stage door; the review
 * after it gives stars, and the next venue opens. At no integrity he is
 * shattered, unless there is a lighter to hold up for an encore.
 *
 * It keeps the screens and the state: `title`, `ready` (the venue's name
 * on screen), `play`, `lost` (off an edge or squashed: back in a moment),
 * `clear` (the review) and `over` (shattered). The rules are in gig.js.
 */

/** Hype for every venue cleared, by how far along the tour it was. */
export const CLEAR_BONUS = 100;

const BANNERS = {
  fell: 'INTO THE PIT!',
  zapped: 'ZAPPED!',
  crushed: 'SQUASHED!',
  burnt: 'SINGED!',
  thud: 'THUD!',
};

/** How close the camera comes for the title, and how fast it circles. */
const TITLE_ZOOM = 0.42;
const TITLE_TURN = 0.16;

export function createGame({ stage, hud, input, audio, storage }) {
  const { GFX, scene, view } = stage;
  const effects = createEffects(GFX, scene);
  const rock = createRock(GFX, { radius: ROCK_RADIUS });
  rock.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(rock.group);

  let gig = null;
  let group = null;
  let meshes = null, props = null, show = null, exit = null;
  let state = 'title'; // title · ready · play · lost · clear · over
  let paused = false;
  let timer = 0;
  let accumulator = 0;
  let playTime = 0;
  let lostHow = null;
  let saved = storage.load();
  let seen = new Set();
  let lastCombo = 0;
  let baking = false;
  let revHeld = false;
  let lastHp = 100;
  let currentIndex = 0;
  let zapTiles = [];
  const playZoom = { value: 1 };

  const settings = () => storage.load().settings;
  const flashing = () => settings().flashing;

  function setVenue(index) {
    if (group) scene.remove(group);
    currentIndex = index;
    gig = createGig(GFX, index, gig ? { ball: gig.ball, roll: gig.roll } : {});
    const venue = gig.venue;
    group = new GFX.Group();
    meshes = createVenueMeshes(GFX, gig.built, venue);
    props = createProps(GFX, venue);
    show = createLightshow(GFX, venue);
    exit = createExit(GFX, venue, { last: index === VENUES.length - 1 });
    group.add(meshes.group, props.group, show.group, gig.actors.group);
    if (exit) group.add(exit.group);
    scene.add(group);
    stage.setVenue(venue);
    effects.setVenue(venue);
    accumulator = 0;
    rock.group.visible = true;
    const b = gig.ball;
    stage.target.set(b.x, b.y, b.z);
    hud.map(gig);
    zapTiles = [];
    for (let z = 0; z < venue.rows; z++) for (let x = 0; x < venue.cols; x++) if (venue.cell(x, z)?.kind === 'zap') zapTiles.push([x, venue.cell(x, z).h[0], z]);
    warmUp();
    // Once everything in it has baked (they come in in the background), draw it all again so its shaders are ready too.
    const here = gig;
    baking = true;
    readyAll([
      ...venue.foes.map((m) => [m.kind, BOARD_DETAIL]),
      ...venue.pickups.map((p) => [p.kind, 1]),
    ]).then(() => {
      if (gig !== here) return;
      baking = false;
      warmUp();
    });
  }

  /**
   * Draws the whole venue once, nothing left out for being off screen, so
   * every shader it needs is compiled now (behind the venue's banner) and
   * not with a stall the first time some light or foe comes into view.
   */
  function warmUp() {
    const off = [];
    group.traverse((o) => {
      if ((o.isMesh || o.isSprite) && o.frustumCulled) {
        o.frustumCulled = false;
        off.push(o);
      }
    });
    try {
      stage.look();
      stage.render();
    } finally {
      for (const o of off) o.frustumCulled = true;
    }
  }

  function enter(next) {
    state = next;
    timer = 0;
  }

  /** The beat, as a number of beats from the downbeat: the music's clock if there is one, the game's if not. */
  const beatNow = () => audio.beat() ?? (gig.time * gig.venue.tempo) / 60;

  function showTitle() {
    hud.paused(false);
    setVenue(0);
    enter('title');
    paused = false;
    view.aim.zoom = TITLE_ZOOM;
    audio.stopMusic();
    hud.title(saved);
  }

  /** Starts venue `index`, or the furthest the tour has got if none is given. */
  function startVenue(index = null) {
    const i = index ?? Math.min(saved.reached, VENUES.length - 1);
    seen = new Set();
    beginVenue(Math.max(0, Math.min(VENUES.length - 1, i)));
  }

  function beginVenue(index) {
    setVenue(index);
    playTime = 0;
    lastCombo = 0;
    hud.paused(false);
    if (state === 'title') view.aim.zoom = playZoom.value;
    storage.reached(index);
    saved = storage.load();
    enter('ready');
    const venue = gig.venue;
    hud.play(venue);
    hud.banner(`ACT ${venue.act}\n${venue.name.toUpperCase()}`, 'big', venue.intro);
    hud.hype(0);
    hud.integrity(gig.rock);
    hud.carried({});
    hud.say(say('ready'), 'Rock', 2.4);
    audio.wake();
    audio.descend();
    audio.startMusic(venue, { gig });
  }

  /** Screen position, in CSS pixels, of a point in the venue. */
  const screenOf = (x, y, z) => {
    const rect = stage.renderer.domElement.getBoundingClientRect();
    const v = new GFX.Vector3(x, y, z).project(stage.camera);
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  };

  function lose(how) {
    const b = gig.ball;
    lostHow = how;
    enter('lost');
    hud.banner(`${BANNERS[how]}\n−${HARM[how]}`, 'hurt');
    rock.react(how === 'fell' ? 'fall' : 'hurt', 1.2);
    stage.shake = 0.18;
    hud.say(say(how), 'Rock', 2.4);
    if (how === 'zapped') { effects.embers(b.x, b.y, b.z, '#7ad8ff'); audio.zap(); rock.group.visible = false; }
    else if (how === 'crushed') { effects.dust(b.x, b.y - b.r, b.z); effects.chips(b.x, b.y, b.z, 12); audio.slam(); rock.group.visible = false; }
    else audio.fall();
  }

  function shatter() {
    const b = gig.ball;
    enter('over');
    rock.react('shatter', 99);
    effects.chips(b.x, b.y, b.z, 40);
    effects.dust(b.x, b.y - b.r, b.z);
    stage.shake = 0.3;
    hud.banner(null);
    audio.stopMusic();
    audio.over();
    rock.group.visible = false;
    hud.integrity(gig.rock);
    const q = say('shattered');
    setTimeout(() => {
      if (state !== 'over') return;
      hud.over({ act: gig.venue.act, name: gig.venue.name, hype: gig.hype.score, smashed: gig.stats.smashed, foes: gig.stats.foes, time: playTime }, q);
    }, 1400);
  }

  function finish() {
    const b = gig.ball;
    const last = currentIndex === VENUES.length - 1;
    enter('clear');
    const bonus = CLEAR_BONUS * gig.venue.act;
    earn(gig.hype, bonus);
    const result = { ...resultOf(gig), act: gig.venue.act, name: gig.venue.name, hype: Math.round(gig.hype.score), time: playTime, best: gig.hype.best };
    result.stars = stars(result);
    const old = storage.venue(currentIndex);
    result.newBest = result.hype > old.best;
    storage.cleared(currentIndex, result);
    saved = storage.load();
    result.hasNext = !last;
    effects.picks(b.x, b.y, b.z, 30);
    effects.confetti(b.x, b.y + 0.4, b.z, 80);
    audio.stopMusic();
    audio.clear();
    rock.react('proud', 99);
    hud.banner(last ? `THAT'S THE TOUR!` : `${gig.venue.name.toUpperCase()}\nDONE`, 'big', `+${bonus} hype`);
    hud.hype(gig.hype.score, { pulse: true });
    hud.say(say('clear'), 'Rock', 3);
    setTimeout(() => { if (state === 'clear') hud.review(result); }, 2200);
  }

  /** Turns what a step did into what is seen and heard. */
  function handle(out) {
    const b = gig.ball;
    if (out.impact > 2.5) {
      audio.land(out.impact);
      rock.knock(Math.min(6, out.impact * 0.5));
      if (out.impact > 6) effects.dust(b.x, b.y - b.r, b.z);
    }
    for (const h of out.hits) hit(h);
    for (const e of out.events) happened(e);
    if (out.hurt && out.hurt.how !== 'foe') {
      hud.integrity(gig.rock);
      if (out.hurt.how === 'burnt') {
        effects.embers(b.x, b.y, b.z);
        effects.sparks(b.x, b.y - b.r, b.z);
        audio.burst();
        hud.banner(`${BANNERS.burnt}\n−${out.hurt.amount}`, 'hurt');
        hud.say(say('burnt'), 'Rock', 2.4);
        rock.react('hurt', 0.5);
      } else if (out.hurt.how === 'thud') {
        effects.dust(b.x, b.y - b.r, b.z);
        audio.hurt();
        hud.say(say('thud'), 'Rock', 2);
      }
      stage.shake = Math.max(stage.shake, 0.1);
    }
    for (const p of out.picked) picked(p);
    for (const bm of out.bumped) { audio.bumper(); rock.react('smash', 0.3); stage.shake = Math.max(stage.shake, 0.05); void bm; }
    for (const g of out.broke) {
      const at = [g.centre[0], g.base + 0.6, g.centre[2]];
      effects.dust(...at);
      effects.chips(...at, 22);
      effects.confetti(...at, 14);
      audio.panel();
      stage.shake = Math.max(stage.shake, 0.2);
      hud.banner('SMASHED THROUGH!', 'normal');
      hud.say(say('broke'), 'Rock', 2.6);
    }
    if (out.door === 'opened') { audio.gate(); hud.banner('GATE OPEN'); hud.carried(carriedNow()); }
    if (out.door === 'locked') { audio.locked(); hud.banner('LOCKED\nfind the pass'); hud.say(say('locked'), 'Rock', 2.6); }
    if (out.door === 'sturdy') { audio.locked(); hud.say(say('sturdy'), 'Rock', 2.6); }
    if (out.encore) {
      effects.sparkle(b.x, b.y, b.z, '#ffb36b');
      effects.sparkle(b.x, b.y, b.z, '#ffe08a');
      audio.encore();
      hud.banner('ENCORE!\nthe crowd wants more', 'big');
      hud.say(say('encore'), 'Rock', 3);
      rock.react('proud', 1.4);
      hud.integrity(gig.rock);
      hud.carried(carriedNow());
    }
    if (out.outcome === 'exit') finish();
    else if (out.outcome === 'shattered') shatter();
    else if (out.outcome) lose(out.outcome);
  }

  /** A speaker stack came down, or pyro fired: heard and felt by how near it is. */
  function happened(e) {
    const b = gig.ball;
    const d = Math.hypot(e.x - b.x, e.z - b.z);
    if (d > 16) return;
    const near = 1 - d / 16;
    if (e.type === 'slam') {
      audio.slam(near);
      effects.dust(e.x, e.y, e.z);
      stage.shake = Math.max(stage.shake, 0.05 * near);
    } else audio.burst(near);
  }

  function hit(h) {
    const f = h.foe;
    const b = gig.ball;
    const at = screenOf(f.x, f.y + 0.7, f.z);
    const grade = GRADES[h.grade];
    audio.smash(h.grade, h.speed);
    if (h.down) {
      effects.smash(f.x, f.y + 0.4, f.z, { size: f.stats.boss ? 2.4 : 1, dir: h.dir, crit: h.grade === 'crit' });
      stage.shake = Math.max(stage.shake, h.grade === 'crit' ? 0.3 : 0.14);
      rock.react('smash', 0.55);
      hud.pop(at.x, at.y, `+${h.gain}`, h.multiplier > 2 || h.grade === 'crit' ? 'big' : '');
      if (h.multiplier > 1) hud.pop(at.x, at.y - 34, `×${h.multiplier} COMBO`, 'big');
      if (h.grade === 'crit') hud.banner(grade.title, 'normal');
      if (f.stats.shout) hud.pop(at.x + 30, at.y - 64, f.stats.shout, 'hurt');
      // The first of each kind: who it was.
      if (!seen.has(f.kind)) {
        seen.add(f.kind);
        hud.say(f.stats.blurb, f.stats.name.toUpperCase(), 4.2);
      } else if (h.multiplier >= 3 && h.multiplier !== lastCombo) hud.say(say('combo'), 'Rock', 2);
      else hud.say(say(h.grade === 'crit' ? 'crit' : 'smash'), 'Rock', 2);
      lastCombo = h.multiplier;
      hud.hype(gig.hype.score, { combo: h.combo, multiplier: h.multiplier, left: 1, pulse: true });
    } else {
      effects.dust(b.x, b.y - b.r * 0.5, b.z);
      stage.shake = Math.max(stage.shake, 0.1);
      rock.react('hurt', 0.5);
      hud.pop(at.x, at.y, h.damage > 0 ? `−${h.damage}` : grade.title, 'hurt');
      hud.say(say(h.grade), 'Rock', 2.2);
      if (f.stats.flash) hud.flash(1);
    }
    if (h.damage > 0) {
      effects.chips(b.x, b.y, b.z, Math.min(14, 3 + h.damage));
      hud.integrity(gig.rock);
    }
    if (f.stats.boss && !h.down) hud.banner(`${f.stats.name.toUpperCase()}\n${Math.max(0, Math.ceil(f.hp))} to go`, 'normal');
  }

  function picked(p) {
    const at = screenOf(p.x, p.y + 0.5, p.z);
    if (p.kind === 'pick' || p.kind === 'case') {
      effects.picks(p.x, p.y, p.z, p.kind === 'case' ? 22 : 7);
      audio.pick(p.kind === 'case');
      hud.pop(at.x, at.y, `+${p.amount}`, 'pick');
      hud.hype(gig.hype.score, { combo: comboAt(gig.hype, gig.time), multiplier: Math.min(5, comboAt(gig.hype, gig.time)), left: windowLeft(gig.hype, gig.time) });
      if (p.kind === 'case') hud.banner(`ROAD CASE\n+${p.amount}`, 'normal');
    } else if (p.kind === 'tape') {
      effects.sparkle(p.x, p.y, p.z, '#cfd6e2');
      audio.tape();
      hud.integrity(gig.rock);
      hud.banner(`GAFF TAPE\n+${p.amount} integrity`, 'normal');
      hud.say(say('tape'), 'Rock', 2.4);
    } else if (p.kind === 'lighter') {
      effects.sparkle(p.x, p.y, p.z, '#ffb36b');
      audio.lighter();
      hud.banner('A LIGHTER\nfor an encore', 'normal');
      hud.say(say('lighter'), 'Rock', 2.8);
    } else if (p.kind === 'pass') {
      effects.sparkle(p.x, p.y, p.z, '#2de2ff');
      audio.pass();
      hud.banner('ALL ACCESS');
      hud.say(say('pass'), 'Rock', 2.4);
    } else if (p.kind === 'record') {
      effects.sparkle(p.x, p.y, p.z, '#ffd23a');
      effects.picks(p.x, p.y, p.z, 14);
      effects.confetti(p.x, p.y, p.z, 30);
      audio.record();
      hud.banner(`GOLD RECORD\n${gig.stats.records} of 3`, 'normal');
      hud.say(say('record'), 'Rock', 3);
      hud.hype(gig.hype.score, { pulse: true });
    }
    hud.carried(carriedNow());
  }

  const carriedNow = () => ({ records: gig.stats.records, passes: gig.passes, lighters: gig.rock.lighters });

  /** Sparks off the zap floor near Rock, a few a second. */
  function zapSparks(dt) {
    const b = gig.ball;
    for (let n = 0; n < 3; n++) {
      if (!zapTiles.length || Math.random() > dt * 14) continue;
      const [x, h, z] = zapTiles[Math.floor(Math.random() * zapTiles.length)];
      if (Math.abs(x - b.x) > 10 || Math.abs(z - b.z) > 10) continue;
      effects.ember(x + Math.random(), h + 0.05, z + Math.random(), gig.venue.palette.zap ?? '#7ad8ff');
    }
  }

  function setPaused(on) {
    paused = on;
    hud.paused(on, saved);
    if (on) audio.stopMusic(); else audio.startMusic(gig.venue, { gig });
  }

  function update(dt, presses) {
    // Read every frame, paused or not: the gamepad's buttons come in through it too.
    const stick = input.stick();
    revHeld = input.rev();

    const look = input.view(dt);
    view.turn(look.turn, look.tilt);
    view.zoomBy(look.zoom);
    if (state === 'title') view.aim.yaw += TITLE_TURN * dt;
    else playZoom.value = view.aim.zoom;
    view.step(dt);
    stage.time += dt;

    for (const p of presses) {
      if (p === 'mute') hud.muted(audio.toggleMute());
      if (p === 'home') {
        view.reset();
        if (state === 'title') view.aim.zoom = TITLE_ZOOM;
      }
      if (p === 'pause' && (state === 'play' || state === 'ready' || state === 'lost')) setPaused(!paused);
      else if (p === 'pause' && paused) setPaused(false);
      if (p === 'start' && state === 'title' && hud.screen === 'title') startVenue(null);
    }
    if (paused) {
      audio.rolling(0, false);
      return;
    }

    timer += dt;
    const live = state === 'play';
    if (live) playTime += dt;
    {
      const push = live ? toGround(stick, view.yaw) : [0, 0];
      accumulator = Math.min(accumulator + dt, STEP * 12);
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const out = stepGig(gig, state === 'play' ? push : [0, 0], STEP, {
          live: state === 'play',
          moving: rock.group.visible && !(state === 'lost' && lostHow !== 'fell'),
          rev: state === 'play' && revHeld,
        });
        handle(out);
        if (state !== 'play' && state !== 'ready' && state !== 'title') { accumulator = 0; break; }
      }
    }

    const b = gig.ball;
    switch (state) {
      case 'ready':
        if (timer > 1.8 && !baking) {
          enter('play');
          hud.banner(null);
        }
        break;
      case 'play':
        if (timer > 1.8 && hud.bannerShown) hud.banner(null);
        break;
      case 'lost':
        if (timer > 1.7) {
          putBack(gig);
          rock.group.visible = true;
          hud.banner(null);
          enter('play');
        }
        break;
    }

    // Rock, turned as he rolls.
    const speed = Math.hypot(b.vx, b.vz);
    rock.update(dt, { q: gig.roll.q, position: [b.x, b.y, b.z] });

    // The light show keeps the beat; the page flashes with the strobes.
    show.update({ time: stage.time, beat: beatNow(), rock: [b.x, b.y, b.z], lights: stage.fixtureLights, flashing: flashing() });
    stage.flash = show.flash;
    hud.flash(flashing() ? Math.max(show.flash, 0) : 0);
    props.update(stage.time, beatNow());
    meshes.update(stage.time);
    exit?.update(stage.time);
    gig.actors.sync(dt, gig.time, { focus: b });
    zapSparks(dt);
    effects.update(dt);
    stage.shake *= Math.exp(-dt * 9);
    audio.rolling(state === 'play' && b.grounded ? speed : 0, b.grounded);
    audio.rev(gig.revving);
    hud.tick(dt, gig);
    stage.rock.set(b.x, b.y, b.z);

    // The HUD, as it changes.
    if (state !== 'title') {
      hud.rev(gig.rev / 100, gig.revving);
      if (Math.abs(gig.rock.hp - lastHp) > 0.01) { hud.integrity(gig.rock); lastHp = gig.rock.hp; }
      const c = comboAt(gig.hype, gig.time);
      if (c !== lastCombo && c === 0) hud.hype(gig.hype.score, { combo: 0 });
      else if (c > 0) hud.hype(gig.hype.score, { combo: c, multiplier: Math.min(5, c), left: windowLeft(gig.hype, gig.time) });
      lastCombo = c;
    }

    // The camera: after Rock, but not down into the dark after him.
    const target = stage.target;
    if (debug.look) {
      target.set(...debug.look.at);
      view.zoom = view.aim.zoom = debug.look.zoom;
      return;
    }
    const ty = Math.max(b.y, gig.venue.lowest - 1);
    const k = 1 - Math.exp(-(state === 'title' ? 2 : 5) * dt);
    target.x += (b.x - target.x) * k;
    target.y += (ty - target.y) * k;
    target.z += (b.z - target.z) * k;
  }

  /** For tests and the console: the venue, Rock, and a camera override (`look`). */
  const debug = {
    stage, look: null,
    get gig() { return gig; },
    get ball() { return gig.ball; },
    get state() { return state; },
    get rock() { return rock; },
    get show() { return show; },
    /** Straight to venue `index`, for looking round. */
    venue(index) { startVenue(index); },
    /** Rock to tile (x, z), standing still. */
    teleport(x, z) {
      const b = gig.ball;
      b.x = x + 0.5; b.z = z + 0.5; b.y = (gig.venue.heightAt(b.x, b.z) ?? 0) + b.r + 0.02;
      b.vx = b.vy = b.vz = 0;
      stage.target.set(b.x, b.y, b.z);
    },
  };

  showTitle();

  return {
    update,
    startVenue,
    again() { beginVenue(currentIndex); },
    next() { if (currentIndex + 1 < VENUES.length) beginVenue(currentIndex + 1); else showTitle(); },
    showTitle,
    resume() { setPaused(false); },
    pause: setPaused,
    quit() { showTitle(); hud.tour(saved); },
    get state() { return state; },
    get paused() { return paused; },
    /** Where Rock is on the screen, in CSS pixels, for the pointer controls. */
    rockOnScreen(rect) {
      const b = gig.ball;
      const v = new GFX.Vector3(b.x, b.y, b.z).project(stage.camera);
      return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
    },
    refreshSaved() { saved = storage.load(); return saved; },
    debug,
  };
}
