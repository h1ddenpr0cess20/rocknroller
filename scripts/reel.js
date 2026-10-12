/**
 * Gameplay reels for social media: upright films, 1080 by 1920 at 30 frames
 * a second, of the game as a phone shows it (the touch HUD, the REV button,
 * a thumb on the glass steering), played by the autopilot, with its own music
 * and sound, ending on a card with the address. The reels are in
 * scripts/reels.js.
 *
 *   node scripts/reel.js               every reel, into reels/
 *   node scripts/reel.js tour club     just those
 *   --out <dir>                        somewhere else
 *   --frames <n>                       only the first n frames, for a look
 *
 * Each venue is first played through without being drawn, to find where the
 * smashes, records and boss fights are; then each reel is filmed from those
 * moments, a frame at a time (reel.html, src/reel/recorder.js), so it needs
 * no GPU, only time: a few minutes of it per reel. It needs ffmpeg, and a
 * Chromium for playwright-core (`npx playwright-core install
 * chromium-headless-shell` if there isn't one).
 */

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { CARD, HOOK, PILL, REELS } from './reels.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 30;
/** An upright phone: 405 by 720, at a pixel ratio that makes the picture 1080 by 1920. */
const PHONE = { viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3, isMobile: true, hasTouch: true };
/** WebGL on the CPU, as there may be no GPU. */
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const args = process.argv.slice(2);
let out = 'reels', most = Infinity;
const names = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') out = args[++i];
  else if (args[i] === '--frames') most = Number(args[++i]);
  else names.push(args[i]);
}
const OUT = resolve(ROOT, out);
for (const n of names) if (!REELS[n]) throw new Error(`no reel called ${n}: there are ${Object.keys(REELS).join(', ')}`);

// ——— what is worth filming.

/** What each thing that happens is worth to a reel. */
const WORTH = {
  hit: (e) => (e.boss ? (e.down ? 70 : 14) : e.down ? (e.grade === 'crit' ? 28 : 16) + 6 * (e.multiplier - 1) : e.grade === 'bonk' ? 3 : 1),
  pick: (e) => ({ record: 18, case: 10, pass: 8, lighter: 6, tape: 4 })[e.kind] ?? 2,
  panel: () => 16,
  prop: () => 6,
  bumper: () => 5,
  gate: () => 6,
  encore: () => 20,
  outcome: (e) => ({ exit: 14, fell: 6, zapped: 8, crushed: 8 })[e.how] ?? 0,
  hurt: () => 5,
  slam: () => 2,
  burst: () => 2.5,
  stomp: () => 8,
};

/**
 * How good `len` seconds of a venue's run are from `s` on its clock: what
 * happens in them (the boss, mostly, if that is what is `want`ed), and Rock
 * rolling rather than waiting about. Nothing that runs past the review
 * screen coming up.
 */
function score(run, s, len, want) {
  const end = s + len;
  const exit = run.events.find((e) => e.type === 'outcome' && e.how === 'exit')?.t ?? Infinity;
  if (end > exit + 1.6 || end > run.track.at(-1)[0]) return -Infinity;
  let total = 0;
  for (const e of run.events) {
    if (e.t < s + 0.2 || e.t > end - 0.35) continue;
    const w = WORTH[e.type]?.(e) ?? 0;
    total += want === 'boss' && !e.boss && e.type !== 'stomp' ? w * 0.15 : w;
  }
  let n = 0, speed = 0, idle = 0, off = 0;
  for (const [t, v, , play] of run.track) {
    if (t < s || t >= end) continue;
    n++;
    speed += v;
    if (v < 0.6) idle++;
    if (!play && t < exit) off++;
  }
  if (!n) return -Infinity;
  return total + (speed / n) * 2 - (idle / FPS) * 5 - (off / FPS) * 6;
}

