import { memo, useLayoutEffect, useState } from 'react';

const clamp = (value) => Math.max(0, Math.min(1, value));

// Two cells per digit keep the reel lightweight, even at very large sizes.
const NumberReel = memo(function NumberReel({ step }) {
  const [pair, setPair] = useState(() => ({ previous: step, current: step }));
  useLayoutEffect(() => {
    setPair((last) => last.current === step ? last : { previous: last.current, current: step });
  }, [step]);
  return (
    <span className="preloader__digit">
      <span className="preloader__strip" key={pair.current}>
        <span className="preloader__cell">{pair.previous % 10}</span>
        <span className="preloader__cell">{pair.current % 10}</span>
      </span>
    </span>
  );
});

/** Progress is capped by the actual model load; the poster is only a preview. */
export function Preloader({ progress, leaving, ready, slow, onSkip, onRetry }) {
  const outline = clamp((progress - 8) / 28) * (1 - clamp((progress - 68) / 32)) * 0.72;
  const car = clamp((progress - 38) / 52) * 0.9;
  return (
    <section
      className={`preloader ${leaving ? 'preloader--leaving' : ''}`}
      aria-label="Preparing the BMW M4 experience"
      style={{ '--outline-opacity': outline, '--car-opacity': car }}
    >
      <div className="preloader__atmosphere" aria-hidden="true" />
      <div className="preloader__shape preloader__shape--outline" aria-hidden="true" />
      <div className="preloader__shape preloader__shape--car" aria-hidden="true" />
      <div className="preloader__vignette" aria-hidden="true" />
      <div className="preloader__readout" role="progressbar" aria-label="Loading the BMW M4 experience" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress} aria-valuetext={`${progress}%`}>
        <div className="preloader__number" aria-hidden="true">
          <NumberReel step={Math.floor(progress / 100)} />
          <NumberReel step={Math.floor(progress / 10)} />
          <NumberReel step={progress} />
        </div>
        <div className="preloader__caption" aria-hidden="true"><span>THE BMW</span><span>M4 EXPERIENCE</span></div>
      </div>
      <div className="preloader__footnote" aria-hidden="true">AN EXPERIENCE IN MOTION</div>
      {ready && !leaving && <button className="preloader__skip" type="button" onClick={onSkip}>SKIP INTRO <span aria-hidden="true">↗</span></button>}
      {slow && !ready && !leaving && (
        <div className="preloader__slow" role="status">
          <span>Taking longer than expected.</span>
          <button type="button" onClick={onRetry}>Retry loading ↗</button>
        </div>
      )}
    </section>
  );
}
