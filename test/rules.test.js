import assert from 'node:assert/strict';
import { test } from 'node:test';

import { COMBO_WINDOW, comboAt, createHype, earn, MAX_MULTIPLIER, smashed, windowLeft } from '../src/hype.js';
import { createIntegrity, cracked, encore, heal, hurt, shattered } from '../src/integrity.js';
import { goals, RECORDS, stars } from '../src/rating.js';
import { closingSpeed, CRIT, resolveImpact } from '../src/smash.js';
import { createStorage } from '../src/storage.js';
import { FOES } from '../src/foes.js';

const foe = (kind) => FOES[kind];

test('a hit is graded by how fast it was: tap, bonk, smash, crit', () => {
  const bouncer = foe('bouncer');
  assert.equal(resolveImpact({ speed: 0.5, foe: bouncer }).grade, 'tap');
  assert.equal(resolveImpact({ speed: bouncer.toughness * 0.6, foe: bouncer }).grade, 'bonk');
  assert.equal(resolveImpact({ speed: bouncer.toughness, foe: bouncer }).grade, 'smash');
  assert.equal(resolveImpact({ speed: Math.max(bouncer.toughness * CRIT.times, CRIT.least) + 1, foe: bouncer }).grade, 'crit');
});

test('a smash costs Rock nothing, a tap costs him the foe\'s whole power, and a bonk less the closer it was to a smash', () => {
  const neighbour = foe('neighbour');
  assert.equal(resolveImpact({ speed: neighbour.toughness, foe: neighbour }).damage, 0);
  assert.equal(resolveImpact({ speed: 0, foe: neighbour }).damage, neighbour.power);
  const slow = resolveImpact({ speed: neighbour.toughness * 0.55, foe: neighbour }).damage;
  const fast = resolveImpact({ speed: neighbour.toughness * 0.95, foe: neighbour }).damage;
  assert.ok(fast < slow && slow < neighbour.power);
});

test('a boss is worn down, and never goes down for nothing', () => {
  for (const kind of ['promoter', 'maestro', 'headliner']) {
    const boss = foe(kind);
    assert.ok(boss.hp > boss.toughness * 2, `${kind} has a lot of hp`);
    const smash = resolveImpact({ speed: boss.toughness + 1, foe: boss });
    assert.ok(smash.damage > 0, `${kind} costs Rock something even when smashed`);
    // It can be done: a smash fast enough, a handful of times, and Rock can afford it.
    const smashes = Math.ceil(boss.hp / smash.hits);
    assert.ok(smashes <= 8, `${kind} takes ${smashes} smashes`);
    assert.ok(smashes * smash.damage < 40, `${kind} costs ${smashes * smash.damage}`);
  }
});

test('the closing speed is along the line between them, and a drop onto someone counts too', () => {
  const rock = { x: 0, y: 1, z: 0, vx: 6, vy: 0, vz: 0, r: 0.45 };
  assert.equal(closingSpeed(rock, { x: 2, y: 0, z: 0 }), 6);
  assert.equal(closingSpeed(rock, { x: -2, y: 0, z: 0 }), 0);
  assert.equal(closingSpeed(rock, { x: 2, y: 0, z: 0 }, [-2, 0, 0]), 8);
  const falling = { x: 0, y: 3, z: 0, vx: 0, vy: -5, vz: 0, r: 0.45 };
  assert.ok(closingSpeed(falling, { x: 0, y: 0, z: 0.1, height: 0.5 }) > 3);
});

test('every foe can be smashed by a charge Rock can actually make', () => {
  for (const [kind, f] of Object.entries(FOES)) {
    assert.ok(f.toughness <= 12, `${kind} needs ${f.toughness}`);
    assert.ok(f.power > 0 && f.hype > 0 && f.radius > 0 && f.speed > 0, `${kind} has stats`);
  }
});