/** The best stretch of `run`, `len` seconds, starting on a downbeat of its venue's band and clear of `taken`. */
function best(run, len, want, taken = []) {
  const bar = 240 / run.tempo;
  let top = null;
  for (let s = bar; s + len <= run.track.at(-1)[0]; s += bar) {
    if (taken.some(([a, b]) => s < b && s + len > a)) continue;
    const v = score(run, s, len, want);
    if (v > -Infinity && (!top || v > top.score)) top = { s, score: v };
  }
  return top;
}

// ——— the browser.

const server = await createServer({ root: ROOT, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: FLAGS });

async function phone() {
  const page = await browser.newPage(PHONE);
  page.on('pageerror', (e) => console.error('  page:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('  page:', m.text()); });
  await page.goto(new URL('reel.html', base).href);
  await page.waitForFunction(() => globalThis.recorder?.scout, null, { timeout: 600_000 });
  return page;
}

const runs = new Map();
let scoutPage = null;
/** Venue `index` played through, undrawn: what happened, and when. */
async function run(index) {
  if (!runs.has(index)) {
    scoutPage ??= await phone();
    const r = await scoutPage.evaluate((i) => globalThis.recorder.scout(i), index);
    if (r.end !== 'clear') console.warn(`  ${r.name}: the autopilot didn't get to the stage door (${r.end}, ${JSON.stringify(r.stuck)})`);
    runs.set(index, r);
  }
  return runs.get(index);
}

// ——— choosing the clips.

/** The clips of `reel`, each with the stretch of its venue it shows: `s`, on that venue's clock, a downbeat. */
async function choose(reel) {
  const bar = 240 / reel.music.tempo;
  const c = reel.clips;
  if (Array.isArray(c)) {
    const out = [];
    for (const clip of c) out.push({ ...clip, s: best(await run(clip.venue), clip.bars * bar, clip.want).s });
    return out;
  }
  if (c.from) {
    const each = [];
    for (const venue of c.from) {
      const top = best(await run(venue), c.bars * bar, c.want);
      if (top) each.push({ venue, bars: c.bars, want: c.want, s: top.s, score: top.score });
    }
    const keep = each.filter((x) => c.keep?.includes(x.venue));
    const rest = each.filter((x) => !keep.includes(x)).sort((a, b) => b.score - a.score).slice(0, c.take - keep.length);
    return [...rest, ...keep].sort((a, b) => a.venue - b.venue);
  }
  // Several stretches of one venue, the best that don't overlap, in the order they happened.
  const r = await run(c.venue);
  const taken = [], out = [];
  for (let i = 0; i < c.count; i++) {
    const top = best(r, c.bars * bar, c.want, taken);
    if (!top) break;
    taken.push([top.s - 1, top.s + c.bars * bar + 1]);
    out.push({ venue: c.venue, bars: c.bars, want: c.want, s: top.s });
  }
  return out.sort((a, b) => a.s - b.s);
}

// ——— filming.

/** Runs `cmd` with `argv`; resolves when it exits cleanly. */
function run$(cmd, argv, { input = false } = {}) {
  const child = spawn(cmd, argv, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
  let err = '';
  child.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
  const done = new Promise((ok, fail) => child.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} failed (${code}):\n${err}`)))));
  return { child, done };
}

const write = (stream, data) => new Promise((ok) => (stream.write(data) ? ok() : stream.once('drain', ok)));

async function film(name, reel) {
  const bar = 240 / reel.music.tempo;
  console.log(`${name}: choosing the clips`);
  const clips = await choose(reel);
  const bars = clips.reduce((n, c) => n + c.bars, 0);
  const page = await phone();
  const { first } = await page.evaluate((o) => globalThis.recorder.start(o), { seconds: 0.25 + bars * bar + CARD, music: reel.music });

  // Where each clip starts and ends on the film: on the soundtrack's bar lines, the first from the very start.
  let at = first;
  const lines = [];
  for (const c of clips) { lines.push(at); at += c.bars * bar; }
  const cardAt = Math.round(at * FPS);
  const total = Math.min(most, cardAt + Math.round(CARD * FPS));
  clips.forEach((c, i) => {
    c.from = i === 0 ? 0 : Math.round(lines[i] * FPS);
    c.to = i + 1 < clips.length ? Math.round(lines[i + 1] * FPS) : cardAt;
    // On the venue's clock, the stretch starts with the bar line where the cut is.
    c.at = c.s + (c.from / FPS - lines[i]);
  });
  for (const c of clips) {
    const r = runs.get(c.venue);
    console.log(`  ${r.name}, ${c.at.toFixed(1)}s in, ${c.bars} bars`);
  }

  mkdirSync(OUT, { recursive: true });
  const work = join(OUT, `.${name}`);
  mkdirSync(work, { recursive: true });
  const silent = join(work, 'picture.mp4');
  const sound = join(work, 'sound.wav');
  const video = run$('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '7M', '-bufsize', '14M', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', String(FPS * 2), silent], { input: true });

  const began = Date.now();
  let frame = 0;
  for (const c of clips) {
    if (frame >= total) break;
    const cut = await page.evaluate((o) => globalThis.recorder.cut(o), { venue: c.venue, at: c.at });
    // The film has to be the run that was scouted: the same place at the same moment.
    const then = runs.get(c.venue).track.find(([t]) => Math.abs(t - cut.time) < 6e-4);
    if (!then || Math.hypot(then[4] - cut.ball[0], then[5] - cut.ball[1]) > 1e-3) console.warn(`  ${runs.get(c.venue).name}: not where the scouting run was at ${cut.time.toFixed(2)}s`);
    if (cut.state !== 'play') console.warn(`  ${runs.get(c.venue).name}: cut in while ${cut.state}`);
    const end = Math.min(total, c === clips.at(-1) ? total : c.to);
    for (; frame < end; frame++) {
      const say = [];
      if (frame === 0) say.push(['hook', ...reel.hook]);
      if (frame === Math.round(HOOK * FPS)) say.push(['hook', null]);
      if (frame === Math.round(PILL * FPS)) say.push(['pill', true]);
      if (frame === cardAt) say.push(['card', true]);
      await page.evaluate(async (said) => {
        for (const [what, ...how] of said) globalThis.recorder[what](...how);
        return globalThis.recorder.frame();
      }, say);
      const shot = await page.screenshot({ type: 'jpeg', quality: 95 });
      await write(video.child.stdin, shot);
      if (frame === Math.round((HOOK - 0.5) * FPS)) writeFileSync(join(OUT, `${name}.jpg`), shot);
      if ((frame + 1) % 60 === 0) {
        const each = (Date.now() - began) / (frame + 1) / 1000;
        console.log(`  ${frame + 1}/${total} frames, ${each.toFixed(2)}s a frame, ${Math.ceil(((total - frame - 1) * each) / 60)} min to go`);
      }
    }
  }
  writeFileSync(sound, Buffer.from(await page.evaluate(() => globalThis.recorder.finish()), 'base64'));
  video.child.stdin.end();
  await video.done;
  await page.close();

  // The sound under the picture: as loud as the apps play things, and faded out under the card.
  const seconds = total / FPS;
  await run$('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', sound,
    '-filter_complex', `[1:a]atrim=0:${seconds},afade=t=out:st=${(seconds - 1.6).toFixed(3)}:d=1.6,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest',
    join(OUT, `${name}.mp4`)]).done;
  rmSync(work, { recursive: true, force: true });
  console.log(`${name}: ${join(OUT, `${name}.mp4`)}, ${seconds.toFixed(1)}s, in ${((Date.now() - began) / 60000).toFixed(1)} min`);
}

try {
  for (const name of names.length ? names : Object.keys(REELS)) await film(name, REELS[name]);
} finally {
  await browser.close();
  await server.close();
}
