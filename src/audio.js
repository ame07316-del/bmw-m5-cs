const baseUrl = import.meta.env?.BASE_URL || '/';
const IDLE_VOLUME = 0.11;
const REV_VOLUME = 0.42;

/** Small, replaceable audio layer for the opening screen and later chapters. */
export class ExperienceAudio {
  constructor({ AudioClass = globalThis.Audio, AudioContextClass } = {}) {
    this.start = new AudioClass(`${baseUrl}audio/m4-start.mp3`);
    this.idle = new AudioClass(`${baseUrl}audio/m4-idle.mp3`);
    this.rev = new AudioClass(`${baseUrl}audio/m4-rev.mp3`);
    this.start.preload = 'auto';
    this.start.volume = 0.55;
    this.idle.loop = true;
    this.idle.preload = 'auto';
    this.idle.volume = IDLE_VOLUME;
    this.rev.preload = 'auto';
    this.rev.volume = REV_VOLUME;
    this.enabled = false;
    this.phase = 'off';
    this.hidden = false;
    this.revAfterStart = false;
    this.idleUnderRev = false;
    this.pendingReady = false;
    this.context = null;
    this.tones = new Set();
    this.AudioContextClass = AudioContextClass || globalThis.AudioContext || globalThis.webkitAudioContext;
    this.operation = 0;
    this.lastProgressStep = -1;
    this.lastScrollAt = 0;
    this.start.onended = () => {
      if (!this.enabled || this.phase !== 'starting') return;
      if (this.revAfterStart) {
        this.revAfterStart = false;
        void this.playRev(this.operation);
        this.flushReady();
      } else {
        this.startIdle();
      }
    };
    this.rev.onended = () => {
      if (this.enabled && this.phase === 'rev') this.startIdle();
    };
  }

  // Unlock the later tracks inside the same gesture without making them audible.
  // This also helps browsers that grant playback permission per media element.
  prepareTrack(track, volume, operation) {
    track.volume = 0;
    try {
      Promise.resolve(track.play()).then(() => {
        if (operation !== this.operation) {
          if (this.phase === 'off') track.pause();
          return;
        }
        if (this.phase === 'off' || this.phase === 'starting' ||
            (track === this.idle && this.phase === 'rev' && !this.idleUnderRev)) {
          track.pause();
          track.currentTime = 0;
        }
        track.volume = track === this.idle && this.idleUnderRev ? 0.035 : volume;
      }).catch(() => {
        if (operation === this.operation) track.volume = volume;
      });
    } catch {
      track.volume = volume;
    }
  }

  async enable({ userGesture = false, revAfterStart = false } = {}) {
    const operation = ++this.operation;
    this.silenceTones();
    this.start.pause();
    this.idle.pause();
    this.rev.pause();
    this.start.currentTime = 0;
    this.idle.volume = IDLE_VOLUME;
    this.rev.volume = REV_VOLUME;
    this.phase = 'starting';
    this.revAfterStart = revAfterStart;
    this.idleUnderRev = false;

    if (userGesture) {
      this.enabled = true;
      try {
        if (this.AudioContextClass) this.context ||= new this.AudioContextClass();
        if (this.context?.state === 'suspended') this.context.resume().catch(() => {});
      } catch {
        // The recorded audio can still play without Web Audio tones.
      }
    }
    try {
      // The real ignition is always the first audible sound, including after a mute.
      const playback = this.start.play();
      if (userGesture) {
        this.prepareTrack(this.idle, IDLE_VOLUME, operation);
        this.prepareTrack(this.rev, REV_VOLUME, operation);
      }
      await playback;
      if (operation !== this.operation) {
        if (this.phase === 'off') this.start.pause();
        return this.enabled;
      }
      this.enabled = true;
      if (this.hidden) this.start.pause();
      return true;
    } catch {
      if (operation !== this.operation) return this.enabled;
      // Pausing a pending play as a tab hides can reject it; resume on return.
      if (this.hidden && this.enabled) return true;
      this.enabled = false;
      this.phase = 'off';
      this.start.pause();
      this.idle.pause();
      this.rev.pause();
      this.idle.volume = IDLE_VOLUME;
      this.rev.volume = REV_VOLUME;
      return false;
    }
  }

  disable() {
    this.operation += 1;
    this.enabled = false;
    this.phase = 'off';
    this.revAfterStart = false;
    this.idleUnderRev = false;
    this.silenceTones();
    this.start.pause();
    this.idle.pause();
    this.rev.pause();
    this.idle.volume = IDLE_VOLUME;
    this.rev.volume = REV_VOLUME;
    if (this.context?.state === 'running') this.context.suspend().catch(() => {});
  }

  async toggle() {
    if (this.enabled) {
      this.disable();
      return false;
    }
    return this.enable({ userGesture: true });
  }

