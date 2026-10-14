/**
 * ZenKuromasu: Procedural Japanese Acoustic Synthesizer
 * Pure Web Audio API — sumi ink brush washes, crisp stone taps,
 * bamboo alignment clacks, and resonant Buddhist temple victory bells.
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.ZenAudio = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let audioCtx = null;
  let isMuted = false;

  // Persisted audio preference
  try {
    const saved = localStorage.getItem('zenkuromasu_sound_muted');
    if (saved !== null) {
      isMuted = saved === 'true';
    }
  } catch (e) {}

  function getAudioContext() {
    if (isMuted) return null;
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function toggleMute() {
    isMuted = !isMuted;
    try {
      localStorage.setItem('zenkuromasu_sound_muted', isMuted ? 'true' : 'false');
    } catch (e) {}
    return isMuted;
  }

  function isAudioMuted() {
    return isMuted;
  }

  /**
   * Sumi ink black stone placement: deep wooden stone thud + brush breath.
   */
  function playStonePlace() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * White garden path confirmed dot: delicate singing pebble tap.
   */
  function playDotPlace() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.05);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Cell clear whoosh: soft bamboo water slide.
   */
  function playCellClear() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.10);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.10);
  }

  /**
   * Clue satisfied: crisp bamboo shishi-odoshi click.
   */
  function playClueSatisfied() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(659.25, t); // E5
    osc1.frequency.exponentialRampToValueAtTime(329.63, t + 0.07);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.50, t); // C6
    osc2.frequency.exponentialRampToValueAtTime(523.25, t + 0.07);

    gain.gain.setValueAtTime(0.10, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.07);
    osc2.stop(t + 0.07);
  }

  /**
   * Gentle wind chime hint sound.
   */
  function playHintChime() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [587.33, 739.99, 880.00]; // D5, F#5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0.06, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.45);
    });
  }

  /**
   * Resonant temple victory bell (Bonshō 梵鐘) with harmonic overtones.
   */
  function playTempleGong() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const partials = [
      { freq: 146.83, gain: 0.28, decay: 3.5 }, // D3 fundamental
      { freq: 293.66, gain: 0.22, decay: 3.0 }, // D4
      { freq: 440.00, gain: 0.16, decay: 2.2 }, // A4
      { freq: 587.33, gain: 0.12, decay: 1.8 }, // D5
      { freq: 739.99, gain: 0.08, decay: 1.4 }, // F#5
      { freq: 880.00, gain: 0.05, decay: 1.0 }  // A5
    ];

    partials.forEach(({ freq, gain: initGain, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(initGain, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + decay);
    });
  }

  return {
    toggleMute,
    isAudioMuted,
    playStonePlace,
    playDotPlace,
    playCellClear,
    playClueSatisfied,
    playHintChime,
    playTempleGong
  };
});
