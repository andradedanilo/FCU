import {mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Original formant synthesis: many independently pitched breathy voices,
// scattered handclaps and stadium reflections, without recorded samples.
const rate = 48000;
const output = 'assets/original/audio';
mkdirSync(output, {recursive: true});

function render(kind, duration, initialSeed) {
  let seed = initialSeed;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const length = Math.round(duration * rate);
  const left = new Float64Array(length);
  const right = new Float64Array(length);
  const cheer = kind === 'goal-cheer';
  for (let voice = 0; voice < 128; voice++) {
    const start = Math.floor((0.025 + random() * (cheer ? 0.42 : 0.22)) * rate);
    const life = (cheer ? 2.5 : 1.25) + random() * (cheer ? 1.35 : 0.7);
    const base = 95 + random() * 150;
    const pan = random();
    const volume = 0.5 + random() * 0.5;
    const wobble = random() * Math.PI * 2;
    const scale = 0.85 + random() * 0.3;
    const formants = (cheer ? [740, 1180, 2550] : [470, 850, 2400]).map((frequency, index) => {
      const radius = Math.exp(-Math.PI * [100, 140, 220][index] / rate);
      return {a: 2 * radius * Math.cos(2 * Math.PI * frequency * scale / rate),
        b: radius * radius, gain: 1 - radius, first: 0, second: 0};
    });
    let phase = random();
    let breath = 0;
    for (let j = 0; j < life * rate && j + start < length; j++) {
      const t = j / rate;
      const progress = t / life;
      const pitch = base * (cheer ? 1 + 0.17 * Math.sin(progress * Math.PI) : 1.16 - 0.36 * progress)
        * (1 + 0.014 * Math.sin(2 * Math.PI * 5.3 * t + wobble));
      phase = (phase + pitch / rate) % 1;
      // Soft glottal pulses retain human-like harmonics without a buzzy sawtooth.
      const glottal = phase < 0.38 ? Math.sin(Math.PI * phase / 0.38) ** 2 : 0;
      const noise = random() * 2 - 1;
      breath += 0.25 * (noise - breath);
      const source = glottal - 0.19 + breath * 0.65;
      let voiced = 0;
      for (let f = 0; f < formants.length; f++) {
        const filter = formants[f];
        const value = source * filter.gain + filter.a * filter.first - filter.b * filter.second;
        filter.second = filter.first;
        filter.first = value;
        voiced += value * [1, 0.65, 0.2][f];
      }
      const attack = Math.min(1, t / (cheer ? 0.14 : 0.07));
      const release = Math.min(1, (life - t) / (cheer ? 0.8 : 0.55));
      const flutter = cheer ? 0.76 + 0.24 * Math.sin(t * (8 + voice % 7) + wobble) : 1;
      const sample = voiced * volume * attack * release * flutter;
      left[j + start] += sample * Math.sqrt(1 - pan);
      right[j + start] += sample * Math.sqrt(pan);
    }
  }
  if (cheer) {
    for (let clap = 0; clap < 170; clap++) {
      const start = Math.floor((0.35 + random() * 3.25) * rate);
      const pan = random();
      const gain = 0.12 + random() * 0.28;
      let previous = 0;
      for (let j = 0; j < rate * 0.025 && start + j < length; j++) {
        const noise = random() * 2 - 1;
        const sample = (noise - previous) * gain * Math.exp(-j / (rate * 0.004)) * Math.min(1, j / 16);
        previous = noise;
        left[start + j] += sample * (1 - pan);
        right[start + j] += sample * pan;
      }
    }
  }
  const dryLeft = left.slice();
  const dryRight = right.slice();
  // Diffuse cross-channel outdoor reflections, with no conspicuous single echo.
  for (let tap = 0; tap < 32; tap++) {
    const delay = Math.round((0.045 + tap * 0.027 + random() * 0.018) * rate);
    const gain = 0.09 * Math.exp(-tap / 12);
    for (let i = delay; i < length; i++) {
      left[i] += dryRight[i - delay] * gain;
      right[i] += dryLeft[i - delay] * gain;
    }
  }
  let peak = 0;
  for (const channel of [left, right]) {
    let previousInput = 0;
    let previousOutput = 0;
    for (let i = 0; i < length; i++) {
      const value = channel[i] - previousInput + 0.995 * previousOutput;
      previousInput = channel[i]; previousOutput = value;
      channel[i] = value * Math.min(1, i / 480, (length - 1 - i) / 4800);
      peak = Math.max(peak, Math.abs(channel[i]));
    }
  }
  const gain = 10 ** (-1.5 / 20) / peak;
  const wav = Buffer.alloc(44 + length * 4);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(length * 4, 40);
  for (let i = 0; i < length; i++) {
    wav.writeInt16LE(Math.round(left[i] * gain * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(right[i] * gain * 32767), 46 + i * 4);
  }
  writeFileSync(`${output}/${kind}.wav`, wav);
  writeFileSync(`${output}/${kind}.json`, JSON.stringify({
    title: `FCU original crowd ${kind}`, origin: 'Original mathematical voice, clap and reflection synthesis; no recordings or external samples.',
    generator: 'scripts/create-crowd-auditions.mjs', seed: initialSeed,
    sampleRate: rate, channels: 2, bitsPerSample: 16, durationSeconds: duration,
    peakDbfs: -1.5, sha256: createHash('sha256').update(wav).digest('hex'),
    status: 'Stylized crowd audition; listening acceptance pending; not installed in match playback.'
  }, null, 2) + '\n');
  console.log(`Created ${kind}.wav: ${duration}s stereo PCM16 at ${rate} Hz.`);
}

render('goal-cheer', 5, 13092027);
render('crowd-disappointment', 3.2, 13092028);
