import { CAST } from './models/cast/index.js';
import { isBaked, ready } from './models/library.js';
import { createModel } from 'madness-engine/models/model';

/**
 * Who is in the way: the annoying people you find at a gig. Each has how it
 * gets about — `walk` (pushed over the floor as Rock is, and after him when he
 * comes near), `crawl` (round a set loop on the floor) or `fly` (round a set
 * loop above the crowd's heads, over gaps and all) — and how it takes being
 * rolled over:
 *
 *   `toughness`  the speed (tiles a second) Rock has to hit it at to smash it
 *                in one go. Slower and it only gets knocked about: it takes
 *                that much of its `hp` and Rock takes some of its `power`.
 *   `power`      how much it hurts to bounce off it.
 *   `hype`       what smashing it is worth.
 *   `hp`         (a boss) how much it takes in all.
 *   `tactic`     (a boss) what it does besides come at Rock: `lunge` (every
 *                so often a sudden rush), `tempo` (it moves on the beat:
 *                still, then a surge) or `stomp` (it stops, stamps, and the
 *                floor throws Rock back).
 *
 * How each one looks is its model (models/cast/): sculpted in code, baked in
 * the background as the page loads.
 */

export const FOES = Object.freeze({
  // The people.
  brother: { name: 'Little Brother', blurb: 'Has a recorder. Knows two notes.', move: 'walk', toughness: 3, power: 3, hype: 30, radius: 0.29, speed: 4.6 },
  neighbour: { name: 'Angry Neighbour', blurb: 'Called about the noise. Brought a broom.', move: 'walk', toughness: 5, power: 5, hype: 60, radius: 0.37, speed: 3.4 },
  phone: { name: 'Phone Guy', blurb: 'Is filming all of this. For later. He will not watch it.', move: 'walk', toughness: 4, power: 4, hype: 50, radius: 0.37, speed: 2.2, flash: true },
  freebird: { name: 'Freebird Guy', blurb: 'It was funny the first time. It is the first time.', move: 'walk', toughness: 5, power: 5, hype: 60, radius: 0.37, speed: 2.6, shout: 'FREEBIRD!' },
  drunk: { name: 'Drunk Guy', blurb: 'Loves you, man. Loves everyone, man.', move: 'walk', toughness: 4, power: 4, hype: 50, radius: 0.37, speed: 2.0, wobble: 1 },
  mosher: { name: 'Mosher', blurb: 'There is no pit. He brought one.', move: 'walk', toughness: 5, power: 6, hype: 70, radius: 0.39, speed: 4.4 },
  scalper: { name: 'Scalper', blurb: 'Tickets. Tickets. Why are you a boulder.', move: 'walk', toughness: 5, power: 5, hype: 70, radius: 0.37, speed: 4.0 },
  hipster: { name: 'Hipster', blurb: 'Liked this venue before it was cool. It was never cool.', move: 'walk', toughness: 5, power: 5, hype: 60, radius: 0.37, speed: 3.0 },
  roadie: { name: 'Roadie', blurb: 'Has seen worse. Has taped worse.', move: 'walk', toughness: 6, power: 6, hype: 80, radius: 0.39, speed: 3.2 },
  merch: { name: 'Merch Guy', blurb: 'Shirts are forty dollars. Rock is a rock.', move: 'walk', toughness: 5, power: 5, hype: 60, radius: 0.39, speed: 3.0 },
  influencer: { name: 'Influencer', blurb: 'Is not here for the music. Is here for the light.', move: 'walk', toughness: 4, power: 4, hype: 60, radius: 0.34, speed: 3.6, flash: true },
  metalhead: { name: 'Metalhead', blurb: 'Headbangs. Does not stop. Cannot stop.', move: 'walk', toughness: 7, power: 8, hype: 100, radius: 0.41, speed: 3.0 },
  usher: { name: 'Usher', blurb: 'Not in the aisle, sir. Not in the aisle.', move: 'walk', toughness: 5, power: 5, hype: 60, radius: 0.37, speed: 3.4 },
  critic: { name: 'Critic', blurb: 'Has notes. Has opinions. Has one star for you.', move: 'walk', toughness: 6, power: 7, hype: 90, radius: 0.37, speed: 3.0, shout: '★☆☆☆☆' },
  suit: { name: 'A&R Suit', blurb: 'Loves the sound. Wants it more commercial.', move: 'walk', toughness: 6, power: 6, hype: 80, radius: 0.37, speed: 3.2 },
  hippie: { name: 'Drum Circle', blurb: 'There is no leader. He is the leader.', move: 'walk', toughness: 4, power: 4, hype: 50, radius: 0.39, speed: 1.8 },
  security: { name: 'Security', blurb: 'Has a radio. Is using the radio.', move: 'walk', toughness: 9, power: 9, hype: 140, radius: 0.49, speed: 2.8 },
  bouncer: { name: 'Bouncer', blurb: 'Arms crossed. Opinion: no.', move: 'walk', toughness: 10, power: 11, hype: 160, radius: 0.51, speed: 2.6 },
  mascot: { name: 'Mascot', blurb: 'Soft, huge, and absolutely will not stop hugging.', move: 'walk', toughness: 9, power: 3, hype: 150, radius: 0.61, speed: 2.4 },
  diver: { name: 'Stage Diver', blurb: 'Trusts the crowd. The crowd does not trust him.', move: 'fly', toughness: 4, power: 4, hype: 70, radius: 0.37, speed: 2.6 },
  // Not people, but they are at every gig.
  drone: { name: 'Camera Drone', blurb: 'Getting the crowd shot. You are now the crowd shot.', move: 'fly', toughness: 5, power: 5, hype: 80, radius: 0.39, speed: 2.4 },
  drum: { name: 'Runaway Drum', blurb: 'Nobody is playing it. It is playing itself.', move: 'crawl', toughness: 5, power: 6, hype: 70, radius: 0.49, speed: 1.6 },
  poolball: { name: '8-Ball', blurb: 'Rolled off the table. Has a grudge.', move: 'walk', toughness: 7, power: 7, hype: 90, radius: 0.49, speed: 2.6 },
  // The ones who run the night.
  promoter: { name: 'The Promoter', blurb: 'Takes sixty percent. Lunges for the other forty.', move: 'walk', toughness: 9, power: 9, hype: 600, radius: 0.85, speed: 1.6, boss: true, hp: 50, tactic: 'lunge' },
  maestro: { name: 'The Maestro', blurb: 'Conducts everything, including you. Moves only on the beat.', move: 'walk', toughness: 9, power: 10, hype: 800, radius: 0.85, speed: 1.8, boss: true, hp: 56, tactic: 'tempo' },
  headliner: { name: 'The Headliner', blurb: 'Has a flying V, platform boots and no idea who you are. Stamps.', move: 'walk', toughness: 10, power: 12, hype: 1500, radius: 1.04, speed: 1.6, boss: true, hp: 70, tactic: 'stomp' },
});

