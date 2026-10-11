/**
 * The screen, on Alan's engine (`vendor/gfx`), as Madness has it: WebGPU where
 * the browser has it and WebGL 2 where it does not, physically based shading
 * and shadows, and a perspective camera that starts at the isometric corner
 * and can be turned, tilted and zoomed round Rock (`view.js`).
 *
 * The lighting is for a venue after dark: a dim wash that takes its colour
 * from the venue; a weak key light from high up for the shadows; a lantern
 * over Rock; and the real, coloured, flashing lights of the light show's
 * fixtures nearest him (`lightshow.js` drives those; they are lights this
 * stage owns, a fixed number, so no shader ever has to change). Every other
 * fixture is baked into the floor (`venue.js`). What the chrome and clearcoat
 * reflect is a room painted at startup in the venue's colours.
 */

import * as GFX from './vendor/gfx/index.js';
import { Renderer } from './vendor/gfx/renderer.js';
import { WebGLBackend } from './vendor/gfx/webgl.js';
import { WebGPUBackend } from './vendor/gfx/webgpu.js';
import { createView } from './view.js';

/** How far back the camera sits at zoom 1, and its lens. */
export const LENS = Object.freeze({ distance: 10, fov: 36 });

/** Where the key light comes from: high, behind the camera's left shoulder. */
const KEY = new GFX.Vector3(-0.3, 1, 0.6).normalize();

/** How many of the light show's fixtures get a real light at once. The count is fixed. */
export const FIXTURE_LIGHTS = 5;

export async function createRenderer(preference) {
  if (preference !== 'webgl' && typeof navigator !== 'undefined' && navigator.gpu) {
    const canvas = document.createElement('canvas');
    try {
      return new Renderer(await WebGPUBackend.create(canvas), canvas);
    } catch (err) {
      if (preference === 'webgpu') throw err;
      console.warn('rocknroller: WebGPU unavailable, falling back to WebGL 2.', err);
    }
  }
  const canvas = document.createElement('canvas');
  return new Renderer(new WebGLBackend(canvas), canvas);
}

/**
 * The room the reflections come from, as an equirectangular canvas: a dark
 * ceiling, the venue's colours in a ring of lights round the walls, and a
 * bright rig overhead. Only ever seen in reflections.
 */
