import {mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Original offline synthesis. No recordings, downloaded samples or simulation RNG.
const rate = 48000;
const duration = 0.48;
const samples = new Float64Array(Math.round(rate * duration));
let seed = 13092026;
let low = 0;
let mid = 0;
let phase = 0;
for (let i = 0; i < samples.length; i++) {
  const t = i / rate;
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  const noise = (seed >>> 0) / 2147483648 - 1;
  low += 0.055 * (noise - low);
  mid += 0.34 * (noise - mid);
  // A compressed air cavity drops quickly in pitch; inharmonic shell modes
  // and a brief broadband boot contact keep the body from sounding like a sine beep.
  phase += 2 * Math.PI * (76 + 64 * Math.exp(-t / 0.012)) / rate;
  const body = 0.88 * Math.sin(phase) * Math.exp(-t / 0.062);
  const shell = (0.27 * Math.sin(2 * Math.PI * 183 * t + 0.4)
    + 0.16 * Math.sin(2 * Math.PI * 317 * t)) * Math.exp(-t / 0.023);
  const contact = 1.15 * (mid - low) * Math.exp(-t / 0.009);
  const skin = 0.6 * low * Math.exp(-t / 0.035);
  const envelope = Math.min(1, t / 0.00065) * Math.min(1, (duration - t) / 0.035);
  samples[i] = Math.tanh(1.35 * (body + shell + contact + skin)) * envelope;
}
const peak = samples.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
const gain = 10 ** (-1.2 / 20) / peak;
const wav = Buffer.alloc(44 + samples.length * 2);
wav.write('RIFF');
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(samples.length * 2, 40);
for (let i = 0; i < samples.length; i++) wav.writeInt16LE(Math.round(samples[i] * gain * 32767), 44 + i * 2);
const output = 'assets/original/audio';
mkdirSync(output, {recursive: true});
writeFileSync(`${output}/deep-ball-kick.wav`, wav);
writeFileSync(`${output}/deep-ball-kick.json`, JSON.stringify({
  title: 'FCU deep ball kick audition',
  origin: 'Original mathematical synthesis created for FCU; no external recordings or samples.',
  generator: 'scripts/create-kick-audition.mjs',
  seed: 13092026,
  sampleRate: rate,
  channels: 1,
  bitsPerSample: 16,
  durationSeconds: duration,
  peakDbfs: -1.2,
  sha256: createHash('sha256').update(wav).digest('hex'),
  status: 'Audition only; owner listening acceptance pending; not installed in match playback.'
}, null, 2) + '\n');
console.log(`Created ${output}/deep-ball-kick.wav (${duration}s, ${rate} Hz, mono PCM16, -1.2 dBFS peak).`);