/** How high a flyer goes over the floor where its loop starts: over the crowd's heads. */
export const FLIGHT = 0.8;

/** How finely the foes on the board are meshed: half the grid of a close-up. */
export const BOARD_DETAIL = 0.5;

/** How long an attack plays through, and how long a beaten foe takes to go (see `launch`) before it is gone. */
export const STRIKE = 0.9;
export const KNOCKED_OUT = 1.35;

/**
 * A foe to look at, standing on (0, 0, 0) and facing +z (a flyer's (0, 0, 0)
 * is its middle). `animate(t, moving, how)` makes it live; `body` is the part
 * that turns to face the way it goes.
 *
 * `how`: `chasing` (it hurries), `striking` (Rock is in its reach: it
 * attacks, an attack at a time) and `down` (it is beaten).
 *
 * Each is sculpted (`models/cast/`, baked in the background as the page
 * loads, and there once its bake is in). Until then — and under node, where
 * nothing bakes — a plain stand-in goes in its place.
 */
export function createFoeMesh(GFX, kind) {
  const group = new GFX.Group();
  group.name = kind;
  const body = new GFX.Group();
  group.add(body);
  let model = null;
  const attach = () => {
    model = createModel(GFX, CAST[kind], { detail: BOARD_DETAIL });
    body.add(model.group);
    if (stand) body.remove(stand);
  };
  const stand = CAST[kind] ? null : standIn(GFX, kind);
  if (stand) body.add(stand);
  if (CAST[kind]) {
    if (isBaked(kind, BOARD_DETAIL)) attach();
    else if (typeof window !== 'undefined') ready(kind, BOARD_DETAIL).then(attach);
  }
  const choose = clips();
  return {
    group,
    body,
    animate(t, moving, { chasing = false, ...how } = {}) {
      if (!model) return;
      model.pose({ ...choose(t, moving, how), time: t, speed: chasing ? 1 : 0.6 });
    },
  };
}

/** Which clip it plays, and how far in: down once beaten, an attack when Rock is in reach, else walking or idle. */
function clips() {
  let clip = 'idle', since = 0;
  return (t, moving, { striking = false, down = false } = {}) => {
    let next = down ? 'ko' : striking ? 'attack' : moving ? 'walk' : 'idle';
    // An attack plays through before it does anything else, and then another, if Rock is still there.
    if (clip === 'attack' && !down && t - since < STRIKE) next = 'attack';
    else if (clip === 'attack' && next === 'attack') since = t;
    if (next !== clip) { clip = next; since = t; }
    return { clip, t: t - since };
  };
}

const STAND_IN = {
  walk: '#c8a070', fly: '#9aa8ff', crawl: '#c0605a',
};

/** A plain figure for a foe with no model (yet): a capsule and a head, in a colour by how it gets about. */
function standIn(GFX, kind) {
  const f = FOES[kind];
  const group = new GFX.Group();
  const material = new GFX.MeshStandardMaterial({ name: `standin-${kind}`, color: new GFX.Color(STAND_IN[f.move]), roughness: 0.7 });
  const h = f.radius * 2.4;
  const torso = new GFX.Mesh(new GFX.CylinderGeometry(f.radius * 0.8, f.radius * 0.9, h * 0.7, 12), material);
  torso.position.y = h * 0.35;
  const head = new GFX.Mesh(new GFX.SphereGeometry(f.radius * 0.7, 12, 8), material);
  head.position.y = h * 0.85;
  torso.castShadow = head.castShadow = true;
  group.add(torso, head);
  return group;
}
