/**
 * The screen, on the madness engine's stage (`madness-engine/stage`):
 * WebGPU where the browser has it and WebGL 2 where it does not, physically
 * based shading and shadows, and a perspective camera that starts at the
 * isometric corner and can be turned, tilted and zoomed round Rock
 * (`views/arcade`).
 *
 * The lighting is for a night out: a dim wash that takes its colour from
 * the venue; a weak key light from high up for the shadows; a lantern over
 * Rock; and the real, coloured, flashing lights of the rig's fixtures
 * nearest him (`lightshow` drives those; they are lights the stage owns, a
 * fixed number, so no shader ever has to change). Every other fixture is
 * baked into the floor (`venue.js`). Each venue's light, its sky and what
 * the chrome and clearcoat reflect are its mood (`moods.js`).
 */

import { createStage as createScreen } from 'madness-engine/stage';
import { createView } from 'madness-engine/views/arcade';

import { MOODS } from './moods.js';

/** How far back the camera sits at zoom 1, and its lens. */
export const LENS = Object.freeze({ distance: 10, fov: 36 });

/** How many of the light show's fixtures get a real light at once. The count is fixed. */
export const FIXTURE_LIGHTS = 5;

/** The light before any venue is dressed: a dim blue wash and a weak, cool key; no fill. */
export const LIGHTS = Object.freeze({
  hemisphere: { sky: '#8a96c0', ground: '#1a1210', intensity: 0.55 },
  key: { color: '#c8d2ff', intensity: 0.9 },
  fill: null,
});

/** @param ui  what is shot on the same film as the picture, where a venue's film says so */
export async function createStage(host, { ui = [] } = {}) {
  const stage = await createScreen(host, {
    lens: LENS,
    view: createView(),
    backdrop: '#050407',
    lights: LIGHTS,
    fixtures: FIXTURE_LIGHTS,
    ui,
    label: 'rocknroller',
  });
  let lanternHeight = 0;

  Object.assign(stage, {
    /** Where Rock is, for the lantern; set every frame. */
    rock: new stage.GFX.Vector3(),
    time: 0,
    /** How much extra light the strobes are throwing right now, 0 to 1: the page can flash with it. */
    flash: 0,

    /** Dresses the stage for venue `index` in its mood: its light, its sky, what its chrome reflects and its film. */
    setVenue(index) {
      const mood = MOODS[index];
      stage.setMood(mood);
      lanternHeight = mood.light.lantern?.height ?? 0;
      return mood;
    },
  });

  /** The camera and the lights, as the engine points them, and the lantern hung over Rock rather than the camera's target. */
  const look = stage.look;
  stage.look = () => {
    look();
    stage.lantern?.position.set(stage.rock.x, stage.rock.y + lanternHeight, stage.rock.z);
  };
  return stage;
}
