import '@fontsource/anton/400.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';

import { createAudio } from './audio.js';
import { createGame } from './game.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { preload } from './models/library.js';
import { createStage } from './stage.js';
import { createStorage } from './storage.js';

// The foes and the props are sculpted in code: start baking them before anything else.
preload();

const view = document.getElementById('view');
const audio = createAudio();
const storage = createStorage();
const wake = () => audio.wake();
addEventListener('pointerdown', wake);
addEventListener('keydown', wake);

let game = null;
let input = null;
const hud = createHud(document.body, {
  onStart: (index) => { audio.wake(); game?.startVenue(index); },
  onResume: () => game?.resume(),
  onRestart: () => { audio.wake(); game?.again(); },
  onNext: () => game?.next(),
  onSetting: (name, value) => {
    const saved = storage.setting(name, value);
    audio.setVolume(name, value);
    hud.saved = saved;
  },
  onRevHeld: (on) => input?.setRev(on),
});
hud.muted(audio.muted);
hud.muteButton.addEventListener('mute', () => hud.muted(audio.toggleMute()));
hud.pauseButton.addEventListener('pausebutton', () => game?.pause(!game.paused));

input = createInput(view, {
  anchor: () => game?.rockOnScreen(view.getBoundingClientRect()),
});

try {
  const stage = await createStage(view);
  game = createGame({ stage, hud, input, audio, storage });
  globalThis.rocknroller = game;
  // For the tests and the console: run the game `seconds` ahead without drawing it (software rendering is slow).
  game.debug.advance = (seconds, step = 1 / 60) => {
    for (let t = 0; t < seconds; t += step) game.update(step, input.take());
    stage.look();
  };
  audio.setVolume('music', storage.load().settings.music);
  audio.setVolume('sfx', storage.load().settings.sfx);

  let last = performance.now();
  stage.renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    game.update(dt, input.take());
    stage.look();
    stage.render();
  });
} catch (err) {
  const box = document.getElementById('error');
  box.hidden = false;
  box.textContent = 'The game could not start: this browser offers neither WebGPU nor WebGL 2.\n\n'
    + String(err && err.message ? err.message : err);
  console.error(err);
}
