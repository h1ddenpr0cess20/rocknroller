import arena from 'madness-engine/moods/arena';
import club from 'madness-engine/moods/club';
import dive from 'madness-engine/moods/dive';
import dock from 'madness-engine/moods/dock';
import festival from 'madness-engine/moods/festival';
import garage from 'madness-engine/moods/garage';
import opera from 'madness-engine/moods/opera';
import rehearsal from 'madness-engine/moods/rehearsal';
import stadium from 'madness-engine/moods/stadium';
import studio from 'madness-engine/moods/studio';

/**
 * Each venue's mood, in the order of the tour (`venues/index.js`): its
 * light, its sky and reflections, the film it is shot on, its weather and
 * its band. The moods are the engine's, made from the venues' looks.
 */
export const MOODS = [garage, rehearsal, dive, club, dock, studio, opera, festival, arena, stadium];
