import { goals, RECORDS } from './rating.js';
import { MAX_INTEGRITY } from './integrity.js';
import { VENUES } from './venues/index.js';

/**
 * Everything on screen that isn't the 3D view: the venue, the hype and the
 * combo along the top; Rock's integrity (a VU meter) and rev along the
 * bottom, and what he says; a map of what has been seen; the big messages
 * in the middle and the numbers that fly up off a smash; and the screens —
 * title, the tour, pause and settings, the review after a gig, and the end.
 */

const SEGMENTS = 24;

/** The venues' names and tints, read once. */
const INFO = VENUES.map((make) => {
  const v = make();
  return { name: v.name, act: v.act, intro: v.intro, tint: v.palette.walls?.[0] ?? '#2a1a3a', pink: v.palette.exit ?? '#ff3fa4' };
});

const el = (tag, className = '', html = '') => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
};

/** `n` with thousands separated, for the hype. */
const grand = (n) => Math.round(n).toLocaleString('en-US');

/** Seconds as m:ss. */
export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function createHud(root, { onStart, onResume, onRestart, onQuit, onNext, onSetting, onRevHeld }) {
  const ui = root.querySelector('#ui');

  // ——— the HUD.
  const hud = el('div', '');
  hud.id = 'hud';
  hud.hidden = true;
  hud.innerHTML = `
    <div class="plate"><span class="act"></span><span class="name"></span></div>
    <div class="hype"><span class="label">Hype</span><span class="num">0</span>
      <div class="combo"><b>×1</b><div class="bar"><i></i></div></div></div>
    <div class="carried">
      <div class="chip records"><span class="n">0/3</span><small>records</small></div>
      <div class="chip passes"><span class="n">0</span><small>pass</small></div>
      <div class="chip lighters"><span class="n">0</span><small>encore</small></div>
    </div>
    <canvas id="map" width="180" height="180" aria-label="Map of what has been seen"></canvas>
    <div class="meters">
      <div class="meter"><div class="row"><span class="label">Integrity</span><span class="value" id="integrity-value">100%</span></div>
        <div class="vu" id="vu">${'<i></i>'.repeat(SEGMENTS)}</div></div>
      <div class="meter"><div class="row"><span class="label">Rev</span><span class="label"><kbd>Space</kbd></span></div>
        <div class="rev" id="rev"><i></i></div></div>
    </div>
    <div id="say"></div>`;
  const plate = hud.querySelector('.plate');
  const hypeNum = hud.querySelector('.hype .num');
  const combo = hud.querySelector('.combo');
  const comboX = combo.querySelector('b');
  const comboBar = combo.querySelector('.bar i');
  const chips = {
    records: hud.querySelector('.chip.records'),
    passes: hud.querySelector('.chip.passes'),
    lighters: hud.querySelector('.chip.lighters'),
  };
  const vu = hud.querySelector('#vu');
  const segs = [...vu.children];
  const integrityValue = hud.querySelector('#integrity-value');
  const revEl = hud.querySelector('#rev');
  const revBar = revEl.firstElementChild;
  const sayEl = hud.querySelector('#say');
  const mapEl = hud.querySelector('#map');
  const mapCtx = mapEl.getContext('2d');
  ui.appendChild(hud);

  const bannerEl = el('div');
  bannerEl.id = 'banner';
  bannerEl.hidden = true;
  const popsEl = el('div');
  popsEl.id = 'pops';
  ui.append(popsEl, bannerEl);

  const revButton = el('button', '', 'REV');
  revButton.id = 'rev-button';
  revButton.type = 'button';
  revButton.setAttribute('aria-label', 'Rev');
  const held = (on) => (e) => { e.preventDefault(); e.stopPropagation(); revButton.classList.toggle('held', on); onRevHeld?.(on); };
  revButton.addEventListener('pointerdown', held(true));
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) revButton.addEventListener(t, held(false));
  ui.appendChild(revButton);

  const corner = el('div', 'corner');
  const muteButton = el('button', '', 'sound on');
  muteButton.type = 'button';
  muteButton.id = 'mute';
  muteButton.setAttribute('aria-pressed', 'false');
  const pauseButton = el('button', '', 'pause');
  pauseButton.type = 'button';
  corner.append(pauseButton, muteButton);
  ui.appendChild(corner);
  muteButton.addEventListener('click', (e) => { e.stopPropagation(); muteButton.dispatchEvent(new CustomEvent('mute', { bubbles: true })); });
  pauseButton.addEventListener('click', (e) => { e.stopPropagation(); pauseButton.dispatchEvent(new CustomEvent('pausebutton', { bubbles: true })); });

  let shown = false;
  let sayTimer = 0;
  let mapEvery = 0;
  let mapScale = 2;
  let lastHype = 0;
  let lastHp = MAX_INTEGRITY;

  // ——— screens.
  const screens = {};
  const screen = (name, className, html) => {
    const s = el('section', `screen ${className}`, html);
    s.hidden = true;
    s.dataset.screen = name;
    ui.appendChild(s);
    screens[name] = s;
    return s;
  };

  const title = screen('title', 'title', `
    <div>
      <header class="logo">
        <h1 class="top flicker">Rock <span class="amp">'n'</span></h1>
        <h1 class="bottom">Roller</h1>
        <p class="tag">a boulder's guide to the road</p>
      </header>
      <div class="menu">
        <button class="btn" data-act="start" type="button"><span>Roll out</span></button>
        <button class="btn alt" data-act="tour" type="button"><span>The tour</span></button>
        <button class="btn alt small" data-act="settings" type="button"><span>Settings</span></button>
        <p class="best"></p>
      </div>
      <p class="help">
        <span class="keys"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>WASD</kbd> roll · <kbd>Space</kbd> rev · <kbd>Q</kbd><kbd>E</kbd> turn the view · wheel zoom · <kbd>P</kbd> pause</span>
        <span class="touch">hold a finger and roll toward it · REV button to charge · two fingers to turn and zoom</span>
        <span>run into people at speed. it's what rocks do.</span>
      </p>
    </div>`);

  const tour = screen('tour', 'tour scrim', `
    <div style="width:100%">
      <h2 class="display neon">The Tour</h2>
      <p class="sub">pick a night</p>
      <div class="venues" id="venues"></div>
      <button class="btn alt small back" data-act="back" type="button"><span>Back</span></button>
    </div>`);
  const venuesEl = tour.querySelector('#venues');

  const review = screen('review', 'scrim', `
    <div class="card">
      <div class="venue-name"></div>
      <h2 class="neon" style="--glow: var(--cyan)">Set review</h2>
      <div class="newbest" hidden>new best</div>
      <div class="big-stars"></div>
      <ul class="goals"></ul>
      <div class="tally"></div>
      <div class="row">
        <button class="btn" data-act="next" type="button"><span>Next venue</span></button>
        <button class="btn alt small" data-act="again" type="button"><span>Again</span></button>
        <button class="btn alt small" data-act="tour" type="button"><span>Tour</span></button>
      </div>
    </div>`);

  const over = screen('over', 'scrim', `
    <div class="card over">
      <div class="venue-name"></div>
      <h2 class="neon" style="--glow: var(--red)">Shattered</h2>
      <p class="quip"></p>
      <div class="tally"></div>
      <div class="row">
        <button class="btn" data-act="again" type="button"><span>Go again</span></button>
        <button class="btn alt small" data-act="tour" type="button"><span>The tour</span></button>
      </div>
    </div>`);

  const pause = screen('pause', 'scrim', `
    <div class="card">
      <h2 class="neon" style="--glow: var(--pink)">Paused</h2>
      <div class="settings"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn" data-act="resume" type="button"><span>Back to it</span></button>
        <button class="btn alt small" data-act="again" type="button"><span>Restart</span></button>
        <button class="btn alt small" data-act="tour" type="button"><span>Quit to tour</span></button>
      </div>
    </div>`);

  const settings = screen('settings', 'scrim', `
    <div class="card">
      <h2 class="neon" style="--glow: var(--cyan)">Settings</h2>
      <div class="settings"></div>
      <div class="row" style="margin-top:14px"><button class="btn alt small" data-act="back" type="button"><span>Done</span></button></div>
    </div>`);

  /** The settings rows, shared by the pause card and the settings card. */
  function settingsRows(saved) {
    const frag = document.createDocumentFragment();
    const slider = (name, title, hint) => {
      const row = el('div', 'setting', `<span>${title}<small>${hint}</small></span><input type="range" min="0" max="1" step="0.05" aria-label="${title}">`);
      const input = row.querySelector('input');
      input.value = saved.settings[name];
      input.addEventListener('input', () => onSetting?.(name, Number(input.value)));
      input.addEventListener('pointerdown', (e) => e.stopPropagation());
      return row;
    };
    const toggle = (name, title, hint) => {
      const row = el('div', 'setting', `<span>${title}<small>${hint}</small></span><label class="toggle"><input type="checkbox" aria-label="${title}"><i></i></label>`);
      const input = row.querySelector('input');
      input.checked = saved.settings[name];
      input.addEventListener('change', () => onSetting?.(name, input.checked));
      return row;
    };
    frag.append(
      slider('music', 'Music', 'the band'),
      slider('sfx', 'Sound effects', 'everything else'),
      toggle('flashing', 'Strobe lights', 'off: no flashing, only a glow'),
    );
    return frag;
  }

  // Buttons on every screen go through here.
  ui.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-act]');
    if (!b) return;
    e.stopPropagation();
    const act = b.dataset.act;
    if (act === 'start') onStart?.(null);
    else if (act === 'tour') api.tour(api.saved);
    else if (act === 'settings') api.settings(api.saved, 'title');
    else if (act === 'back') api.back();
    else if (act === 'resume') onResume?.();
    else if (act === 'again') onRestart?.();
    else if (act === 'next') onNext?.();
    else if (act === 'quit') onQuit?.();
    if (act === 'tour' && screens.pause && !screens.pause.hidden) onQuit?.();
  });
  ui.addEventListener('pointerdown', (e) => { if (e.target.closest?.('button, input, label')) e.stopPropagation(); });

  const hideScreens = () => { for (const s of Object.values(screens)) s.hidden = true; };

  const stars = (n) => `<b>${'★'.repeat(n)}</b>${'★'.repeat(3 - n)}`;

  /** The map: every tile seen so far, Rock, the people near him, and the stage door once found. */
  function drawMap(gig) {
    const { venue, explored, ball } = gig;
    const s = mapScale;
    mapCtx.clearRect(0, 0, mapEl.width, mapEl.height);
    for (let z = 0; z < venue.rows; z++) {
      for (let x = 0; x < venue.cols; x++) {
        if (!explored[z * venue.cols + x]) continue;
        const c = venue.cell(x, z);
        if (!c) continue;
        mapCtx.fillStyle = c.kind === 'wall' ? '#3d3850' : c.kind === 'zap' ? '#2de2ff' : c.kind === 'exit' ? '#ff2d95'
          : c.trap ? '#ff8a3a' : c.door ? '#b0b4bd' : c.fx === 'sticky' ? '#7a5a30' : '#9a94ad';
        mapCtx.fillRect(x * s, z * s, s, s);
      }
    }
    for (const m of gig.actors.foes) {
      if (m.dead || m.gone) continue;
      if (Math.hypot(m.x - ball.x, m.z - ball.z) > 9) continue;
      mapCtx.fillStyle = '#ff4a3a';
      mapCtx.fillRect(m.x * s - s, m.z * s - s, s * 2, s * 2);
    }
    for (const p of gig.actors.pickups) {
      if (p.taken || !explored[Math.floor(p.z) * venue.cols + Math.floor(p.x)]) continue;
      mapCtx.fillStyle = p.kind === 'pass' ? '#2de2ff' : p.kind === 'tape' ? '#c8ccd4' : p.kind === 'lighter' ? '#ffb36b' : p.kind === 'record' ? '#ffd23a' : '#ffcf4a';
      mapCtx.fillRect(p.x * s - s / 2, p.z * s - s / 2, s, s);
    }
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.arc(ball.x * s, ball.z * s, s * 1.8, 0, Math.PI * 2);
    mapCtx.fill();
  }

  const api = {
    saved: { venues: {}, reached: 0, settings: { music: 0.8, sfx: 0.9, flashing: true } },
    get bannerShown() { return shown; },
    muteButton, pauseButton,

    /** Which screen is up, if any. */
    get screen() { return Object.entries(screens).find(([, s]) => !s.hidden)?.[0] ?? null; },

    title(saved) {
      this.saved = saved;
      hideScreens();
      hud.hidden = true;
      bannerEl.hidden = true;
      shown = false;
      title.hidden = false;
      const total = Object.values(saved.venues).reduce((s, v) => s + v.stars, 0);
      const best = Object.values(saved.venues).reduce((s, v) => s + (v.best ?? 0), 0);
      title.querySelector('.best').textContent = saved.reached > 0 || total > 0
        ? `${total} of ${INFO.length * 3} stars · tour hype ${grand(best)}`
        : '';
      title.querySelector('[data-act=start]').firstElementChild.textContent = saved.reached > 0 ? 'Roll on' : 'Roll out';
    },

    /** The tour: every venue as a card; those not yet reached are locked. */
    tour(saved) {
      this.saved = saved;
      hideScreens();
      tour.hidden = false;
      venuesEl.replaceChildren(...INFO.map((v, i) => {
        const s = saved.venues[i] ?? { stars: 0, best: 0, records: 0 };
        const b = el('button', 'venue');
        b.type = 'button';
        b.style.setProperty('--tint', v.tint);
        b.disabled = i > saved.reached;
        b.innerHTML = `<span class="num">${i + 1}</span><span class="name">${v.name}</span><span class="line">${v.intro}</span>`
          + `<span class="foot"><span class="stars">${stars(s.stars)}</span><span>${s.best ? grand(s.best) : b.disabled ? 'locked' : 'new'}</span></span>`;
        b.addEventListener('click', (e) => { e.stopPropagation(); onStart?.(i); });
        return b;
      }));
    },

    settings(saved, from = 'title') {
      this.saved = saved;
      this._from = from;
      hideScreens();
      settings.hidden = false;
      settings.querySelector('.settings').replaceChildren(settingsRows(saved));
    },

    back() {
      if (this._from === 'pause') { this._from = null; hideScreens(); pause.hidden = false; pause.querySelector('.settings').replaceChildren(settingsRows(this.saved)); return; }
      this.title(this.saved);
    },

    /** The venue begins: the HUD up, the screens down. */
    play(venue) {
      hideScreens();
      hud.hidden = false;
      plate.querySelector('.act').textContent = `Act ${venue.act}`;
      plate.querySelector('.name').textContent = venue.name;
      revButton.classList.add('available');
    },

    hype(n, { combo: c = 0, multiplier = 1, left = 0, pulse = false } = {}) {
      hypeNum.textContent = grand(n);
      if (pulse && n !== lastHype) { hypeNum.classList.remove('bump'); void hypeNum.offsetWidth; hypeNum.classList.add('bump'); }
      lastHype = n;
      combo.classList.toggle('on', c > 1 || (c === 1 && left > 0 && multiplier > 1));
      comboX.textContent = `×${Math.min(5, Math.max(1, c))}`;
      comboBar.style.transform = `scaleX(${Math.max(0, Math.min(1, left))})`;
    },

    /** Rock's integrity as the VU meter, lit green through yellow to red. */
    integrity(rock) {
      const frac = Math.max(0, rock.hp) / rock.max;
      const lit = Math.ceil(frac * SEGMENTS);
      segs.forEach((s, i) => {
        s.classList.toggle('on', i < lit);
        const k = i / SEGMENTS;
        s.style.setProperty('--seg', k < 0.35 ? '#ff4a3a' : k < 0.6 ? '#ffd23a' : '#3ae88a');
      });
      integrityValue.textContent = `${Math.max(0, Math.ceil(frac * 100))}%`;
      vu.classList.toggle('low', frac > 0 && frac <= 0.3);
      if (rock.hp < lastHp - 0.5) { vu.classList.remove('hit'); void vu.offsetWidth; vu.classList.add('hit'); }
      lastHp = rock.hp;
    },

    /** The rev meter: `frac` full, `active` while it is being spent. */
    rev(frac, active) {
      revBar.style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
      revEl.classList.toggle('active', active);
      revEl.classList.toggle('empty', frac < 0.15);
    },

    carried({ records = 0, passes = 0, lighters = 0 }) {
      const set = (chip, n, text, show) => {
        const was = chip.querySelector('.n').textContent;
        chip.querySelector('.n').textContent = text ?? String(n);
        chip.classList.toggle('show', show);
        if (was !== chip.querySelector('.n').textContent) { chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
      };
      set(chips.records, records, `${records}/${RECORDS}`, records > 0);
      set(chips.passes, passes, null, passes > 0);
      set(chips.lighters, lighters, null, lighters > 0);
    },

    /** Rock says something; `who` names whoever it is about (a foe's blurb, say). */
    say(text, who = 'Rock', seconds = 3.4) {
      if (!text) return;
      sayEl.innerHTML = `<b>${who}</b>${text}`;
      sayEl.classList.add('show');
      sayTimer = seconds;
    },

    banner(text, size = 'normal', sub = '') {
      shown = text != null;
      bannerEl.hidden = !shown;
      if (!shown) return;
      bannerEl.textContent = text;
      if (sub) {
        const small = document.createElement('small');
        small.textContent = sub;
        bannerEl.appendChild(small);
      }
      bannerEl.className = size;
      void bannerEl.offsetWidth;
      bannerEl.classList.add('pop');
    },

    /** A number or a word that flies up from a point on the screen (CSS pixels). */
    pop(x, y, text, kind = '') {
      const p = el('div', `pop-text ${kind}`);
      p.textContent = text;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      popsEl.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    },

    /** The page flashing with the strobes: `level` 0 to 1, as a wash of white. */
    flash(level) {
      const s = root.querySelector('#strobe');
      s.style.opacity = String(Math.min(0.22, level * 0.22));
    },

    /** A new venue: a map canvas to fit it. */
    map(gig) {
      const { cols, rows } = gig.venue;
      mapScale = Math.max(1, Math.floor(Math.min(180 / cols, 180 / rows)));
      mapEl.width = cols * mapScale;
      mapEl.height = rows * mapScale;
      mapEvery = 0;
    },

    /** Once a frame: the map, now and then, and the caption fading. */
    tick(dt, gig) {
      if (sayTimer > 0) {
        sayTimer -= dt;
        if (sayTimer <= 0) sayEl.classList.remove('show');
      }
      mapEvery -= dt;
      if (mapEvery > 0 || hud.hidden) return;
      mapEvery = 0.15;
      drawMap(gig);
    },

    /** The review after a gig: stars, goals, numbers. `result` from the game. */
    review(result) {
      hideScreens();
      review.hidden = false;
      review.querySelector('.venue-name').textContent = `Act ${result.act} · ${result.name}`;
      review.querySelector('.big-stars').innerHTML = stars(result.stars);
      review.querySelector('.newbest').hidden = !result.newBest;
      review.querySelector('.goals').innerHTML = goals(result).map((g) => `
        <li class="${g.met ? 'met' : ''}"><span class="mark">${g.met ? '★' : '☆'}</span>
        <span class="t">${g.title}<br><small>${g.text}</small></span>
        <small>${g.progress ? `${g.progress[0]}/${g.progress[1]}` : ''}</small></li>`).join('');
      review.querySelector('.tally').innerHTML = `
        <div><b>${grand(result.hype)}</b><span class="label">Hype</span></div>
        <div><b>${clock(result.time)}</b><span class="label">Time</span></div>
        <div><b>${result.best}</b><span class="label">Best combo</span></div>`;
      review.querySelector('[data-act=next]').hidden = !result.hasNext;
      review.querySelector('[data-act=next]').focus({ preventScroll: true });
    },

    /** Shattered: where, and how much, and what he says. */
    over(result, quip = '') {
      hideScreens();
      over.hidden = false;
      over.querySelector('.venue-name').textContent = `Act ${result.act} · ${result.name}`;
      over.querySelector('.quip').textContent = quip ? `“${quip}”` : '';
      over.querySelector('.tally').innerHTML = `
        <div><b>${grand(result.hype)}</b><span class="label">Hype</span></div>
        <div><b>${result.smashed}/${result.foes}</b><span class="label">Smashed</span></div>
        <div><b>${clock(result.time)}</b><span class="label">Time</span></div>`;
      over.querySelector('[data-act=again]').focus({ preventScroll: true });
    },

    paused(on, saved) {
      if (!on) { pause.hidden = true; return; }
      this.saved = saved ?? this.saved;
      this._from = null;
      pause.hidden = false;
      pause.querySelector('.settings').replaceChildren(settingsRows(this.saved));
    },

    muted(on) {
      muteButton.setAttribute('aria-pressed', String(on));
      muteButton.textContent = on ? 'sound off' : 'sound on';
    },

    /** Show or hide the rev button (for fingers). */
    touchRev(on) { revButton.classList.toggle('available', on); },
  };
  return api;
}
