import { CAST } from './models/cast/index.js';
import { isBaked, ready } from './models/library.js';
import { createFoeMeshes } from 'madness-engine/venue/foemesh';

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
  crossingguard: { name: 'Crossing Guard', blurb: 'Stop means stop. Rock waits. Everybody waits.', move: 'walk', toughness: 4, power: 4, hype: 45, radius: 0.37, speed: 3.0 },
  mailcarrier: { name: 'Mail Carrier', blurb: 'Neither rain nor snow nor a rolling boulder.', move: 'walk', toughness: 4, power: 4, hype: 45, radius: 0.37, speed: 3.8 },
  oldtimer: { name: 'Old-Timer', blurb: 'Saw Elvis. Was not impressed. Is not impressed now.', move: 'walk', toughness: 4, power: 3, hype: 40, radius: 0.37, speed: 2.2 },
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

export { BOARD_DETAIL, FLIGHT, KNOCKED_OUT, STRIKE } from 'madness-engine/venue/foemesh';

/** A foe to look at: the engine's mesh, with this game's roster and cast. */
export const { createFoeMesh } = createFoeMeshes({ foes: FOES, cast: CAST, isBaked, ready });
