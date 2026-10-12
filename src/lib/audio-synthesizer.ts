// Web Audio API Synthesizer for ambient focus sounds and attention alert chimes
// Zero external mp3/wav files required — runs natively in all browsers

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private currentSource: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private currentMode: "none" | "alpha" | "white" | "rain" = "none";
  private volume: number = 0.3;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx?.currentTime || 0);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentMode(): "none" | "alpha" | "white" | "rain" {
    return this.currentMode;
  }

  public stopAmbient() {
    if (this.currentSource) {
      try {
        (this.currentSource as AudioBufferSourceNode | OscillatorNode).stop?.();
        this.currentSource.disconnect();
      } catch {
        // ignored
      }
      this.currentSource = null;
    }
    this.currentMode = "none";
  }

  // 432 Hz + 442 Hz Binaural Beat for 10Hz Alpha Focus
  public playAlphaWave() {
    this.stopAmbient();
    this.initContext();
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const merger = this.ctx.createChannelMerger(2);
    this.gainNode = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(216, this.ctx.currentTime); // Root 432 harmonic
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(226, this.ctx.currentTime); // 10 Hz Alpha offset

    osc1.connect(merger, 0, 0);
    osc2.connect(merger, 0, 1);

    this.gainNode.gain.setValueAtTime(this.volume * 0.4, this.ctx.currentTime);
    merger.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    this.currentSource = osc1;
    this.currentMode = "alpha";
  }

  // Soft filtered white noise
  public playWhiteNoise() {
    this.stopAmbient();
    this.initContext();
    if (!this.ctx) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Pinkish filter
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume * 0.35, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    whiteNoise.start();
    this.currentSource = whiteNoise;
    this.currentMode = "white";
  }

  // Soft Rain simulation
  public playRain() {
    this.stopAmbient();
    this.initContext();
    if (!this.ctx) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.5, this.ctx.currentTime);

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime);

    rainSource.connect(filter);
    filter.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    rainSource.start();
    this.currentSource = rainSource;
    this.currentMode = "rain";
  }

  // Pleasant Completion Singing Bowl / Bell
  public playCompletionBell() {
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(528, this.ctx.currentTime); // 528 Hz transformation frequency
    osc.frequency.exponentialRampToValueAtTime(264, this.ctx.currentTime + 1.8);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 2.0);
  }

  // Attention Drift gentle reminder ping
  public playAttentionAlert() {
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.setValueAtTime(330, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }
}

export const soundSynth = new AudioSynthesizer();
