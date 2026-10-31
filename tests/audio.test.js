import test from 'node:test';
import assert from 'node:assert/strict';
import { ExperienceAudio } from '../src/audio.js';

class FakeContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; this.starts = 0; this.voices = []; }
  createOscillator() {
    const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    const voice = { frequency: param, disconnected: false, connect: (node) => node, start: () => { this.starts += 1; }, stop() {}, disconnect() { this.disconnected = true; } };
    this.voices.push(voice);
    return voice;
  }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

function createAudio() {
  const plays = [];
  class FakeAudio {
    constructor(url) { this.url = url; this.currentTime = 0; this.paused = true; this.fail = false; this.volume = 1; }
    play() {
      plays.push({ url: this.url, volume: this.volume });
      if (this.fail) return Promise.reject(new Error('Playback blocked'));
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    end() { this.paused = true; this.onended?.(); }
  }
  return { audio: new ExperienceAudio({ AudioClass: FakeAudio, AudioContextClass: FakeContext }), plays };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test('autoplay rejection is safe and a later gesture starts the actual M4 ignition first', async () => {
  const { audio, plays } = createAudio();
  audio.start.fail = true;
  assert.equal(await audio.tryAutoplay(), false);
  assert.equal(audio.enabled, false);
  assert.equal(audio.idle.paused, true);
  assert.equal(audio.rev.paused, true);
  audio.ready();

  plays.length = 0;
  audio.start.fail = false;
  assert.equal(await audio.enable({ userGesture: true }), true);
  assert.match(plays[0].url, /m4-start\.mp3$/);
  assert.ok(plays[0].volume > 0);
  assert.ok(plays.slice(1).every((play) => play.volume === 0), 'later tracks are only unlocked silently');
  assert.equal(audio.phase, 'starting');
  assert.equal(audio.idle.paused, true);
  assert.equal(audio.context.starts, 0, 'the completion cue must not precede ignition');
  audio.start.end();
  await tick();
  assert.equal(audio.phase, 'idle');
  assert.equal(audio.idle.paused, false);
  assert.equal(audio.context.starts, 1, 'a completion cue deferred during startup is played afterwards');
  audio.dispose();
});

test('permitted autoplay plays startup followed by idle, without a rev', async () => {
  const { audio, plays } = createAudio();
  assert.equal(await audio.tryAutoplay(), true);
  assert.match(plays[0].url, /m4-start\.mp3$/);
  assert.equal(audio.start.paused, false);
  assert.equal(audio.idle.paused, true);
  audio.start.end();
  await tick();
  assert.equal(audio.idle.paused, false);
  assert.equal(audio.rev.paused, true);
  assert.equal(audio.phase, 'idle');
  audio.dispose();
});

test('Ignite and Replay restart the M4 before the real rev and then return to idle', async () => {
  const { audio } = createAudio();
  await audio.enable({ userGesture: true });
  audio.start.end();
  await tick();
  audio.start.currentTime = 2;
  assert.equal(await audio.ignite(), true);
  assert.equal(audio.start.currentTime, 0);
  assert.equal(audio.start.paused, false);
  assert.equal(audio.idle.paused, true);
  assert.equal(audio.rev.paused, true);
  audio.start.end();
  await tick();
  assert.equal(audio.phase, 'rev');
  assert.equal(audio.rev.paused, false);
  assert.equal(audio.rev.volume, 0.42);
  audio.rev.end();
  await tick();
  assert.equal(audio.phase, 'idle');
  assert.equal(audio.idle.paused, false);
  audio.dispose();
});

test('the exhaust is gated by sound consent and cannot interrupt startup', async () => {
  const { audio } = createAudio();
  assert.equal(await audio.exhaust(), false);
  await audio.enable();
  assert.equal(await audio.exhaust(), false);
  assert.equal(audio.start.paused, false);
  audio.start.end();
  await tick();
  assert.equal(await audio.exhaust(), true);
  assert.equal(audio.rev.paused, false);
  assert.equal(audio.idle.volume, 0.035);
  audio.disable();
  assert.equal(audio.start.paused, true);
  assert.equal(audio.rev.paused, true);
  assert.equal(audio.idle.paused, true);
  assert.equal(audio.enabled, false);
});

test('scroll and chapter cues are quiet during startup, throttled and muted when disabled', async () => {
  const { audio } = createAudio();
  await audio.enable({ userGesture: true });
  audio.scroll();
  audio.section('the-face');
  assert.equal(audio.context.starts, 0);
  audio.start.end();
  await tick();
  audio.lastScrollAt = 0;
  audio.scroll();
  audio.scroll();
  assert.equal(audio.context.starts, 1, 'successive scroll events share one cue');
  audio.section('the-profile');
  assert.equal(audio.context.starts, 2, 'a chapter arrival has its own cue');
  audio.disable();
  audio.lastScrollAt = 0;
  audio.scroll();
  audio.section('the-face');
  assert.equal(audio.context.starts, 2);
  audio.dispose();
});

test('muting a pending startup stays muted even when its play promise resolves', async () => {
  const { audio } = createAudio();
  let resolveStart;
  audio.start.play = () => new Promise((resolve) => { resolveStart = resolve; });
  const enabling = audio.enable({ userGesture: true });
  audio.disable();
  resolveStart();
  assert.equal(await enabling, false);
  await tick();
  assert.equal(audio.enabled, false);
  assert.equal(audio.phase, 'off');
  assert.equal(audio.start.paused, true);
  assert.equal(audio.idle.paused, true);
  assert.equal(audio.rev.paused, true);
  audio.start.end();
  assert.equal(audio.phase, 'off');
});

test('an old play promise cannot pause a newer startup', async () => {
  const { audio } = createAudio();
  let resolveOld;
  const normalPlay = audio.start.play.bind(audio.start);
  audio.start.play = () => new Promise((resolve) => { resolveOld = resolve; });
  const old = audio.enable({ userGesture: true });
  audio.disable();
  audio.start.play = normalPlay;
  assert.equal(await audio.enable({ userGesture: true }), true);
  resolveOld();
  assert.equal(await old, true);
  assert.equal(audio.phase, 'starting');
  assert.equal(audio.start.paused, false);
  audio.dispose();
});

test('progress and completion tones wait for startup and are not repeated', async () => {
  const { audio } = createAudio();
  audio.ready();
  assert.equal(audio.context, null);
  await audio.enable({ userGesture: true });
  audio.progress(25);
  audio.progress(50);
  audio.ready();
  assert.equal(audio.context.starts, 0);
  audio.start.end();
  await tick();
  assert.equal(audio.context.starts, 1);
  audio.progress(25);
  audio.progress(30);
  audio.progress(50);
  assert.equal(audio.context.starts, 3);
  audio.dispose();
});

test('mute and replay silence any unfinished cues before a fresh ignition', async () => {
  const { audio } = createAudio();
  await audio.enable({ userGesture: true });
  audio.start.end();
  audio.ready();
  const first = audio.context.voices.at(-1);
  assert.equal(first.disconnected, false);
  await audio.ignite();
  assert.equal(first.disconnected, true);
  audio.start.end();
  audio.ready();
  const second = audio.context.voices.at(-1);
  audio.disable();
  assert.equal(second.disconnected, true);
  await audio.enable({ userGesture: true });
  assert.equal(audio.start.paused, false);
  audio.dispose();
});

test('visibility resumes the track that was playing, including a ducked rev', async () => {
  const { audio } = createAudio();
  await audio.enable({ userGesture: true });
  audio.start.currentTime = 1.5;
  audio.visibility(true);
  assert.equal(audio.start.paused, true);
  audio.visibility(false);
  assert.equal(audio.start.paused, false);
  assert.equal(audio.start.currentTime, 1.5);
  assert.equal(audio.idle.paused, true);
  audio.start.end();
  await tick();
  await audio.exhaust();
  audio.visibility(true);
  assert.equal(audio.idle.paused, true);
  assert.equal(audio.rev.paused, true);
  audio.visibility(false);
  assert.equal(audio.idle.paused, false);
  assert.equal(audio.rev.paused, false);
  assert.equal(audio.idle.volume, 0.035);
  audio.rev.end();
  await tick();
  assert.equal(audio.idle.volume, 0.11);
  audio.dispose();
});

test('a completion cue stays pending if startup ends while the page is hidden', async () => {
  const { audio } = createAudio();
  await audio.enable({ userGesture: true });
  audio.ready();
  audio.visibility(true);
  audio.start.end();
  assert.equal(audio.context.starts, 0);
  assert.equal(audio.idle.paused, true);
  audio.visibility(false);
  assert.equal(audio.context.starts, 1);
  assert.equal(audio.idle.paused, false);
  audio.dispose();
});

test('a blocked rev falls back to idle instead of leaving the sequence stuck', async () => {
  const { audio } = createAudio();
  await audio.ignite();
  audio.rev.fail = true;
  audio.start.end();
  await tick();
  assert.equal(audio.phase, 'idle');
  assert.equal(audio.idle.paused, false);
  audio.dispose();
});
