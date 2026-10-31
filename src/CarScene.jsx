import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { transferPercent } from './progress.js';
import { RESUME_AFTER_DRAG_MS, advanceRotation, getLighting, performanceProfile, rotationForDrag } from './studio.js';
import { TOUR_STOPS, getTourPose } from './tour.js';
import { HEM_ALPHA_TEST, createCarCover, disposeCarCover } from './CarCover.js';
import { createStudio } from './Studio.js';
import { advanceEstablish, blendPose, establishBlend, holdDrift, lightsUpLevel } from './establish.js';
import { revealState } from './shroud.js';

const MODELS = {
  full: { url: `${import.meta.env.BASE_URL}models/m4.glb`, bytes: 6_680_780 },
  lite: { url: `${import.meta.env.BASE_URL}models/m4-lite.glb`, bytes: 3_430_820 },
};
const TWO_PI = Math.PI * 2;
// The supplied M4's size, so the studio can stand before the model arrives.
// If a model of another size ever loads, the room is rebuilt around it.
const NOMINAL_CAR = { maximum: 4.86, floorY: -0.715 };

function makeShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(256, 256, 14, 256, 256, 256);
  gradient.addColorStop(0, 'rgba(0, 0, 0, .7)');
  gradient.addColorStop(0.48, 'rgba(0, 0, 0, .36)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(canvas);
}

/** Farthest the camera may stand from `target` along `yaw` and remain inside the room. */
export function roomDistanceLimit(bounds, yaw, target) {
  const margin = 0.9;
  const sx = Math.abs(Math.sin(yaw));
  const cz = Math.abs(Math.cos(yaw));
  const alongX = sx > 1e-4 ? (bounds.halfW * margin - Math.abs(target.x)) / sx : Infinity;
  const alongZ = cz > 1e-4 ? (bounds.halfD * margin - Math.abs(target.z)) / cz : Infinity;
  return Math.max(0.1, Math.min(alongX, alongZ));
}

