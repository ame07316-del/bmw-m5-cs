# BMW M4 — an experience in motion

An independent, scroll-driven 3D tour of the supplied BMW M4 in a dark studio. This is a visual experiment, not an official BMW website.

## Run locally

Use Node.js 20.19+ or 22.12+ (Node 22 is recommended).

```sh
npm ci
npm run dev
```

Open the address printed by Vite. Production build and tests:

```sh
npm run build
npm test
npm run preview
```

## The experience

- The uploaded model is preserved in `assets/bmw-m4/`. The full web version, `public/models/m4.glb`, is flattened, joined and compressed with Meshopt and WebP, at about 6.7 MB rather than 41.5 MB. A 3.4 MB mesh-simplified version is used on narrow screens and software WebGL renderers. Three.js loads both with a Meshopt decoder; software rendering also uses a lower resolution and frame rate.
- The studio is live from the first frame. The loading counter rolls over the dark room (only the LED line glows); the car's shaders are compiled off the visible frame where the browser allows it, and once the car stands in the room the studio lights come up over it in about 1.6 seconds, so nothing pops or stalls. Progress is capped by the actual transfer and 100% is reserved for the car's arrival. When files are cached, normal motion still has a roughly 5.2-second count; reduced-motion users get a short static one. Once the model is ready, **Skip Intro** moves straight to the gate. A long load offers Retry, and a poster with a clear retry action is shown if WebGL/model loading fails.
- The studio is a real room (`src/Studio.js`): dark matte walls that catch a little light at the top, a continuous LED line let into the ceiling, and large dark porcelain tiles in running bond. The tiles are polished: a planar reflection (three.js `Reflector`) shows under the car, the cover and the LED line, with opaque grout between tiles. Software WebGL renders the same room without the mirror. The lighting presets tint the walls and the intensity slider dims the room with the lights.
- After the reveal the M4 is standing under a studio cover. The cloth is not a stock mesh: once the model has loaded, the car is sampled from above into a height map, which is lifted by the cloth's clearance, allowed to fall to the floor at a fabric-like angle, softened, and given hanging folds and surface wrinkles (`src/shroud.js`, `src/CarCover.js`). It rests on the floor where the car ends, turns with the car, and never intersects the bodywork. Tap or click the covered car, press Enter with the 3D view focused, choose **Start the Engine**, or scroll into the first chapter and the cover is pulled off towards the rear once and disposed; reduced-motion visitors get a short fade instead.
- The opening (`src/establish.js`) is held, not timed. The wide shot stands far back at a rear three-quarter angle: the covered car small in the middle of the floor, the softbox hanging over it, its light mirrored in the tiles; the frame slowly creeps in so it is never static. At 100% the title and a round **ENTER** button appear over it. ENTER is the visitor's gesture: it lets the sound through and starts one continuous move, the camera sweeping round the car's side and pushing in to the first tour view over about five seconds, easing out of the wide shot and settling on arrival. The camera never leaves the room: a framing that would, stops at the wall and widens the lens by the same ratio. The interface stays hidden until the camera has arrived. Nothing can rush or cut the move — a double-click on ENTER, a scroll or a key during it changes nothing, and a stalled frame or a background tab never jumps it. Because ENTER is the visitor's own request, the sweep plays for everyone; the system reduced-motion setting governs the turntable, the scroll tour and the interface transitions instead, and the gate offers the full motion with one click, since a system setting is treated as a default, not a lock.
- The softbox (`STUDIO.softbox`) is a large emissive panel hung over the middle of the car, aligned with it, with a soft halo and a matching `RectAreaLight` that actually lights the car and the cover from above; software WebGL keeps the glowing panel without the area light. Its brightness follows the lighting presets and the intensity slider. In-view controls for it come next.
- The camera begins low at the M4's front, then follows the scroll through the headlights, profile, wheel, rear, engine and a final view. The section navigation also moves through the tour. When `prefers-reduced-motion` is enabled, camera changes are discrete still views rather than a sweeping animation.
- The car turns slowly on the opening view by default. Drag it horizontally with a mouse or touch; in the detail chapters it returns to the guided angle after a pause. Focus the 3D view and use the left/right arrow keys to turn it or Home to reset. The auto-rotation button stops the opening turntable, and automatic rotation starts off for reduced-motion users.
- The Lighting control opens Studio, Dramatic and Warm presets that change the actual scene lighting; the intensity slider changes the lights, environmental reflections and exposure.
- Sound starts on **ENTER** when the browser permits it (the click is the gesture browsers require). Otherwise, use the sound control or press **Start the Engine**. The first audible sound is a real BMW M4 engine start; it is followed by an idle loop. **Start the Engine** / **Replay Engine** plays the start and then a real M4 rev. Loading cues are suppressed during startup, and the completion cue is deferred until startup finishes. Scroll and chapter arrival have subtle sound cues; the rear chapter can play an exhaust rev. The source recording is from 2016; its exact model year and generation are not specified.
- M4 engine-family information is based on [BMW's M4 Coupé information](https://www.bmwusa.com/vehicles/m-series/bmw-4-series-m-models/bmw-m4-coupe.html). Exact output and performance vary by model, year, market and specification, so the page does not assign an unverified horsepower or trim to the supplied 3D model.

## Credits

- Model, derived poster and outline: [BMW M4 Red Eyes by VTDAT23](https://sketchfab.com/3d-models/bmw-m4-red-eyes-d736f41b4123453bae4df68b7b349087), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The footer opens [`public/credits.html`](public/credits.html); see also [`public/models/ATTRIBUTION.md`](public/models/ATTRIBUTION.md) for changes and the original source credit.
- Audio sources and licenses: [`public/audio/ATTRIBUTION.md`](public/audio/ATTRIBUTION.md).
