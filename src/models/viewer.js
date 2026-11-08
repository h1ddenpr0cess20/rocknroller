/**
 * A turntable for the models (models.html), on the engine's: one or a row of
 * them, to look at while sculpting. Not part of the game.
 * ?m=rat,orc&clip=walk&yaw=0.6&pitch=0.3&dist=1.4&time=0
 */
import { startViewer } from 'madness-engine/models/viewer';
import { CAST } from './cast/index.js';
import { PROPS } from './props/index.js';

await startViewer({ definitions: [CAST, PROPS] });