/** A live studio camera moves through detail shots as the visitor scrolls. */
export const CarScene = forwardRef(function CarScene({
  onProgress, onReady, onError, onFirstFrame, paused = false, interactive = true, autoRotate = true,
  lightPreset = 'studio', brightness = 75, reducedMotion = false, tourPosition = 0,
  covered = true, onUnveil, establishing = false, onEstablished,
}, ref) {
  const containerRef = useRef(null);
  const ignitionAt = useRef(0);
  const unveilRef = useRef(onUnveil);
  const establishedRef = useRef(onEstablished);
  const firstFrameRef = useRef(onFirstFrame);
  const settingsRef = useRef({ paused, autoRotate, lightPreset, brightness, reducedMotion, covered, establishing });
  const tourRef = useRef(tourPosition);
  const updateSettingsRef = useRef(null);
  const updateTourRef = useRef(null);
  const invalidateRef = useRef(null);

  useEffect(() => { unveilRef.current = onUnveil; }, [onUnveil]);
  useEffect(() => { establishedRef.current = onEstablished; }, [onEstablished]);
  useEffect(() => { firstFrameRef.current = onFirstFrame; }, [onFirstFrame]);

  useEffect(() => {
    settingsRef.current = { paused, autoRotate, lightPreset, brightness, reducedMotion, covered, establishing };
    updateSettingsRef.current?.();
  }, [paused, autoRotate, lightPreset, brightness, reducedMotion, covered, establishing]);

  useEffect(() => {
    const previous = tourRef.current;
    tourRef.current = tourPosition;
    updateTourRef.current?.(previous, tourPosition);
  }, [tourPosition]);

  useImperativeHandle(ref, () => ({
    ignite() {
      ignitionAt.current = performance.now();
      invalidateRef.current?.();
    },
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let active = true;
    let failed = false;
    let frame = 0;
    let lastTick = 0;
    let lastDraw = -Infinity;
    let needsDraw = true;
    let model;
    let environment;
    let renderer;
    let cover = null;
    let revealAt = 0;
    let studio = null;
    let floorY = NOMINAL_CAR.floorY;
    // The opening: the wide shot is held (and slowly creeps in) from the first
    // frame; ENTER starts the sweep clock; the lights come up when the car arrives.
    let established = false;
    let establishClock = 0;
    let heldSince = 0;
    let lightsUpAt = 0;
    let lightsUp = 0;
    let pointerId = null;
    let lastPointerX = 0;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerTravel = 0;
    let resumeAt = 0;
    const reportError = (error) => {
      if (!active || failed) return;
      failed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      onError(error);
    };

    // Detect software rendering before choosing antialiasing. Multisampling is
    // expensive in SwiftShader; keep it on for hardware-accelerated browsers.
    let rendererName = '';
    let probe;
    try {
      const probeCanvas = document.createElement('canvas');
      probe = probeCanvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'high-performance' });
      if (!probe) throw new Error('WebGL 2 is unavailable.');
      try {
        const debug = probe.getExtension('WEBGL_debug_renderer_info');
        rendererName = debug ? probe.getParameter(debug.UNMASKED_RENDERER_WEBGL) : probe.getParameter(probe.RENDERER);
      } catch { /* Some browsers hide renderer information for privacy. */ }
      // Development only: `?hardware` previews the full studio in a software browser.
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('hardware')) rendererName = '';
      if (performanceProfile(rendererName, container.clientWidth, window.devicePixelRatio || 1).software) {
        renderer = new THREE.WebGLRenderer({ canvas: probeCanvas, context: probe, alpha: true, antialias: false });
        probe = null; // The renderer owns this context now.
      } else {
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        probe = null;
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      }
    } catch (error) {
      probe?.getExtension('WEBGL_lose_context')?.loseContext();
      reportError(error);
      return undefined;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    const profile = () => performanceProfile(rendererName, container.clientWidth, window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);
    const contextLost = (event) => {
      event.preventDefault();
      reportError(new Error('The WebGL context was lost.'));
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 1000);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    try {
      environment = pmrem.fromScene(room, 0.05).texture;
      scene.environment = environment;
    } catch {
      // The real directional lights still illuminate the model without a PMREM.
    } finally {
      room.dispose();
    }
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x332b2b, 1);
    scene.add(hemisphere);
    const light = (x, y, z) => {
      const source = new THREE.DirectionalLight(0xffffff, 1);
      source.position.set(x, y, z);
      scene.add(source);
      return source;
    };
    const key = light(5, 8, 5);
    const fill = light(-7, 4, -5);
    const rim = light(4, 3, -6);
    const turntable = new THREE.Group();
    scene.add(turntable);
    let rimIntensity = 1;

    function applyLighting() {
      const settings = settingsRef.current;
      const lighting = getLighting(settings.lightPreset, settings.brightness);
      key.color.setHex(lighting.keyColor);
      key.intensity = lighting.key * lightsUp;
      fill.color.setHex(lighting.fillColor);
      fill.intensity = lighting.fill * lightsUp;
      rim.color.setHex(lighting.rimColor);
      rim.intensity = lighting.rim * lightsUp;
      rimIntensity = lighting.rim * lightsUp;
      hemisphere.intensity = lighting.hemisphere * lightsUp;
      scene.environmentIntensity = lighting.environment * lightsUp;
      renderer.toneMappingExposure = lighting.exposure;
      studio?.setLighting(lighting, lightsUp);
    }

    let maximum = NOMINAL_CAR.maximum;
    let viewportWidth = 1;
    let viewportHeight = 1;
    let aspect = 1;
    const lookTarget = new THREE.Vector3();
    function resize() {
      viewportWidth = Math.max(container.clientWidth, 1);
      viewportHeight = Math.max(container.clientHeight, 1);
      aspect = viewportWidth / viewportHeight;
      renderer.setPixelRatio(profile().pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      studio?.resize(viewportWidth * profile().pixelRatio, viewportHeight * profile().pixelRatio);
      camera.aspect = aspect;
      camera.near = maximum / 500;
      camera.far = maximum * 50;
      camera.updateProjectionMatrix();
    }

    // The studio itself: dark walls, the LED line in the ceiling, polished tiles
    // that reflect the car and the softbox over it. Software WebGL skips the
    // mirror and the area light. It stands before the car arrives.
    function buildStudio() {
      studio?.dispose();
      const studioProfile = profile();
      studio = createStudio(renderer, {
        maximum,
        floorY,
        reflective: !studioProfile.software,
        areaLight: !studioProfile.software,
        textureSize: viewportWidth < 700 ? 768 : 1024,
        multisample: studioProfile.software ? 0 : 4,
      });
      scene.add(studio.group);
      studio.resize(viewportWidth * studioProfile.pixelRatio, viewportHeight * studioProfile.pixelRatio);
      applyLighting();
    }

    function ignitionPulse(now) {
      if (settingsRef.current.reducedMotion || !ignitionAt.current) return 0;
      const elapsed = now - ignitionAt.current;
      return elapsed >= 0 && elapsed < 1600 ? Math.sin((elapsed / 1600) * Math.PI) : 0;
    }
    function animateCover(now) {
      if (!cover || !revealAt) return false;
      const state = revealState(now - revealAt, settingsRef.current.reducedMotion);
      const floorY = cover.userData.floorY;
      cover.position.z = -state.travel * cover.userData.length * 1.15;
      cover.scale.y = state.flatten;
      cover.position.y = floorY * (1 - state.flatten) + state.lift * cover.userData.height;
      cover.material.opacity = state.opacity;
      cover.material.transparent = state.opacity < 1;
      // The hem cut-out scales with the fade so the cloth dissolves instead of popping.
      cover.material.alphaTest = HEM_ALPHA_TEST * state.opacity;
      if (state.done) {
        disposeCarCover(cover);
        cover = null;
        return false;
      }
      return true;
    }
    function draw(now) {
      const pulse = ignitionPulse(now);
      animateCover(now);
      if (!heldSince) heldSince = now;
      // The lights come up over the car once it stands in the room.
      const level = lightsUpAt ? lightsUpLevel(now - lightsUpAt) : 0;
      if (level !== lightsUp) {
        lightsUp = level;
        applyLighting();
      }
      const baseFov = aspect < 0.8 ? 39 : 36;
      let pose = getTourPose(tourRef.current, settingsRef.current.reducedMotion);
      let fov = baseFov;
      let opening = null;
      if (!established) {
        opening = settingsRef.current.establishing ? establishBlend(establishClock) : { blend: 0, done: false };
        pose = blendPose(pose, opening.blend, holdDrift(now - heldSince), baseFov);
        fov = pose.fov;
      }
      const mobileFit = aspect < 0.95 ? Math.max(1, pose.mobileFrame / aspect) : 1;
      let distance = maximum * pose.distance * mobileFit * (1 - pulse * 0.02);
      lookTarget.set(...pose.target).multiplyScalar(maximum);
      // The camera never leaves the room: if a framing would, it stops short of
      // the wall and widens the lens by the same ratio so the composition holds.
      if (studio) {
        const limit = roomDistanceLimit(studio.bounds, pose.yaw, lookTarget);
        if (distance > limit) {
          const widen = distance / limit;
          fov = Math.min(92, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * widen)));
          distance = limit;
        }
      }
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      camera.position.set(
        lookTarget.x + Math.sin(pose.yaw) * distance,
        lookTarget.y + pose.tilt * distance,
        lookTarget.z + Math.cos(pose.yaw) * distance,
      );
      // Stay under the ceiling on tall framings.
      if (studio) camera.position.y = Math.min(camera.position.y, studio.bounds.ceilingY - maximum * 0.06);
      // Keep copy and car on opposite sides of the frame; on a phone the car
      // sits slightly higher so the chapter text remains readable below it.
      const shiftX = -(aspect < 0.95 ? pose.mobileShift : pose.shift) * viewportWidth;
      // On short phones, leave room above the car for the bookend titles;
      // detail chapters still place it higher, away from their captions.
      const edgeShot = Math.max(0, 1 - tourRef.current * 2, 1 - (TOUR_STOPS.length - 1 - tourRef.current) * 2);
      const shortScreen = THREE.MathUtils.clamp((780 - viewportHeight) / 200, 0, 1);
      const shiftY = aspect < 0.95 ? viewportHeight * 0.07 * (1 - edgeShot * shortScreen) : 0;
      camera.setViewOffset(viewportWidth, viewportHeight, shiftX, shiftY, viewportWidth, viewportHeight);
      camera.lookAt(lookTarget);
      rim.intensity = rimIntensity + pulse * 0.8;
      renderer.render(scene, camera);
      // These values let tests verify the actual 3D pose without GPU screenshots.
      container.dataset.rotation = turntable.rotation.y.toFixed(4);
      container.dataset.tour = tourRef.current.toFixed(3);
      container.dataset.cameraYaw = pose.yaw.toFixed(3);
      container.dataset.cover = cover ? (revealAt ? 'revealing' : 'on') : 'off';
      container.dataset.opening = opening ? opening.blend.toFixed(3) : 'done';
      container.dataset.lights = lightsUp.toFixed(2);
      if (!lastDrawn) {
        lastDrawn = true;
        firstFrameRef.current?.();
      }
      lastDraw = now;
      needsDraw = false;
    }
    let lastDrawn = false;
    function schedule() {
      if (!active || failed || frame || !studio || settingsRef.current.paused || document.hidden) return;
      frame = requestAnimationFrame(tick);
    }
    function invalidate() {
      needsDraw = true;
      schedule();
    }
    function tick(now) {
      frame = 0;
      if (!active || failed || !studio || settingsRef.current.paused || document.hidden) return;
      const elapsed = lastTick ? (now - lastTick) / 1000 : 0;
      lastTick = now;
      const settings = settingsRef.current;
      const guided = tourRef.current > 0.12;
      if (!established && settings.establishing) {
        establishClock = advanceEstablish(establishClock, elapsed);
        if (establishBlend(establishClock).done) {
          established = true;
          // Let the arrival settle before the turntable starts to move.
          resumeAt = now + 2500;
          establishedRef.current?.();
        }
        needsDraw = true;
      }
      // The turntable only moves once the opening has arrived at the tour.
      if (established && pointerId === null && now >= resumeAt) {
        if (!guided && settings.autoRotate) {
          turntable.rotation.y = advanceRotation(turntable.rotation.y, elapsed) % TWO_PI;
        } else if (guided && !settings.reducedMotion) {
          // Return from a manual spin to the authored detail shot smoothly.
          const shortest = Math.atan2(Math.sin(turntable.rotation.y), Math.cos(turntable.rotation.y));
          turntable.rotation.y = Math.abs(shortest) < 0.001 ? 0 : shortest * Math.exp(-Math.min(elapsed, 0.1) * 3);
        }
      }
      // Throttle interactions too: repeated pointer events must not overwhelm a
      // software renderer. A pending update is drawn as soon as the next slot is free.
      if (now - lastDraw >= 1000 / profile().fps) draw(now);
      const ignitionIsActive = !settings.reducedMotion && ignitionAt.current && now - ignitionAt.current < 1600;
      const returningToShot = guided && !settings.reducedMotion && pointerId === null && Math.abs(turntable.rotation.y) > 0.001;
      const unveiling = Boolean(cover && revealAt);
      // The held wide shot creeps in and the lights ramp: keep drawing until the opening is over.
      const opening = !established;
      if (needsDraw || opening || (!guided && settings.autoRotate) || returningToShot || ignitionIsActive || unveiling) schedule();
    }
    function updateSettings() {
      applyLighting();
      cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
      if (!studio) return;
      if (!settingsRef.current.covered && cover && !revealAt) {
        // The cover is pulled off once, towards the rear, and never returns.
        revealAt = performance.now();
        if (settingsRef.current.paused) {
          disposeCarCover(cover);
          cover = null;
        }
      }
      if (settingsRef.current.paused) draw(performance.now());
      else invalidate();
    }
    function updateTour(previous, current) {
      if (settingsRef.current.reducedMotion && pointerId === null && Math.abs(current - previous) > 0.001) {
        // Reduced-motion visitors get still cuts when they scroll, not a sweep.
        turntable.rotation.y = 0;
      }
      invalidate();
    }
    updateSettingsRef.current = updateSettings;
    updateTourRef.current = updateTour;
    invalidateRef.current = invalidate;

    const handleResize = () => {
      resize();
      // setSize clears the buffer, including while the animation is stopped.
      if (!studio) return;
      if (settingsRef.current.paused) draw(performance.now());
      else invalidate();
    };
    const handleVisibility = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
      if (!document.hidden) invalidate();
    };
    const pointerDown = (event) => {
      if (settingsRef.current.paused || !model || !established || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (pointerId !== null) return;
      pointerId = event.pointerId;
      lastPointerX = event.clientX;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      pointerTravel = 0;
      container.classList.add('is-dragging');
      try { container.setPointerCapture(pointerId); } catch { /* Pointer capture is optional. */ }
    };
    const pointerMove = (event) => {
      if (event.pointerId !== pointerId || !model) return;
      const delta = event.clientX - lastPointerX;
      lastPointerX = event.clientX;
      pointerTravel = Math.max(pointerTravel, Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY));
      turntable.rotation.y = (turntable.rotation.y + rotationForDrag(delta, container.clientWidth)) % TWO_PI;
      invalidate();
    };
    const pointerEnd = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      container.classList.remove('is-dragging');
      // A tap on the covered car (not a drag) lifts the cover.
      if (event.type === 'pointerup' && pointerTravel < 8 && cover && !revealAt && settingsRef.current.covered) unveilRef.current?.();
      resumeAt = performance.now() + RESUME_AFTER_DRAG_MS;
      lastTick = 0;
      invalidate();
    };
    const keyDown = (event) => {
      if (settingsRef.current.paused || !model || !established) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        turntable.rotation.y += event.key === 'ArrowRight' ? Math.PI / 12 : -Math.PI / 12;
      } else if (event.key === 'Home') {
        event.preventDefault();
        turntable.rotation.y = 0;
      } else if ((event.key === 'Enter' || event.key === ' ') && cover && !revealAt && settingsRef.current.covered) {
        event.preventDefault();
        unveilRef.current?.();
        return;
      } else return;
      resumeAt = performance.now() + RESUME_AFTER_DRAG_MS;
      lastTick = 0;
      invalidate();
    };

    resize();
    try {
      buildStudio();
      // Compile the room's shaders now, so the first frame does not stall.
      renderer.compile(scene, camera);
    } catch (error) {
      reportError(error);
      return undefined;
    }
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    resizeObserver?.observe(container);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    container.addEventListener('pointerdown', pointerDown);
    container.addEventListener('pointermove', pointerMove);
    container.addEventListener('pointerup', pointerEnd);
    container.addEventListener('pointercancel', pointerEnd);
    container.addEventListener('lostpointercapture', pointerEnd);
    container.addEventListener('keydown', keyDown);
    if (!settingsRef.current.paused) invalidate();

    // Keep the full model on hardware-accelerated desktops; a carefully
    // simplified copy makes phones and software-rendered Chrome usable too.
    const selectedModel = profile().software || window.innerWidth <= 700 ? MODELS.lite : MODELS.full;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      selectedModel.url,
      (gltf) => {
        if (!active || failed) return;
        try {
          model = gltf.scene;
          // The car stays out of sight until its shaders are compiled and the lights come up.
          turntable.visible = false;
          turntable.add(model);
          model.updateMatrixWorld(true);
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          maximum = Math.max(size.x, size.y, size.z);
          model.position.sub(center);
          model.updateMatrixWorld(true);

          floorY = bounds.min.y - center.y - 0.025;
          // The room stood around the nominal car; rebuild it only if this car differs.
          if (Math.abs(maximum - NOMINAL_CAR.maximum) > NOMINAL_CAR.maximum * 0.02 || Math.abs(floorY - NOMINAL_CAR.floorY) > 0.03) buildStudio();
          // The car arrives under a studio cover shaped from its own silhouette.
          // If the cover cannot be built the tour still works; it is only a drape.
          if (settingsRef.current.covered) {
            try {
              const centred = new THREE.Box3().setFromObject(model);
              cover = createCarCover(renderer, model, centred, maximum, floorY);
              turntable.add(cover);
            } catch (coverError) {
              console.warn('The car cover could not be built:', coverError);
              cover = null;
            }
          }
          const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(maximum * 1.35, maximum * 1.35),
            new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false, opacity: 0.72 }),
          );
          floor.rotation.x = -Math.PI / 2;
          floor.position.y = floorY;
          scene.add(floor);
          resize();
          // Compile the car's shaders off the frame where possible, then bring
          // the lights up over it. Nothing stalls on the first visible frame.
          const arrive = () => {
            if (!active || failed) return;
            turntable.visible = true;
            lightsUpAt = performance.now();
            onProgress(100);
            onReady();
            if (settingsRef.current.paused) draw(performance.now());
            else invalidate();
          };
          const compiled = typeof renderer.compileAsync === 'function' ? renderer.compileAsync(turntable, camera, scene) : null;
          if (compiled && typeof compiled.then === 'function') compiled.then(arrive, () => arrive());
          else arrive();
        } catch (error) {
          reportError(error);
        }
      },
      (event) => {
        if (active && !failed) onProgress(transferPercent(event.loaded, event.total, selectedModel.bytes));
      },
      reportError,
    );

    return () => {
      active = false;
      updateSettingsRef.current = null;
      updateTourRef.current = null;
      invalidateRef.current = null;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      resizeObserver?.disconnect();
      container.removeEventListener('pointerdown', pointerDown);
      container.removeEventListener('pointermove', pointerMove);
      container.removeEventListener('pointerup', pointerEnd);
      container.removeEventListener('pointercancel', pointerEnd);
      container.removeEventListener('lostpointercapture', pointerEnd);
      container.removeEventListener('keydown', keyDown);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      studio?.dispose();
      studio = null;
      const textures = new Set();
      scene.traverse((object) => {
        if (!object.isMesh) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (!material) continue;
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
          material.dispose();
        }
      });
      for (const texture of textures) texture.dispose();
      environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, [onProgress, onReady, onError]);

  return (
    <div
      className="car-scene"
      ref={containerRef}
      role="region"
      tabIndex={paused || !interactive ? -1 : 0}
      aria-hidden={paused || !interactive || undefined}
      aria-label={covered ? 'Interactive 3D view of the covered BMW M4. Press Enter to unveil it.' : 'Interactive 3D view of the BMW M4'}
      aria-describedby="rotation-instructions"
    />
  );
});
