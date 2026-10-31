import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { ExperienceAudio } from './audio.js';
import { Preloader } from './Preloader.jsx';
import { INTRO_REVEAL_MS, introProgress, introWait } from './intro.js';
import { DEFAULT_BRIGHTNESS, DEFAULT_LIGHT_PRESET, LIGHT_PRESETS, clampBrightness, getLighting } from './studio.js';
import { TOUR_STOPS, activeTourIndex, progressFromOffsets } from './tour.js';

const CarScene = lazy(() => import('./CarScene.jsx').then((module) => ({ default: module.CarScene })));

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onError(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

function SoundIcon({ on }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9h3l4-3v12l-4-3H4V9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {on ? <path d="M14.5 9a4.5 4.5 0 0 1 0 6M17 6.5a8 8 0 0 1 0 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        : <path d="m15 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
    </svg>
  );
}

function LightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.25" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4m10.6 10.6 1.4 1.4m0-13.4-1.4 1.4M6.7 17.3l-1.4 1.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('loading');
  const [modelReady, setModelReady] = useState(false);
  const [introElapsed, setIntroElapsed] = useState(0);
  const [slowLoading, setSlowLoading] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [autoRotate, setAutoRotate] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [lightPreset, setLightPreset] = useState(DEFAULT_LIGHT_PRESET);
  const [brightness, setBrightness] = useState(DEFAULT_BRIGHTNESS);
  const [lightsOpen, setLightsOpen] = useState(false);
  const [tourPosition, setTourPosition] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [started, setStarted] = useState(false);
  const [igniting, setIgniting] = useState(false);
  const [soundNotice, setSoundNotice] = useState('');
  const [covered, setCovered] = useState(true);
  const coveredRef = useRef(true);
  const introStartedAt = useRef(performance.now());
  const audioRef = useRef(null);
  const sceneRef = useRef(null);
  const tourRef = useRef(null);
  const interacted = useRef(false);
  const autoplayAttempted = useRef(false);
  const soundRequest = useRef(0);
  const timer = useRef(null);
  const loading = phase === 'loading' || phase === 'revealing';
  const visualAvailable = phase !== 'error';
  const lighting = getLighting(lightPreset, brightness);

  useEffect(() => {
    const audio = new ExperienceAudio();
    audioRef.current = audio;
    const visibility = () => audio.visibility(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', visibility);
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  // The M4 starts after the loading reveal when autoplay is allowed. Chrome
  // often requires a gesture instead, so the engine and sound controls remain
  // available rather than blocking the tour.
  useEffect(() => {
    if (phase !== 'ready' || interacted.current || autoplayAttempted.current || !audioRef.current) return;
    autoplayAttempted.current = true;
    const audio = audioRef.current;
    const request = ++soundRequest.current;
    audio.tryAutoplay().then((enabled) => {
      if (!interacted.current && audioRef.current === audio && request === soundRequest.current) setSoundOn(enabled);
    });
  }, [phase]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (event) => {
      setReducedMotion(event.matches);
      if (event.matches) setAutoRotate(false);
    };
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (phase !== 'loading' || reducedMotion) return undefined;
    let frame;
    let lastUpdate = -Infinity;
    const tick = (now) => {
      if (now - lastUpdate >= 80) {
        setIntroElapsed(now - introStartedAt.current);
        lastUpdate = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== 'loading') return undefined;
    const timeout = window.setTimeout(() => setSlowLoading(true), 25000);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (!modelReady || phase !== 'loading') return undefined;
    const wait = introWait(performance.now() - introStartedAt.current, reducedMotion);
    const timeout = window.setTimeout(() => {
      audioRef.current?.ready();
      setPhase(reducedMotion ? 'ready' : 'revealing');
    }, wait);
    return () => clearTimeout(timeout);
  }, [modelReady, phase, reducedMotion]);

  useEffect(() => {
    if (phase !== 'revealing') return undefined;
    const timeout = window.setTimeout(() => setPhase('ready'), reducedMotion ? 0 : INTRO_REVEAL_MS);
    return () => clearTimeout(timeout);
  }, [phase, reducedMotion]);

  useEffect(() => {
    const original = document.documentElement.style.overflow;
    if (loading) {
      document.documentElement.style.overflow = 'hidden';
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    return () => { document.documentElement.style.overflow = original; };
  }, [loading]);

  // The same continuous scroll position drives both chapter navigation and the
  // 3D camera. Chapter heights are measured, not assumed to be identical.
  useEffect(() => {
    if (loading || !tourRef.current) return undefined;
    const chapters = Array.from(tourRef.current.querySelectorAll('[data-tour-chapter]'));
    let frame = 0;
    let previousChapter = -1;
    let previousY = window.scrollY;
    function update() {
      frame = 0;
      const offsets = chapters.map((chapter) => chapter.offsetTop);
      const position = progressFromOffsets(window.scrollY, offsets);
      const index = activeTourIndex(position);
      setTourPosition((current) => Math.abs(current - position) < 0.001 ? current : position);
      if (position > 0.12 && coveredRef.current) unveil();
      if (index !== previousChapter) {
        if (previousChapter >= 0 && index > 0 && index < TOUR_STOPS.length - 1) {
          audioRef.current?.section(index === 4 ? 'exhaust' : TOUR_STOPS[index].id);
        }
        previousChapter = index;
        setActiveChapter(index);
      }
    }
    function onScroll() {
      if (Math.abs(window.scrollY - previousY) > 2) audioRef.current?.scroll();
      previousY = window.scrollY;
      if (!frame) frame = requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [loading]);

  const displayedProgress = introProgress(progress, introElapsed, reducedMotion);
  useEffect(() => {
    if (phase === 'loading') audioRef.current?.progress(displayedProgress);
  }, [displayedProgress, phase]);

  const handleProgress = useCallback((value) => setProgress((previous) => Math.max(previous, value)), []);
  // The cover comes off once: on a tap on the car, on Start the Engine, or as
  // soon as the visitor scrolls into the first chapter.
  const unveil = useCallback(() => {
    if (!coveredRef.current) return;
    coveredRef.current = false;
    setCovered(false);
  }, []);
  const handleReady = useCallback(() => { setProgress(100); setModelReady(true); }, []);
  const handleError = useCallback((error) => {
    console.error('The M4 visual could not be loaded:', error);
    setPhase('error');
  }, []);
  const retry = () => window.location.reload();
  const skipIntro = () => {
    if (!modelReady || phase !== 'loading') return;
    audioRef.current?.ready();
    setPhase(reducedMotion ? 'ready' : 'revealing');
  };
  const goTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  async function toggleSound() {
    interacted.current = true;
    const audio = audioRef.current;
    if (!audio) return;
    const request = ++soundRequest.current;
    const wasEnabled = audio.enabled;
    const enabled = await audio.toggle();
    if (audioRef.current !== audio || request !== soundRequest.current) return;
    setSoundOn(enabled);
    setSoundNotice(enabled ? 'Sound enabled.' : wasEnabled ? 'Sound off.' : 'Use the sound control to enable audio.');
  }

  async function ignite() {
    interacted.current = true;
    unveil();
    const audio = audioRef.current;
    const playback = audio?.ignite();
    const request = playback ? ++soundRequest.current : soundRequest.current;
    sceneRef.current?.ignite();
    setStarted(true);
    setIgniting(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setIgniting(false), 1650);
    if (playback) {
      await playback;
      if (audioRef.current !== audio || request !== soundRequest.current) return;
      setSoundOn(audio.enabled);
      setSoundNotice(audio.enabled ? 'Sound enabled.' : 'Use the sound control to enable audio.');
    }
  }

  return (
    <main
      className={`experience ${covered ? 'is-covered' : ''} ${phase === 'ready' ? 'is-ready' : ''} ${loading ? 'intro-active' : ''} ${phase === 'revealing' ? 'intro-revealing' : ''} ${phase === 'error' ? 'has-error' : ''} ${igniting ? 'is-igniting' : ''}`}
      style={{ '--room-rgb': lighting.room, '--room-strength': 0.06 + brightness / 100 * 0.2, '--intensity': `${brightness}%` }}
    >
      <div className="stage-background" aria-hidden="true"><div className="stage-floor" /></div>
      <div className="stage-poster" aria-hidden="true" />
      {visualAvailable && (
        <SceneBoundary onError={handleError}>
          <Suspense fallback={null}>
            <CarScene ref={sceneRef} paused={phase !== 'ready'} autoRotate={autoRotate} tourPosition={tourPosition}
              lightPreset={lightPreset} brightness={brightness} reducedMotion={reducedMotion}
              covered={covered} onUnveil={unveil}
              onProgress={handleProgress} onReady={handleReady} onError={handleError} />
          </Suspense>
        </SceneBoundary>
      )}
      <div className="stage-vignette" aria-hidden="true" />

      <header className="topbar">
        <div className="brand" aria-label="BMW M4 experience" aria-hidden={loading || undefined}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-name">BMW <strong>M4</strong></span>
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-caption">AN EXPERIENCE<br />IN MOTION</span>
        </div>
        <div className="topbar__actions">
          <button className="light-toggle" type="button" onClick={() => setLightsOpen((open) => !open)} aria-expanded={lightsOpen} aria-controls="lighting-panel" disabled={loading || !visualAvailable}>
            <LightIcon /><span>LIGHTING</span>
          </button>
          <button className="sound-toggle" type="button" onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}>
            <SoundIcon on={soundOn} /><span>SOUND <b>{soundOn ? 'ON' : 'OFF'}</b></span>
          </button>
        </div>
      </header>

      <section className="lighting-panel" id="lighting-panel" aria-labelledby="lighting-title" hidden={!lightsOpen || loading} onKeyDown={(event) => { if (event.key === 'Escape') setLightsOpen(false); }}>
        <div className="lighting-panel__top"><p className="section-kicker">THE STUDIO</p><button type="button" className="close-lights" onClick={() => setLightsOpen(false)} aria-label="Close lighting controls">×</button></div>
        <h2 id="lighting-title">Light the <em>scene.</em></h2>
        <p className="lighting-description">Set the mood, your way.</p>
        <div className="light-options" role="group" aria-label="Studio lighting preset">
          {LIGHT_PRESETS.map((preset) => (
            <button key={preset.id} type="button" className={preset.id === lightPreset ? 'is-selected' : ''} aria-pressed={preset.id === lightPreset} disabled={!visualAvailable} onClick={() => setLightPreset(preset.id)}>{preset.label}</button>
          ))}
        </div>
        <div className="intensity-control">
          <div className="intensity-control__labels"><label htmlFor="light-intensity">INTENSITY</label><output htmlFor="light-intensity">{brightness}%</output></div>
          <input id="light-intensity" type="range" min="0" max="100" value={brightness} disabled={!visualAvailable} onChange={(event) => setBrightness(clampBrightness(event.target.value))} aria-label="Studio light intensity" />
        </div>
      </section>

      <nav className="tour-rail" aria-label="Tour chapters" aria-hidden={loading || undefined} inert={loading ? true : undefined}>
        <span className="tour-rail__count">{String(Math.min(Math.max(activeChapter, 1), 5)).padStart(2, '0')} <i /> 05</span>
        {TOUR_STOPS.slice(1, 6).map((stop, i) => (
          <button type="button" key={stop.id} onClick={() => goTo(stop.id)} aria-label={`Go to ${stop.label.toLowerCase()}`} aria-current={activeChapter === i + 1 ? 'location' : undefined}>
            <span />
          </button>
        ))}
        <span className="tour-rail__label">{TOUR_STOPS[activeChapter].label}</span>
      </nav>

      <div className="tour-content" ref={tourRef} aria-hidden={loading || undefined} inert={loading ? true : undefined}>
        <section className="chapter chapter--hero" id="beginning" data-tour-chapter>
          <div className="chapter__inner">
            <div className="hero-copy">
              <p className="section-kicker">THE BMW</p>
              <h1>M4<span className="sr-only"> — an experience in motion</span></h1>
              <p className="hero-copy__line">Made to be <em>felt.</em></p>
              <p className="hero-copy__description">A closer look at the machine<br />behind the feeling.</p>
              <button className="engine-button" type="button" onClick={ignite} disabled={loading}><span aria-hidden="true">▶</span><span>{started ? 'REPLAY ENGINE' : 'START THE ENGINE'}</span><span aria-hidden="true">↗</span></button>
              <p className="audio-hint">Sound on for the full experience.</p>
            </div>
            <div className="hero-bottom">
              <button className="scroll-cue" type="button" onClick={() => goTo('the-face')}><span>SCROLL TO EXPLORE</span><span className="scroll-cue__line" aria-hidden="true" /><span aria-hidden="true">↓</span></button>
              <div className="rotation-controls">
                <p id="rotation-instructions">{visualAvailable ? <>{covered && <button type="button" className="unveil-cue" onClick={unveil}>TAP THE CAR TO UNVEIL</button>}<span className="rotation-arrow" aria-hidden="true">⟵ &nbsp;⟶</span> DRAG TO ROTATE <span className="sr-only">or focus the 3D view and use the left and right arrow keys. Home resets the angle.{covered ? ' Enter lifts the cover.' : ''}</span></> : 'STATIC PREVIEW'}</p>
                <button type="button" className="auto-toggle" onClick={() => setAutoRotate((value) => !value)} aria-pressed={autoRotate} disabled={!visualAvailable}><span className="auto-indicator" aria-hidden="true" /> AUTO ROTATE <b>{autoRotate ? 'ON' : 'OFF'}</b></button>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter chapter--left" id="the-face" data-tour-chapter>
          <div className="chapter__inner"><div className="chapter__copy">
            <p className="chapter__index">01 <span /> THE FACE</p>
            <h2>An unmistakable <em>entrance.</em></h2>
            <p>The bold twin-kidney grille and distinctive headlights bring the M4 into focus, even before it moves.</p>
            <span className="chapter__detail">DESIGNED TO BE SEEN</span>
          </div></div>
        </section>

        <section className="chapter chapter--right" id="the-profile" data-tour-chapter>
          <div className="chapter__inner"><div className="chapter__copy">
            <p className="chapter__index">02 <span /> THE PROFILE</p>
            <h2>Sculpted for <em>motion.</em></h2>
            <p>A long hood, low roofline and muscular proportions give the coupé its unmistakable silhouette.</p>
            <span className="chapter__detail">FORM FOLLOWS FEELING</span>
          </div></div>
        </section>

        <section className="chapter chapter--left" id="the-wheels" data-tour-chapter>
          <div className="chapter__inner"><div className="chapter__copy">
            <p className="chapter__index">03 <span /> THE DETAILS</p>
            <h2>Every detail <em>matters.</em></h2>
            <p>From the multi-spoke wheels to the dark carbon-look finish, every line adds to its presence.</p>
            <span className="chapter__detail">A CLOSER LOOK</span>
          </div></div>
        </section>

        <section className="chapter chapter--right" id="the-rear" data-tour-chapter>
          <div className="chapter__inner"><div className="chapter__copy">
            <p className="chapter__index">04 <span /> THE REAR</p>
            <h2>Leave an <em>impression.</em></h2>
            <p>Broad shoulders, a purposeful stance and a note that stays with you long after it passes.</p>
            <button className="text-action" type="button" onClick={ignite}>HEAR THE ENGINE <span aria-hidden="true">↗</span></button>
          </div></div>
        </section>

        <section className="chapter chapter--left" id="the-engine" data-tour-chapter>
          <div className="chapter__inner"><div className="chapter__copy chapter__copy--engine">
            <p className="chapter__index">05 <span /> THE ENGINE</p>
            <h2>Power you can <em>feel.</em></h2>
            <p>At its heart, the M4 pairs an inline six-cylinder engine with M TwinPower Turbo technology.</p>
            <dl className="specs"><div><dt>DISPLACEMENT</dt><dd>3.0 <small>L</small></dd></div><div><dt>ENGINE</dt><dd>Inline <small>6</small></dd></div><div><dt>TECHNOLOGY</dt><dd>M TwinPower</dd></div></dl>
            <p className="details__note">BMW M4 Coupé · specifications vary by version. <a href="https://www.bmwusa.com/vehicles/m-series/bmw-4-series-m-models/bmw-m4-coupe.html" target="_blank" rel="noreferrer">BMW source ↗</a></p>
          </div></div>
        </section>

        <section className="chapter chapter--final" id="end" data-tour-chapter>
          <div className="chapter__inner"><div className="final-copy">
            <p className="section-kicker">THE BMW M4</p>
            <h2>Made to be <em>felt.</em></h2>
            <p>Every angle tells a story. Make it yours.</p>
            <div className="final-actions"><button className="engine-button" type="button" onClick={ignite}><span aria-hidden="true">▶</span><span>REPLAY ENGINE</span><span aria-hidden="true">↗</span></button><button className="text-action" type="button" onClick={() => goTo('beginning')}>BACK TO THE BEGINNING <span aria-hidden="true">↑</span></button></div>
          </div>
          <footer className="bottom-bar"><span className="footer-note">AN INDEPENDENT EXPERIENCE</span><a className="credit" href={`${import.meta.env.BASE_URL}credits.html`} target="_blank" rel="noreferrer" title="View asset credits and licenses" aria-label="Made with Amr Eskander — view asset credits and licenses">::made with :amr eskander</a></footer>
          </div>
        </section>
      </div>

      {phase === 'error' && <div className="scene-error" role="alert"><div><span>3D VIEW UNAVAILABLE</span><p>We couldn’t load the studio. The preview is shown instead.</p></div><button type="button" onClick={retry}>TRY AGAIN ↗</button></div>}
      {loading && <Preloader progress={displayedProgress} leaving={phase === 'revealing'} ready={modelReady} slow={slowLoading} onSkip={skipIntro} onRetry={retry} />}
      <span className="sr-only" role="status" aria-live="polite">{soundNotice}</span>
    </main>
  );
}
