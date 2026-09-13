import {mkdirSync, writeFileSync} from 'node:fs';
// Explicit authoring command only; builds never overwrite edited WAVs.
const rate=48000;
const melody=[64,67,71,72,71,67,64,62,60,64,67,69,67,64,62,59,57,60,64,67,64,60,57,59,60,64,67,71,69,67,64,62];
function tone(samples,note,start,length,volume,triangle){
 const frequency=440*2**((note-69)/12);
 for(let i=0;i<length*rate;i++){
  const t=i/rate;let wave=0;
  // Band-limited series avoids aliasing in the exported waveform.
  for(let h=1;h*frequency<rate/2;h+=2)wave+=Math.sin(2*Math.PI*frequency*h*t)*(triangle?(-1)**((h-1)/2)/h**2:1/h);
  wave*=triangle?8/Math.PI**2:4/Math.PI;
  samples[Math.round(start*rate)+i]+=wave*volume*Math.min(1,t/.006,(length-t)/(length*.4));
 }
}
function write(name,samples){
 const wav=Buffer.alloc(44+samples.length*2);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++)wav.writeInt16LE(Math.round(samples[i]*32767),44+i*2);
 mkdirSync('assets/audio',{recursive:true});writeFileSync(`assets/audio/${name}.wav`,wav);
}
const music=new Float64Array(rate*7.2);
melody.forEach((note,step)=>{tone(music,note,step*.225,.17,.022,false);if(step%2===0)tone(music,[40,36,33,36][Math.floor(step/8)],step*.225,.24,.055,true);});
write('music',music);const click=new Float64Array(rate*.065);tone(click,72,0,.055,.025,true);write('click',click);
console.log('Rendered original music.wav and click.wav.');
