import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { transferPercent } from './progress.js';
import { RESUME_AFTER_DRAG_MS, advanceRotation, getLighting, performanceProfile, rotationForDrag } from './studio.js';
import { TOUR_STOPS, getTourPose } from './tour.js';

const MODELS = {
  full: { url: `${import.meta.env.BASE_URL}models/m4.glb`, bytes: 6_680_780 },
  lite: { url: `${import.meta.env.BASE_URL}models/m4-lite.glb`, bytes: 3_430_820 },
};
const TWO_PI = Math.PI * 2;

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

function makeSoftboxTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const across = context.createLinearGradient(0, 0, canvas.width, 0);
  across.addColorStop(0, 'rgba(255,255,255,0)');
  across.addColorStop(0.4, 'rgba(255,255,255,0.25)');
  across.addColorStop(0.5, 'rgba(255,255,255,0.7)');
  across.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  across.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = across;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'destination-in';
  const vertical = context.createLinearGradient(0, 0, 0, canvas.height);
  vertical.addColorStop(0, 'rgba(255,255,255,0)');
  vertical.addColorStop(0.12, 'rgba(255,255,255,1)');
  vertical.addColorStop(0.88, 'rgba(255,255,255,1)');
  vertical.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = vertical;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A live studio camera moves through detail shots as the visitor scrolls. */