  // Browsers may block this until the visitor interacts; callers handle false.
  tryAutoplay() {
    return this.enable();
  }

  // A deliberate replay starts the M4, then lets its real rev sound play.
  ignite() {
    return this.enable({ userGesture: true, revAfterStart: true });
  }

  startIdle() {
    if (!this.enabled) return;
    this.phase = 'idle';
    this.idleUnderRev = false;
    this.idle.volume = IDLE_VOLUME;
    if (!this.hidden) {
      try {
        Promise.resolve(this.idle.play()).then(() => {
          if (!this.enabled || this.phase === 'starting' ||
              (this.phase === 'rev' && !this.idleUnderRev)) this.idle.pause();
        }).catch(() => {});
      } catch {
        // The completion cue and UI can still work without the idle loop.
      }
    }
    this.flushReady();
  }

  silenceTones() {
    for (const { oscillator, envelope } of this.tones) {
      try { oscillator.stop(); } catch { /* Already ended. */ }
      try { oscillator.disconnect?.(); } catch { /* Already disconnected. */ }
      try { envelope.disconnect?.(); } catch { /* Already disconnected. */ }
    }
    this.tones.clear();
  }

  tone(frequency = 180, duration = 0.12, volume = 0.025) {
    if (!this.enabled || this.hidden || this.phase === 'starting' || !this.AudioContextClass) return;
    try {
      this.context ||= new this.AudioContextClass();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + duration);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(volume, now + 0.02);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(envelope).connect(this.context.destination);
      const voice = { oscillator, envelope };
      this.tones.add(voice);
      oscillator.onended = () => {
        this.tones.delete(voice);
        try { oscillator.disconnect?.(); envelope.disconnect?.(); } catch { /* Already disconnected. */ }
      };
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch {
      // Sound is optional: a missing audio API must never block the experience.
    }
  }

  progress(value) {
    const step = Math.floor(value / 25);
    if (this.enabled && !this.hidden && this.phase !== 'starting' &&
        step > this.lastProgressStep && step > 0 && value < 100) {
      this.lastProgressStep = step;
      this.tone(130 + step * 20, 0.11, 0.012);
    }
  }

  ready() {
    this.pendingReady = true;
    this.flushReady();
  }

  flushReady() {
    if (!this.pendingReady || !this.enabled || this.hidden || this.phase === 'starting') return;
    this.pendingReady = false;
    this.tone(240, 0.28, 0.028);
  }

  async playRev(operation) {
    this.rev.pause();
    this.rev.currentTime = 0;
    this.idleUnderRev = !this.idle.paused;
    if (this.idleUnderRev) this.idle.volume = 0.035;
    this.phase = 'rev';
    if (this.hidden) return true;
    try {
      await this.rev.play();
      if (operation !== this.operation || !this.enabled || this.phase !== 'rev') {
        if (!this.enabled || this.phase !== 'rev') this.rev.pause();
        return false;
      }
      if (this.hidden) this.rev.pause();
      return true;
    } catch {
      if (operation === this.operation && this.enabled && this.phase === 'rev') {
        if (this.hidden) return true;
        this.startIdle();
      }
      return false;
    }
  }

  async exhaust() {
    // Do not cut off the ignition if a chapter arrives while it plays.
    if (!this.enabled || this.phase === 'starting') return false;
    return this.playRev(++this.operation);
  }

  // Subtle, throttled cues follow the visitor through the guided tour.
  scroll() {
    const now = Date.now();
    if (now - this.lastScrollAt < 650) return;
    this.lastScrollAt = now;
    this.tone(105, 0.18, 0.012);
  }

  section(name) {
    if (name === 'exhaust') return this.exhaust();
    this.tone(name === 'interior' ? 300 : 210, 0.2, 0.018);
  }

  visibility(hidden) {
    this.hidden = hidden;
    if (hidden) {
      this.start.pause();
      this.idle.pause();
      this.rev.pause();
      return;
    }
    if (!this.enabled) return;
    try {
      if (this.phase === 'starting') {
        Promise.resolve(this.start.play()).catch(() => {});
      } else if (this.phase === 'rev') {
        if (this.idleUnderRev) Promise.resolve(this.idle.play()).catch(() => {});
        Promise.resolve(this.rev.play()).catch(() => {
          if (this.enabled && this.phase === 'rev' && !this.hidden) this.startIdle();
        });
      } else if (this.phase === 'idle') {
        Promise.resolve(this.idle.play()).catch(() => {});
      }
    } catch {
      // Returning to the page should never block the visual experience.
    }
    this.flushReady();
  }

  dispose() {
    this.disable();
    this.start.onended = null;
    this.rev.onended = null;
    this.context?.close().catch(() => {});
  }
}
