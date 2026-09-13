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
  {file:'whistle.wav',segments:[{at:0,start:0.1,duration:0.55}]},
  {file:'tackle.wav',segments:[{at:0,start:0.1,duration:0.18}]},
  {file:'fulltime.wav',segments:[{at:0,start:0.1,duration:0.18},{at:0.32,start:0.3,duration:0.18},{at:0.68,start:0.5,duration:0.75}]}
];
let edits=JSON.parse(readFileSync('assets/audio/edits.json','utf8'));
edits=edits.filter(entry=>!cues.some(cue=>cue.file===entry.file));
for(const cue of cues){
  const duration=Math.round(Math.max(...cue.segments.map(segment=>segment.at+segment.duration))*rate)/rate;
  const wav=Buffer.alloc(44+Math.round(duration*rate)*2);
  source.copy(wav,0,0,44);wav.writeUInt32LE(wav.length-8,4);wav.writeUInt32LE(wav.length-44,40);
  for(const segment of cue.segments){
    const count=Math.round(segment.duration*rate),start=Math.round(segment.start*rate),at=Math.round(segment.at*rate);
    assert.ok(44+(start+count)*2<=source.length);
    for(let i=0;i<count;i++){
      const fade=Math.min(1,i/(rate*.008),(count-1-i)/(rate*.025));
      wav.writeInt16LE(Math.round(source.readInt16LE(44+(start+i)*2)*fade),44+(at+i)*2);
    }
  }
  writeFileSync('assets/audio/'+cue.file,wav);
  edits.push({file:cue.file,source:sourcePath,sourceSha256:hash(source),sha256:hash(wav),
    segments:cue.segments,durationSeconds:duration,sampleRate:rate,channels:1,gain:1,fadeInSeconds:.008,fadeOutSeconds:.025,
    author:'Pablo-F',license:'CC BY 3.0',sourceUrl:'https://freesound.org/people/Pablo-F/sounds/90743/'});
  console.log(`${cue.file}: ${duration.toFixed(2)} seconds, ${cue.segments.length} blast(s), original pitch and level.`);
}
writeFileSync('assets/audio/edits.json',JSON.stringify(edits,null,2)+'\n');
