/**
 * Every sound (a stand-in: the real one comes later in this file's life).
 * The API the game calls is all here; each does nothing yet.
 */
export function createAudio() {
  let muted = false;
  const none = () => {};
  return {
    wake: none,
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
    setVolume: none,
    rolling: none, rev: none, land: none,
    smash: none, bonk: none, hurt: none,
    pick: none, tape: none, lighter: none, pass: none, record: none,
    gate: none, locked: none, panel: none, slam: none, zap: none, fall: none, burst: none, bumper: none,
    encore: none, clear: none, over: none, descend: none, hype: none,
    startMusic: none, stopMusic: none,
    /** Where the music is, in beats from the downbeat; null if there isn't any. */
    beat() { return null; },
  };
}
