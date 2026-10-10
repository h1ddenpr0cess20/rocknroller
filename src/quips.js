/**
 * What Rock says. Not much, and flatly: he is several tons of granite, and
 * this is all a bit much. A line is picked for what just happened; the foes
 * have a line of their own, said the first time one is smashed.
 */

export const QUIPS = Object.freeze({
  smash: ['Noted.', 'Excuse me.', 'He\'ll be fine.', 'Was that someone?', 'Mm.', 'Rolling through.', 'I did say I was coming through.', 'Sorry. No I\'m not.'],
  crit: ['That was a lot of person.', 'Rock accepts the applause.', 'Oops. Anyway.', 'That one had it coming. They all do.'],
  bonk: ['Ow. For a rock, I felt that.', 'Firm.', 'I need a run-up.', 'That was a person. Dense.'],
  tap: ['That\'s just bumping into someone.', 'Speed, Rock. Speed.', 'Walking into people. Great plan.'],
  fell: ['Gravity still works.', 'Down. As is tradition.', 'I\'m a rock. This is what I do.', 'Falling. Again.'],
  zapped: ['I did not need that.', 'Mm. Tingly.', 'Rocks conduct. Who knew.'],
  crushed: ['That was a speaker. I was in its way.', 'Squashed. By a speaker. Louder than I\'d like.'],
  burnt: ['Warm.', 'Medium rare.', 'That was pyro. They\'ve got a lot of it.'],
  thud: ['Hard landing.', 'Ouch. Ground.'],
  tape: ['Gaff tape fixes everything.', 'Patched.', 'Silver tape. Holds a rock together. Mostly.'],
  lighter: ['Somebody\'s holding up a lighter. Touching.', 'An encore. In case of me.'],
  pass: ['All access. I was already everywhere.', 'A pass. Fine. I\'ll use it.'],
  locked: ['STAFF ONLY. I\'m a rock. I\'m staff.', 'It\'s locked. I need the pass.'],
  sturdy: ['It\'s solid. I need more speed.', 'That wall is holding. For now.'],
  broke: ['It was a wall. Was.', 'There was a room behind that.', 'Nobody told me that was cardboard.'],
  record: ['A gold record. It\'s round. I like it.', 'Gold. Shiny. Round. Like me.', 'Platinum would be better. This will do.'],
  encore: ['...Fine. One more.', 'The crowd wants an encore. Do I have a choice?', 'Back up. I\'m a professional.'],
  combo: ['Now we\'re playing.', 'That\'s a lot of people at once.', 'Combo. Is that what this is.'],
  rev: ['RRRR.'],
  clear: ['That was a gig.', 'Next.', 'Good show. Nobody asked me.'],
  shattered: ['I\'ve been better.', 'In pieces. As expected.', 'Well. That\'s that.'],
  bumper: ['Boing.', 'Pinball. Of course.'],
  ready: ['Okay.', 'Let\'s go.', 'Let\'s get this over with.'],
});

/** A line for `kind`, picked by `random` (a function giving 0 to 1). */
export function say(kind, random = Math.random) {
  const lines = QUIPS[kind];
  if (!lines?.length) return '';
  return lines[Math.floor(random() * lines.length) % lines.length];
}
