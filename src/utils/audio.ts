// Web Audio API Medieval Synthesizer for Kingdoms Rise 2D
// Synthesizes atmospheric, 8-bit, and medieval-themed audio effects on the fly.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSound(type: "click" | "upgrade" | "complete" | "march" | "battle" | "victory" | "defeat" | "recruit") {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case "click": {
        // Quick gentle medieval harp pluck
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      case "upgrade": {
        // Rising synth swell indicating building/research launch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
        break;
      }
      case "complete": {
        // Double-pluck brass chord for progress completion
        const notes = [329.63, 392.00, 523.25]; // E4, G4, C5 (C Major)
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);

          gain.gain.setValueAtTime(0.08, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.4);

          // Add a low-pass filter to make it sound warmer/brassier
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1200, now);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.45);
        });
        break;
      }
      case "recruit": {
        // Recruiting command fanfare: military trumpet G4 -> C5
        const notes = [392.00, 523.25]; // G4, C5
        const timing = [0, 0.15];
        const durations = [0.12, 0.4];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + timing[i]);

          gain.gain.setValueAtTime(0.12, now + timing[i]);
          gain.gain.exponentialRampToValueAtTime(0.001, now + timing[i] + durations[i]);

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(2000, now);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + timing[i]);
          osc.stop(now + timing[i] + durations[i] + 0.05);
        });
        break;
      }
      case "march": {
        // Periodic soft shuffling sand footstep noise
        // Generate buffer with random noise for a soft footstep
        const bufferSize = ctx.sampleRate * 0.15; // 150ms step
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(400, now);
        filter.Q.setValueAtTime(2.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noiseNode.start(now);
        noiseNode.stop(now + 0.16);
        break;
      }
      case "battle": {
        // Sharp metallic sword-clash sound (metallic high freq + decay white noise)
        // Oscillator 1: High metallic ring
        const osc = ctx.createOscillator();
        const gainOsc = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(2200, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);

        gainOsc.gain.setValueAtTime(0.08, now);
        gainOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gainOsc);
        gainOsc.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);

        // Noise burst: metal scrap/impact
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = "bandpass";
        bpFilter.frequency.setValueAtTime(1500, now);
        bpFilter.Q.setValueAtTime(3.0, now);

        const gainNoise = ctx.createGain();
        gainNoise.gain.setValueAtTime(0.12, now);
        gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        noise.connect(bpFilter);
        bpFilter.connect(gainNoise);
        gainNoise.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.11);
        break;
      }
      case "victory": {
        // Uplifting major chord melody sweep
        const melody = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
        melody.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + index * 0.08);

          gain.gain.setValueAtTime(0.1, now + index * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.5);

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1500, now);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + index * 0.08);
          osc.stop(now + index * 0.08 + 0.6);
        });
        break;
      }
      case "defeat": {
        // Sad, decaying dissonance
        const notes = [196.00, 185.00, 146.83]; // G3, F#3, D3 (Sad descending minor)
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          gain.gain.setValueAtTime(0.12, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.7);
        });
        break;
      }
    }
  } catch (err) {
    // Web Audio blocked or unsupported
    console.warn("Audio Context failed to play sound", err);
  }
}
