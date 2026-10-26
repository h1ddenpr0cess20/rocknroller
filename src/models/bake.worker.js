import { serveBakes } from 'madness-engine/models/bake';
import { CAST } from './cast/index.js';
import { PROPS } from './props/index.js';

/** Bakes models off the main thread, for `library.js`. */
serveBakes({ ...CAST, ...PROPS });
