import { Venue as Base } from 'madness-engine/venue/venue';

export * from 'madness-engine/venue/venue';

/** The club's venue: the engine's, with this game's names for what lies about in it. */
export class Venue extends Base {
  /** A pile of guitar picks, to roll over: they are the hype. */
  pick(x, z, amount = 10) {
    return this.pickup('pick', x, z, amount);
  }

  /** A road case, packed with picks. */
  road(x, z, amount = 60) {
    return this.pickup('case', x, z, amount);
  }

  /** A roll of gaff tape: holds Rock together. */
  tape(x, z, amount = 25) {
    return this.pickup('tape', x, z, amount);
  }

  /** A lighter, held up: when Rock is done for, the crowd calls for an encore and he gets up. */
  lighter(x, z) {
    return this.pickup('lighter', x, z, 1);
  }

  /** An all-access pass, for the gates. */
  pass(x, z) {
    return this.pickup('pass', x, z, 1);
  }

  /** A gold record: three hide in every venue. */
  record(x, z) {
    return this.pickup('record', x, z, 100);
  }

  /** The engine's name for it is `drop`. */
  speaker(...args) {
    return this.drop(...args);
  }
}
