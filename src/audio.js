/**
 * ZenKuromasu - Procedural Japanese Web Audio Synthesizer
 * 
 * Synthesizes pure procedural acoustic tones without any external audio files:
 * - Sumi stone placement clack & brush whisper
 * - Clear water pebble dot placement
 * - Gentle shoji paper sliding clearing rustle
 * - Bamboo shishi-odoshi clue satisfaction chime
 * - Low wooden block conflict warning
 * - Authentic Japanese Bonshō (梵鐘) temple victory gong (108 Hz fundamental + overtones)
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.enabled = true;

    // Load sound preference from localStorage
    try {
      const saved = localStorage.getItem('zenkuromasu_sound');
      if (saved !== null) {
        this.enabled = JSON.parse(saved);
      }
    } catch (e) {
      this.enabled = true;
    }
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('zenkuromasu_sound', JSON.stringify(this.enabled));
    } catch (e) {}
    if (this.enabled) {
      this.init();
      this.playDotPlace();
    }
    return this.enabled;
  }

  isSoundEnabled() {
    return this.enabled;
  }

  /**
   * Deep tactile sumi ink stone placement
   */
  playStonePlace() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Resonant wooden/stone body thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);

    // Sumi ink brush texture (noise burst through bandpass filter)
    const bufferSize = this.ctx.sampleRate * 0.06;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(2.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    whiteNoise.start(t);
  }

  /**
   * Crisp white dot / water pebble tap
   */
  playDotPlace() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Soft paper sliding / cell clear sound
   */
  playCellClear() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.06);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Bamboo shishi-odoshi clue satisfaction chime
   */
  playClueSatisfied() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Harmonic Japanese pentatonic double-tone (E5 659.25 Hz & B5 987.77 Hz)
    const freqs = [659.25, 987.77];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.04);

      gain.gain.setValueAtTime(0.2, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.4);
    });
  }

  /**
   * Soft wooden block conflict warning (two adjacent black stones)
   */
  playConflictWarning() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(130, t);

    // Warm low-pass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Sacred Japanese Bonshō (梵鐘) temple bell victory gong
   * Tuned with the sacred 108 Hz fundamental and tranquil decaying overtones
   */
  playVictoryGong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Bonshō acoustic partials: fundamental and authentic inharmonic overtones
    const partials = [
      { f: 108, gain: 0.55, decay: 4.5 },
      { f: 216, gain: 0.35, decay: 3.8 },
      { f: 328, gain: 0.28, decay: 3.2 },
      { f: 440, gain: 0.22, decay: 2.6 },
      { f: 652, gain: 0.16, decay: 1.8 },
      { f: 880, gain: 0.10, decay: 1.2 }
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.f, t);

      // Natural acoustic bell strike swell and long peaceful decay
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(p.gain, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + p.decay + 0.1);
    });
  }
}

// Global instance for browser
const sound = new SoundSynthesizer();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SoundSynthesizer, sound };
}
