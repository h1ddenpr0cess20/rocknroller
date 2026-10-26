import { createBakeLibrary } from 'madness-engine/models/bake';
import { CAST } from './cast/index.js';
import { PROPS } from './props/index.js';

/** Everything sculpted, by name: the creatures and the props. */
export const SCULPTED = { ...CAST, ...PROPS };

/**
 * The models, baked in the background as the page starts (the engine's
 * `createBakeLibrary`): a few workers share out the work, and each mesh is
 * handed over as it is done. Until then whoever wants one waits (`ready`)
 * or carries on without it. By default the props are baked first (small,
 * and everywhere) and then the creatures, at the detail the board wants.
 */
export const { isBaked, readyAll, ready, preload } = createBakeLibrary({
  sculpted: SCULPTED,
  spawn: () => new Worker(new URL('./bake.worker.js', import.meta.url), { type: 'module' }),
  jobs: () => [...Object.keys(PROPS).map((n) => [n, 1]), ...Object.keys(CAST).map((n) => [n, 0.5])],
  label: 'rocknroller',
});
