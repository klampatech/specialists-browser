/**
 * Tiny Web Audio synthesizer for game sounds.
 *
 * No external audio files — generates sounds procedurally with the
 * Web Audio API. This gives us instant feedback (gunshots, hits, hurt)
 * without needing to ship WAV files.
 *
 * Sounds:
 *   - gunshot: short white-noise burst + low frequency thump
 *   - hit:     short high-frequency tick
 *   - hurt:    low-pitched distorted groan
 *   - reload:  mechanical click
 *   - pickup:  pleasant ding
 *   - death:   low descending tone
 */

export class GameAudio {
  private ctx: AudioContext;
  private master: GainNode;
  private muted = false;
  /** Volume 0.0 - 1.0. */
  private volume = 0.5;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.master.gain.value = this.volume;
  }

  /** Resume the audio context (needed after user interaction). */
  resume(): void {
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Gunshot — sharp transient with a punchy thump.
   * duration: 80ms total
   */
  gunshot(): void {
    if (this.muted) return;
    const t = this.ctx.currentTime;
    this.resume();

    // White noise burst (the "crack")
    const noiseBuffer = this.makeNoise(0.1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 4000;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    noise.connect(noiseFilter).connect(noiseGain).connect(this.master);
    noise.start(t);
    noise.stop(t + 0.1);

    // Low thump (the "boom")
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.06);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(oscGain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Hit marker — short tick when you hit a target.
   * duration: 30ms
   */
  hit(): void {
    if (this.muted) return;
    const t = this.ctx.currentTime;
    this.resume();

    const osc = this.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.exponentialRampToValueAtTime(1000, t + 0.04);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * Hurt sound — played when player takes damage.
   * duration: 200ms
   */
  hurt(): void {
    if (this.muted) return;
    const t = this.ctx.currentTime;
    this.resume();

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Reload — mechanical click.
   * duration: 80ms
   */
  reload(): void {
    if (this.muted) return;
    const t = this.ctx.currentTime;
    this.resume();

    // Two clicks (mag out, mag in)
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 800;
      const gain = this.ctx.createGain();
      const start = t + i * 0.04;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.03);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 0.04);
    }
  }

  /**
   * Pickup — pleasant ding.
   */
  pickup(): void {
    if (this.muted) return;
    const t = this.ctx.currentTime;
    this.resume();

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.1);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  /**
   * Death — low descending tone.
   */
  death(): void {
    if (this.muted) return;
    const t = this.ctx.currentTime;
    this.resume();

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.6);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.62);
  }

  /**
   * Enemy hurt — short low thud when you damage a bot.
   */
  enemyHurt(): void {
    if (this.muted) return;
    const t = this.ctx.currentTime;
    this.resume();

    const noiseBuffer = this.makeNoise(0.05);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(t);
    noise.stop(t + 0.07);
  }

  private makeNoise(durationSec: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const samples = Math.floor(sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    return buffer;
  }
}
