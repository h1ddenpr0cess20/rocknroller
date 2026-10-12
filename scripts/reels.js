/**
 * The reels scripts/reel.js makes. Each is a soundtrack (a theme from
 * music.js, at a tempo, from a bar of the song), a line to open on, and clips
 * cut on its bar lines: from a venue (they count from 0), so many bars long,
 * the best stretch of it the autopilot played, by `want` (anything worth
 * seeing, or the boss). Every one ends on the card with the address.
 *
 * Bar 40 of a song is the solo, then the last chorus, the riff up an octave;
 * twelve bars on, it comes round to the top, and the card goes up on the
 * downbeat.
 */

export const REELS = {
  tour: {
    hook: ["You're a boulder on tour", 'ten venues · garage to stadium'],
    music: { theme: 'stadium', tempo: 128, bar: 40 },
    // Six of the ten, the best each has to show, in tour order; the Stadium to finish.
    clips: { from: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], take: 6, keep: [9], bars: 2, want: 'action' },
  },
  bosses: {
    hook: ['Three bosses. No brakes.', 'the promoter · the maestro · the headliner'],
    music: { theme: 'arena', tempo: 120, bar: 40 },
    clips: [
      { venue: 3, bars: 4, want: 'boss' },
      { venue: 6, bars: 4, want: 'boss' },
      { venue: 9, bars: 4, want: 'boss' },
    ],
  },
  club: {
    hook: ['A boulder walks into a club', 'velvet rope · dance floor · the promoter'],
    music: { theme: 'club', tempo: 126, bar: 40 },
    // Three stretches of one night, in the order they happened.
    clips: { venue: 3, count: 3, bars: 4, want: 'action' },
  },
};

/** How long the card to end on stays up, in seconds. */
export const CARD = 4.6;

/** How long the opening line stays up, and when the address comes in under the HUD. */
export const HOOK = 2.4;
export const PILL = 2.7;