export const CarScene = forwardRef(function CarScene({
  onProgress, onReady, onError, paused = false, autoRotate = true,
  lightPreset = 'studio', brightness = 75, reducedMotion = false, tourPosition = 0,
}, ref) {
  const containerRef = useRef(null);
  const ignitionAt = useRef(0);
  const settingsRef = useRef({ paused, autoRotate, lightPreset, brightness, reducedMotion });
  const tourRef = useRef(tourPosition);
  const updateSettingsRef = useRef(null);
  const updateTourRef = useRef(null);
  const invalidateRef = useRef(null);

  useEffect(() => {
    settingsRef.current = { paused, autoRotate, lightPreset, brightness, reducedMotion };
    updateSettingsRef.current?.();
  }, [paused, autoRotate, lightPreset, brightness, reducedMotion]);

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
    let pointerId = null;
    let lastPointerX = 0;
    let resumeAt = 0;
    let hasEnteredStudio = false;
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
      key.intensity = lighting.key;
      fill.color.setHex(lighting.fillColor);
      fill.intensity = lighting.fill;
      rim.color.setHex(lighting.rimColor);
      rim.intensity = lighting.rim;
      rimIntensity = lighting.rim;
      hemisphere.intensity = lighting.hemisphere;
      scene.environmentIntensity = lighting.environment;
      renderer.toneMappingExposure = lighting.exposure;
    }
    applyLighting();

    let maximum = 4.85;
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
      camera.aspect = aspect;
      camera.fov = aspect < 0.8 ? 39 : 36;
      camera.near = maximum / 500;
      camera.far = maximum * 50;
      camera.updateProjectionMatrix();
    }

    function ignitionPulse(now) {
      if (settingsRef.current.reducedMotion || !ignitionAt.current) return 0;
      const elapsed = now - ignitionAt.current;
      return elapsed >= 0 && elapsed < 1600 ? Math.sin((elapsed / 1600) * Math.PI) : 0;
    }
    function draw(now) {
      const pulse = ignitionPulse(now);
      const pose = getTourPose(tourRef.current, settingsRef.current.reducedMotion);
      const mobileFit = aspect < 0.95 ? Math.max(1, pose.mobileFrame / aspect) : 1;
      const distance = maximum * pose.distance * mobileFit * (1 - pulse * 0.02);
      lookTarget.set(...pose.target).multiplyScalar(maximum);
      camera.position.set(
        lookTarget.x + Math.sin(pose.yaw) * distance,
        lookTarget.y + pose.tilt * distance,
        lookTarget.z + Math.cos(pose.yaw) * distance,
      );
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
      lastDraw = now;
      needsDraw = false;
    }
    function schedule() {
      if (!active || failed || frame || !model || settingsRef.current.paused || document.hidden) return;
      frame = requestAnimationFrame(tick);
    }
    function invalidate() {
      needsDraw = true;
      schedule();
    }
    function tick(now) {
      frame = 0;
      if (!active || failed || !model || settingsRef.current.paused || document.hidden) return;
      const elapsed = lastTick ? (now - lastTick) / 1000 : 0;
      lastTick = now;
      const settings = settingsRef.current;
      const guided = tourRef.current > 0.12;
      if (pointerId === null && now >= resumeAt) {
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
      if (needsDraw || (!guided && settings.autoRotate) || returningToShot || ignitionIsActive) schedule();
    }
    function updateSettings() {
      applyLighting();
      cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
      if (!model) return;
      if (settingsRef.current.paused) draw(performance.now());
      else {
        if (!hasEnteredStudio) {
          hasEnteredStudio = true;
          // Hold the head-on opening while the startup can finish, then let
          // the optional turntable move. Scrolling is never blocked by sound.
          resumeAt = performance.now() + 5000;
        }
        invalidate();
      }
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
      if (!model) return;
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
      if (settingsRef.current.paused || !model || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (pointerId !== null) return;
      pointerId = event.pointerId;
      lastPointerX = event.clientX;
      container.classList.add('is-dragging');
      try { container.setPointerCapture(pointerId); } catch { /* Pointer capture is optional. */ }
    };
    const pointerMove = (event) => {
      if (event.pointerId !== pointerId || !model) return;
      const delta = event.clientX - lastPointerX;
      lastPointerX = event.clientX;
      turntable.rotation.y = (turntable.rotation.y + rotationForDrag(delta, container.clientWidth)) % TWO_PI;
      invalidate();
    };
    const pointerEnd = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      container.classList.remove('is-dragging');
      resumeAt = performance.now() + RESUME_AFTER_DRAG_MS;
      lastTick = 0;
      invalidate();
    };
    const keyDown = (event) => {
      if (settingsRef.current.paused || !model) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        turntable.rotation.y += event.key === 'ArrowRight' ? Math.PI / 12 : -Math.PI / 12;
      } else if (event.key === 'Home') {
        event.preventDefault();
        turntable.rotation.y = 0;
      } else return;
      resumeAt = performance.now() + RESUME_AFTER_DRAG_MS;
      lastTick = 0;
      invalidate();
    };

    resize();
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
          turntable.add(model);
          model.updateMatrixWorld(true);
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          maximum = Math.max(size.x, size.y, size.z);
          model.position.sub(center);

          const floorY = bounds.min.y - center.y - 0.025;
          // A real ground and a subtle inlaid ring stay fixed as the camera
          // travels, making this a studio to move through, not a flat backdrop.
          const ground = new THREE.Mesh(
            new THREE.CircleGeometry(maximum * 2.2, 96),
            new THREE.MeshBasicMaterial({ color: 0x29292d }),
          );
          ground.rotation.x = -Math.PI / 2;
          ground.position.y = floorY - 0.014;
          scene.add(ground);
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(maximum * 0.74, maximum * 0.742, 128),
            new THREE.MeshBasicMaterial({ color: 0x9c9b9a, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }),
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = floorY - 0.005;
          scene.add(ring);
          // Quiet vertical softboxes sit around the set. Their parallax changes
          // with the camera, giving the dark studio depth without obscuring the car.
          const softboxGeometry = new THREE.PlaneGeometry(maximum * 0.11, maximum * 0.78);
          const softboxMaterial = new THREE.MeshBasicMaterial({ color: 0xe5ded8, map: makeSoftboxTexture(), transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
          const softboxes = new THREE.InstancedMesh(softboxGeometry, softboxMaterial, 8);
          const softboxTransform = new THREE.Object3D();
          for (let i = 0; i < 8; i += 1) {
            const angle = (i + 0.5) * TWO_PI / 8;
            softboxTransform.position.set(Math.sin(angle) * maximum * 1.95, floorY + maximum * 0.38, Math.cos(angle) * maximum * 1.95);
            softboxTransform.lookAt(0, softboxTransform.position.y, 0);
            softboxTransform.updateMatrix();
            softboxes.setMatrixAt(i, softboxTransform.matrix);
          }
          scene.add(softboxes);
          const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(maximum * 1.35, maximum * 1.35),
            new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false, opacity: 0.72 }),
          );
          floor.rotation.x = -Math.PI / 2;
          floor.position.y = floorY;
          scene.add(floor);
          resize();
          // Render one actual frame before declaring the visual ready; no extra
          // frames are drawn underneath the opaque preloader.
          draw(performance.now());
          onProgress(100);
          onReady();
          if (!settingsRef.current.paused) invalidate();
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
      tabIndex={paused ? -1 : 0}
      aria-hidden={paused || undefined}
      aria-label="Interactive 3D view of the BMW M4"
      aria-describedby="rotation-instructions"
    />
  );
});
