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
- The opening uses a rolling progress counter, a model-derived outline and a gradual reveal into the studio. Progress is capped by the actual transfer and 100% is reserved for the first rendered frame. When files are cached, normal motion still has a roughly 5.2-second introduction; reduced-motion users see a short static introduction instead. Once the model is ready, **Skip Intro** can bypass the remainder. A long load offers Retry, and a poster with a clear retry action is shown if WebGL/model loading fails.
- The camera begins low at the M4's front, then follows the scroll through the headlights, profile, wheel, rear, engine and a final view. The section navigation also moves through the tour. When `prefers-reduced-motion` is enabled, camera changes are discrete still views rather than a sweeping animation.
- The car turns slowly on the opening view by default. Drag it horizontally with a mouse or touch; in the detail chapters it returns to the guided angle after a pause. Focus the 3D view and use the left/right arrow keys to turn it or Home to reset. The auto-rotation button stops the opening turntable, and automatic rotation starts off for reduced-motion users.
- The Lighting control opens Studio, Dramatic and Warm presets that change the actual scene lighting; the intensity slider changes the lights, environmental reflections and exposure.
- Sound attempts to start automatically **after the reveal** when the browser permits it. Otherwise, use the sound control or press **Start the Engine**. The first audible sound is a real BMW M4 engine start; it is followed by an idle loop. **Start the Engine** / **Replay Engine** plays the start and then a real M4 rev. Loading cues are suppressed during startup, and the completion cue is deferred until startup finishes. Scroll and chapter arrival have subtle sound cues; the rear chapter can play an exhaust rev. The source recording is from 2016; its exact model year and generation are not specified.
- M4 engine-family information is based on [BMW's M4 Coupé information](https://www.bmwusa.com/vehicles/m-series/bmw-4-series-m-models/bmw-m4-coupe.html). Exact output and performance vary by model, year, market and specification, so the page does not assign an unverified horsepower or trim to the supplied 3D model.

## Credits

- Model, derived poster and outline: [BMW M4 Red Eyes by VTDAT23](https://sketchfab.com/3d-models/bmw-m4-red-eyes-d736f41b4123453bae4df68b7b349087), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The footer opens [`public/credits.html`](public/credits.html); see also [`public/models/ATTRIBUTION.md`](public/models/ATTRIBUTION.md) for changes and the original source credit.
- Audio sources and licenses: [`public/audio/ATTRIBUTION.md`](public/audio/ATTRIBUTION.md).
