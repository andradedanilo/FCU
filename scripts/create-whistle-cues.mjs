import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';

// Explicit authoring command. Use the preserved recording, never re-trim a live cue.
const sourcePath='assets/original/audio/referee-whistle-source.wav';
const source=readFileSync(sourcePath);
assert.equal(source.toString('ascii',0,4),'RIFF');
assert.equal(source.toString('ascii',8,16),'WAVEfmt ');
assert.equal(source.readUInt32LE(16),16);
assert.equal(source.readUInt16LE(20),1);
assert.equal(source.readUInt16LE(22),1);
assert.equal(source.readUInt32LE(24),48000);
assert.equal(source.readUInt16LE(34),16);
assert.equal(source.toString('ascii',36,40),'data');
const rate=48000;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const cues=[
  {file:'whistle.wav',gain:1,segments:[{at:0,start:0.15,duration:1.65,fadeIn:.008,fadeOut:.2},{at:1.45,start:.35,duration:1.55,fadeIn:.2,fadeOut:.06}]},
  {file:'tackle.wav',gain:1.12,segments:[{at:0,start:.85,duration:.72,fadeIn:.002,fadeOut:.03}]},
  {file:'fulltime.wav',gain:1,segments:[{at:0,start:0.1,duration:0.18},{at:0.32,start:0.3,duration:0.18},{at:0.68,start:0.5,duration:0.75}]}
];
let edits=JSON.parse(readFileSync('assets/audio/edits.json','utf8'));
edits=edits.filter(entry=>!cues.some(cue=>cue.file===entry.file));
for(const cue of cues){
  const duration=Math.round(Math.max(...cue.segments.map(segment=>segment.at+segment.duration))*rate)/rate;
  const wav=Buffer.alloc(44+Math.round(duration*rate)*2);
  source.copy(wav,0,0,44);wav.writeUInt32LE(wav.length-8,4);wav.writeUInt32LE(wav.length-44,40);
  const samples=new Float64Array((wav.length-44)/2);
  for(const segment of cue.segments){
    const count=Math.round(segment.duration*rate),start=Math.round(segment.start*rate),at=Math.round(segment.at*rate);
    assert.ok(44+(start+count)*2<=source.length);
    for(let i=0;i<count;i++){
      const fade=Math.min(1,i/(rate*(segment.fadeIn??.008)),(count-1-i)/(rate*(segment.fadeOut??.025)));
      samples[at+i]+=source.readInt16LE(44+(start+i)*2)*fade*cue.gain;
    }
  }
  for(let i=0;i<samples.length;i++){assert.ok(Math.abs(samples[i])<=32767,'Cue must not clip');wav.writeInt16LE(Math.round(samples[i]),44+i*2);}
  writeFileSync('assets/audio/'+cue.file,wav);
  edits.push({file:cue.file,source:sourcePath,sourceSha256:hash(source),sha256:hash(wav),
    segments:cue.segments,durationSeconds:duration,sampleRate:rate,channels:1,gain:cue.gain,fadeInSeconds:.008,fadeOutSeconds:.025,
    author:'Pablo-F',license:'CC BY 3.0',sourceUrl:'https://freesound.org/people/Pablo-F/sounds/90743/'});
  console.log(`${cue.file}: ${duration.toFixed(2)} seconds, ${cue.segments.length} source segment(s), original pitch, gain ${cue.gain}.`);
}
writeFileSync('assets/audio/edits.json',JSON.stringify(edits,null,2)+'\n');
