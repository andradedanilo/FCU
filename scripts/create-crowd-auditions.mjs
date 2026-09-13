import {mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Original formant synthesis: many independently pitched breathy voices,
// restrained collective breath and stadium reflections, without samples.
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
  for (let voice = 0; voice < 72; voice++) {
    const start = Math.floor((cheer ? 0.24 + random() * 0.1 : 0.035 + random() * 0.08) * rate);
    const life = (cheer ? 4.2 : 1.55) + random() * (cheer ? 0.7 : 0.4);
    const base = cheer ? 105 + random() * 235 : 75 + random() * 65;
    const pan = random();
    const volume = 0.5 + random() * 0.5;
    const wobble = random() * Math.PI * 2;
    const scale = 0.85 + random() * 0.3;
    const formants = (cheer ? [550, 1900, 2600] : [380, 720, 2300]).map((frequency, index) => {
      const radius = Math.exp(-Math.PI * [180, 250, 350][index] / rate);
      return {a: 2 * radius * Math.cos(2 * Math.PI * frequency * scale / rate),
        radius, b: radius * radius, gain: 1 - radius, first: 0, second: 0};
    });
    let phase = random();
    let breath = 0;
    for (let j = 0; j < life * rate && j + start < length; j++) {
      const t = j / rate;
      const progress = t / life;
      const pitch = base * (cheer ? 1 + 0.22 * Math.sin(progress * Math.PI) : 0.7 + 0.65 * Math.exp(-t / 0.45))
        * (1 + 0.025 * Math.sin(2 * Math.PI * (4.1 + voice % 4) * t + wobble));
      if (j % 128 === 0) {
        // Cheer opens from an 'eh' toward 'ah'; disappointment closes to 'oo'.
        const transition = Math.min(1, t / (cheer ? 0.35 : 0.65));
        const frequencies = cheer ? [550 + 250 * transition, 1900 - 650 * transition, 2600]
          : [380 - 100 * transition, 720 - 110 * transition, 2300];
        for (let f = 0; f < formants.length; f++) {
          formants[f].a = 2 * formants[f].radius * Math.cos(2 * Math.PI * frequencies[f] * scale / rate);
        }
      }
      phase = (phase + pitch / rate) % 1;
      // Soft glottal pulses retain human-like harmonics without a buzzy sawtooth.
      const glottal = phase < 0.38 ? Math.sin(Math.PI * phase / 0.38) ** 2 : 0;
      const noise = random() * 2 - 1;
      breath += 0.25 * (noise - breath);
      const source = (glottal - 0.19) + breath * 0.035;
      let voiced = 0;
      for (let f = 0; f < formants.length; f++) {
        const filter = formants[f];
        const value = source * filter.gain + filter.a * filter.first - filter.b * filter.second;
        filter.second = filter.first;
        filter.first = value;
        voiced += value * [1, 0.65, 0.2][f];
      }
      const attack = Math.min(1, t / (cheer ? 0.045 : 0.085));
      const release = cheer ? Math.min(1, (life - t) / 0.65) : Math.exp(-Math.max(0, t - 0.48) / 0.3);
      const flutter = cheer ? 0.86 + 0.14 * Math.sin(t * (8 + voice % 7) + wobble) : 1;
      const sample = voiced * volume * attack * release * flutter;
      left[j + start] += sample * Math.sqrt(1 - pan);
      right[j + start] += sample * Math.sqrt(pan);
    }
  }
  // Only a brief, quiet band-limited intake: sustained noise masked the voices
  // in revision 2 and was rejected as microphone wind. No rumble bed remains.
  for (const channel of [left, right]) {
    let slow = 0;
    let fast = 0;
    for (let i = 0; i < Math.round(0.24 * rate); i++) {
      const noise = random() * 2 - 1;
      slow += 0.07 * (noise - slow);
      fast += 0.3 * (noise - fast);
      const envelope = Math.sin(Math.PI * i / (0.24 * rate)) ** 2;
      channel[i] += (fast - slow) * 0.12 * envelope;
    }
  }
  const dryLeft = left.slice();
  const dryRight = right.slice();
  // Diffuse cross-channel outdoor reflections, with no conspicuous single echo.
  for (let tap = 0; tap < 32; tap++) {
    const delay = Math.round((0.045 + tap * 0.027 + random() * 0.018) * rate);
    const gain = (cheer ? 0.07 : 0.035) * Math.exp(-tap / (cheer ? 12 : 7));
    for (let i = delay; i < length; i++) {
      left[i] += dryRight[i - delay] * gain;
      right[i] += dryLeft[i - delay] * gain;
    }
  }
  let peak = 0;
  let energy = 0;
  for (const channel of [left, right]) {
    let previousInput = 0;
    let previousOutput = 0;
    for (let i = 0; i < length; i++) {
      const value = channel[i] - previousInput + 0.995 * previousOutput;
      previousInput = channel[i]; previousOutput = value;
      channel[i] = value * Math.min(1, i / 480, (length - 1 - i) / 4800);
      peak = Math.max(peak, Math.abs(channel[i]));
      energy += channel[i] ** 2;
    }
  }
  // Limit both peak and average level; peak-only normalization made the dense
  // previous audition excessively loud even though it never clipped.
  const rms = Math.sqrt(energy / (length * 2));
  const gain = Math.min(10 ** (-12 / 20) / peak, 10 ** (-25 / 20) / rms);
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
    title: `FCU original crowd ${kind}`, revision: 3,
    origin: 'Original mathematical voice, restrained breath and reflection synthesis; no recordings or external samples.',
    generator: 'scripts/create-crowd-auditions.mjs', seed: initialSeed,
    sampleRate: rate, channels: 2, bitsPerSample: 16, durationSeconds: duration,
    peakDbfs: 20 * Math.log10(peak * gain), rmsDbfs: 20 * Math.log10(rms * gain), sha256: createHash('sha256').update(wav).digest('hex'),
    status: 'Stylized crowd audition; listening acceptance pending; not installed in match playback.'
  }, null, 2) + '\n');
  console.log(`Created ${kind}.wav: ${duration}s stereo PCM16 at ${rate} Hz.`);
}

render('goal-cheer', 6, 13092027);
render('crowd-disappointment', 3.2, 13092028);