test('hype: smashes in a row build a combo that multiplies, up to the cap, and it drops after the window', () => {
  const hype = createHype();
  assert.equal(smashed(hype, 100, 0).gain, 100);
  assert.equal(smashed(hype, 100, 1).gain, 200);
  assert.equal(smashed(hype, 100, 2).multiplier, 3);
  for (let t = 3; t < 12; t++) smashed(hype, 100, t);
  assert.equal(comboAt(hype, 11.5), 12);
  assert.equal(smashed(hype, 100, 12).multiplier, MAX_MULTIPLIER);
  assert.equal(comboAt(hype, 12 + COMBO_WINDOW + 0.1), 0);
  assert.equal(smashed(hype, 100, 30).gain, 100);
  assert.ok(windowLeft(hype, 30.2) > 0.9 && windowLeft(hype, 40) === 0);
  assert.equal(earn(hype, 25), 25);
});

test('integrity: hurt, heal up to the best and no more, shatter, and an encore from a lighter', () => {
  const rock = createIntegrity();
  assert.equal(hurt(rock, 30), 30);
  assert.equal(rock.hp, 70);
  assert.equal(heal(rock, 25), 25);
  assert.equal(heal(rock, 25), 5);
  assert.equal(cracked(rock), 0);
  hurt(rock, 150);
  assert.ok(shattered(rock));
  assert.equal(encore(rock), false);
  rock.lighters = 1;
  assert.equal(encore(rock), true);
  assert.equal(rock.hp, 50);
  assert.equal(rock.lighters, 0);
  assert.equal(heal({ hp: 0, max: 100 }, 10), 0, 'no healing the dead');
});

test('stars: one for showing up, one for smashing three in four, one for the three records', () => {
  assert.equal(stars({ smashed: 0, foes: 12, records: 0 }), 1);
  assert.equal(stars({ smashed: 9, foes: 12, records: 0 }), 2);
  assert.equal(stars({ smashed: 8, foes: 12, records: RECORDS }), 2);
  assert.equal(stars({ smashed: 9, foes: 12, records: RECORDS }), 3);
  assert.equal(goals({ smashed: 0, foes: 0, records: 0 }).find((g) => g.id === 'crowd').met, true, 'nobody to smash is a pass');
});

function memory(initial = null) {
  const data = new Map(initial === null ? [] : [['rocknroller.v1', initial]]);
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), data };
}

test('storage: keeps the best of each venue and opens the next one', () => {
  const store = memory();
  const s = createStorage(store);
  s.cleared(0, { hype: 500, time: 90, records: 2, smashed: 5, stars: 2 });
  s.cleared(0, { hype: 400, time: 80, records: 3, smashed: 4, stars: 3 });
  assert.deepEqual(s.venue(0), { stars: 3, best: 500, time: 80, records: 3, smashed: 5 });
  assert.equal(s.load().reached, 1);
  assert.equal(s.totalStars(), 3);
  // And it was written, and reads back.
  const again = createStorage(store);
  assert.deepEqual(again.venue(0), s.venue(0));
  assert.equal(again.load().reached, 1);
});

test('storage: a missing, broken or hostile store changes nothing', () => {
  assert.equal(createStorage(null).load().reached, 0);
  assert.equal(createStorage(memory('{not json')).load().reached, 0);
  const hostile = createStorage(memory(JSON.stringify({ reached: 'x', venues: { 0: { stars: 'lots', best: 7 } }, settings: { music: 'loud', sfx: 0.2, evil: true } })));
  assert.equal(hostile.venue(0).stars, 0);
  assert.equal(hostile.venue(0).best, 7);
  assert.equal(hostile.load().settings.music, 0.8);
  assert.equal(hostile.load().settings.sfx, 0.2);
  assert.equal('evil' in hostile.load().settings, false);
  const throwing = createStorage({ getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } });
  assert.doesNotThrow(() => throwing.cleared(0, { hype: 1, time: 1, records: 0, smashed: 0, stars: 1 }));
});

test('storage: settings are remembered, and only the known ones', () => {
  const s = createStorage(memory());
  s.setting('flashing', false);
  s.setting('nonsense', 1);
  assert.equal(s.load().settings.flashing, false);
  assert.equal('nonsense' in s.load().settings, false);
});