export function paintRoom({ colors = ['#ff9a3a'], ceiling = '#2a2a38', width = 1024 } = {}) {
  const height = width / 2;
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const wall = ctx.createLinearGradient(0, 0, 0, height);
  wall.addColorStop(0, ceiling);
  wall.addColorStop(0.32, '#16161c');
  wall.addColorStop(0.55, '#0c0b0d');
  wall.addColorStop(1, '#040404');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, colour) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colour);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  glow(width * 0.25, height * 0.12, height * 0.2, 'rgba(210, 220, 255, 0.55)');
  for (let k = 0; k < 8; k++) glow(width * (0.06 + k * 0.125), height * (0.3 + (k % 2) * 0.1), height * 0.07, withAlpha(colors[k % colors.length], 0.75));
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** The dark round the venue: the colours it is given, top to bottom, and the glow of a crowd or a city if it has one. */
function paintBackdrop({ sky = ['#000000', '#050407', '#0d0708', '#1c0b07', '#2a0f06'], stars = false, width = 1024 } = {}) {
  const height = width / 2;
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  sky.forEach((colour, i) => g.addColorStop(i / (sky.length - 1), colour));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  if (stars) {
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let k = 0; k < 220; k++) {
      ctx.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.6})`;
      const r = rnd() * 1.4 + 0.3;
      ctx.fillRect(rnd() * width, rnd() * height * 0.5, r, r);
    }
  }
  return c;
}

export async function createStage(host) {
  const preference = new URLSearchParams(globalThis.location?.search ?? '').get('renderer');
  const renderer = await createRenderer(preference);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = GFX.PCFShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new GFX.Scene();
  const camera = new GFX.PerspectiveCamera(LENS.fov, 1, 0.3, 400);

  if (renderer.isWebGPU && preference !== 'webgpu') {
    renderer.backend.onLost = () => {
      const old = renderer.domElement;
      const canvas = document.createElement('canvas');
      try {
        renderer.setBackend(new WebGLBackend(canvas), canvas);
        old.replaceWith(canvas);
        console.warn('rocknroller: the GPU went away; carrying on with WebGL 2.');
      } catch (err) {
        console.error('rocknroller: the GPU went away and WebGL 2 is not available.', err);
      }
    };
  }

  const hemi = new GFX.HemisphereLight(0x8a96c0, 0x1a1210, 0.55);
  scene.add(hemi);
  const key = new GFX.DirectionalLight(0xc8d2ff, 0.9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.02;
  let span = 0;
  const shadowSpan = (zoom) => {
    const want = Math.ceil(14 * Math.max(1, zoom));
    if (want === span) return;
    span = want;
    Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 100 + span * 2 });
    key.shadow.camera.updateProjectionMatrix();
  };
  shadowSpan(1);
  scene.add(key, key.target);

  // Rock's own light, high over him and faint: enough to find him in the dark, not so much it lights up his own shadow.
  const lantern = new GFX.PointLight(0xffe2b8, 1.4, 12, 1.2);
  scene.add(lantern);
  // The fixtures nearest him: the light show sets where they are, what colour and how bright.
  const fixtureLights = Array.from({ length: FIXTURE_LIGHTS }, () => {
    const light = new GFX.PointLight(0xffffff, 0, 7, 1.7);
    scene.add(light);
    return light;
  });

  const backdropMaterial = new GFX.MeshBasicMaterial({ name: 'backdrop', color: new GFX.Color('#050407'), side: GFX.BackSide, depthWrite: false });
  const backdrop = new GFX.Mesh(new GFX.SphereGeometry(300, 64, 32), backdropMaterial);
  backdrop.renderOrder = -1;
  backdrop.frustumCulled = false;
  backdrop.onBeforeRender = (r, s, cam) => {
    backdrop.position.copy(cam.position);
    backdrop.updateMatrixWorld();
  };
  scene.add(backdrop);

  const pmrem = new GFX.PMREMGenerator(renderer);

  const stage = {
    GFX, renderer, scene, camera, key, hemi, lantern, fixtureLights,
    view: createView(),
    target: new GFX.Vector3(),
    /** Where Rock is, for the lantern; set every frame. */
    rock: new GFX.Vector3(),
    time: 0,
    /** How much extra light the strobes are throwing right now, 0 to 1: the page can flash with it. */
    flash: 0,
    /** How hard the camera is being shaken, in tiles; it dies away by itself. */
    shake: 0,

    /** Dresses the stage for a venue: its sky, its wash of light, the colours its chrome reflects. */
    setVenue(venue) {
      const look = venue.look ?? {};
      const palette = venue.palette ?? {};
      const sky = paintBackdrop({ sky: look.skyColors, stars: look.stars });
      if (sky) {
        const map = new GFX.CanvasTexture(sky);
        map.colorSpace = GFX.SRGBColorSpace;
        backdropMaterial.map = map;
        backdropMaterial.color.set('#ffffff');
        backdropMaterial.needsUpdate = true;
      }
      const [skyHex, groundHex, hemiK] = look.hemi ?? ['#8a96c0', '#1a1210', 0.55];
      hemi.color.set(skyHex);
      hemi.groundColor.set(groundHex);
      hemi.intensity = hemiK;
      key.color.set(look.key ?? '#c8d2ff');
      key.intensity = look.keyK ?? 0.9;
      lantern.color.set(look.lantern ?? '#ffe2b8');
      const room = paintRoom({ colors: look.reflect ?? [palette.lamp ?? '#ffa04a'], ceiling: look.ceiling });
      if (room) {
        const texture = new GFX.Texture(room);
        texture.mapping = GFX.EquirectangularReflectionMapping;
        texture.colorSpace = GFX.SRGBColorSpace;
        texture.needsUpdate = true;
        scene.environment = pmrem.fromEquirectangular(texture).texture;
      }
    },
  };

  const direction = new GFX.Vector3();

  /** Point the camera and the lights at `stage.target`, from where the view is; called every frame. */
  stage.look = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    camera.aspect = w / h;
    // An upright phone sees as much venue across as a wide screen does.
    camera.fov = LENS.fov * Math.max(1, Math.min(1.75, 0.8 * h / w));
    camera.updateProjectionMatrix();
    direction.set(...stage.view.direction());
    camera.position.copy(stage.target).addScaledVector(direction, LENS.distance * stage.view.zoom);
    shadowSpan(stage.view.zoom);
    if (stage.shake > 0.002) {
      camera.position.x += (Math.random() - 0.5) * stage.shake;
      camera.position.y += (Math.random() - 0.5) * stage.shake;
      camera.position.z += (Math.random() - 0.5) * stage.shake;
    }
    camera.lookAt(stage.target);
    camera.updateMatrixWorld();
    key.position.copy(stage.target).addScaledVector(KEY, 45 + span);
    key.target.position.copy(stage.target);
    key.target.updateMatrixWorld();
    lantern.position.set(stage.rock.x, stage.rock.y + 4, stage.rock.z);
  };

  const fit = () => renderer.setSize(host.clientWidth || 1, host.clientHeight || 1);
  fit();
  new ResizeObserver(fit).observe(host);

  stage.render = () => renderer.render(scene, camera);
  return stage;
}
