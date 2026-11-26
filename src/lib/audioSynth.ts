// Pure Web Audio API ambient wedding soundscapes + optional custom URL audio player.
// Zero external MP3 dependencies required for the 4 built-in luxury presets.

export type MusicPresetId = 'hijaz_oud' | 'palace_piano' | 'golden_harp' | 'oriental_pad' | string;

interface PresetScale {
  freqs: number[];
  stepMs: number;
  wave: OscillatorType;
  attack: number;
  decay: number;
  volume: number;
}

const PRESET_SCALES: Record<string, PresetScale> = {
  // Hijaz maqam gentle plucked motif (D, Eb, F#, G, A, Bb, C, D5)
  hijaz_oud: {
    freqs: [293.66, 311.13, 369.99, 392.0, 440.0, 392.0, 369.99, 311.13, 293.66, 440.0, 466.16, 440.0],
    stepMs: 680,
    wave: 'triangle',
    attack: 0.02,
    decay: 0.95,
    volume: 0.09,
  },
  // Warm classical Cmaj9 / Fmaj7 piano arpeggio
  palace_piano: {
    freqs: [261.63, 329.63, 392.0, 493.88, 523.25, 493.88, 392.0, 329.63, 349.23, 440.0, 523.25, 659.25],
    stepMs: 740,
    wave: 'sine',
    attack: 0.03,
    decay: 1.35,
    volume: 0.1,
  },
  // Dreamy golden harp cascade
  golden_harp: {
    freqs: [392.0, 493.88, 587.33, 739.99, 783.99, 659.25, 587.33, 493.88, 440.0, 523.25, 659.25, 783.99],
    stepMs: 520,
    wave: 'sine',
    attack: 0.015,
    decay: 1.45,
    volume: 0.08,
  },
  // Majestic Nahawand soft ambient pad
  oriental_pad: {
    freqs: [261.63, 311.13, 392.0, 523.25, 415.3, 392.0, 349.23, 311.13],
    stepMs: 1100,
    wave: 'triangle',
    attack: 0.18,
    decay: 1.9,
    volume: 0.07,
  },
};

export class LuxuryAudioPlayer {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private stepIndex = 0;
  private playing = false;

  public isPlaying(): boolean {
    return this.playing;
  }

  public async start(preset: MusicPresetId, customUrl?: string): Promise<boolean> {
    this.stop();

    if (customUrl && customUrl.trim()) {
      try {
        const audio = new Audio(customUrl.trim());
        audio.loop = true;
        audio.volume = 0.45;
        await audio.play();
        this.htmlAudio = audio;
        this.playing = true;
        return true;
      } catch {
        // Fallback to synthesized preset if custom audio URL cannot be played
      }
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      const scale = PRESET_SCALES[preset] ?? PRESET_SCALES.hijaz_oud;
      this.stepIndex = 0;
      this.playing = true;

      const triggerNote = () => {
        if (!this.playing || !this.ctx) return;
        const now = this.ctx.currentTime;
        const freq = scale.freqs[this.stepIndex % scale.freqs.length];
        this.stepIndex += 1;

        const osc = this.ctx.createOscillator();
        const harmonic = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = scale.wave;
        osc.frequency.setValueAtTime(freq, now);

        harmonic.type = 'sine';
        harmonic.frequency.setValueAtTime(freq * 2, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(scale.volume, now + scale.attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + scale.decay);

        const harmGain = this.ctx.createGain();
        harmGain.gain.setValueAtTime(0.18, now);

        osc.connect(filter);
        harmonic.connect(harmGain);
        harmGain.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        harmonic.start(now);
        osc.stop(now + scale.decay + 0.05);
        harmonic.stop(now + scale.decay + 0.05);
      };

      triggerNote();
      this.timer = window.setInterval(triggerNote, scale.stepMs);
      return true;
    } catch {
      this.playing = false;
      return false;
    }
  }

  public stop(): void {
    this.playing = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.currentTime = 0;
      this.htmlAudio = null;
    }
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }
}

export const MUSIC_PRESET_OPTIONS = [
  { id: 'hijaz_oud', labelAr: 'عود حجازي هادئ', labelEn: 'Hijaz Oud Serenity' },
  { id: 'palace_piano', labelAr: 'بيانو القصر الكلاسيكي', labelEn: 'Palace Classical Piano' },
  { id: 'golden_harp', labelAr: 'أوتار القيثارة الذهبية', labelEn: 'Golden Harp Reverie' },
  { id: 'oriental_pad', labelAr: 'زفة شرقية ناعمة', labelEn: 'Soft Oriental Zaffa' },
] as const;
