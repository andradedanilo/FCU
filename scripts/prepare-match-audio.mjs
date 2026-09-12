import {_electron} from '@playwright/test';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
// Input recordings are downloaded separately from the credited public sources.
const input=process.argv[2];if(!input)throw Error('Pass the directory containing kick.wav and the four source MP3 previews.');
const app=await _electron.launch({args:['.'],env:{...process.env,FCU_USER_DATA:mkdtempSync(join(tmpdir(),'fcu-audio-'))}});
const edits=[];
try{const page=await app.firstWindow();await page.context().setOffline(true);
 for(const name of ['kick','whistle','cheer','groan','crowd']){
  const raw=readFileSync(join(input,name+(name==='kick'?'.wav':'.mp3')));
  const result=await page.evaluate(async({encoded,name})=>{
   const context=new AudioContext();const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const buffer=await context.decodeAudioData(bytes.buffer);await context.close();
   const rate=buffer.sampleRate,channels=buffer.numberOfChannels;let start=name==='crowd'?10:0,length=name==='crowd'?20:name==='groan'?3:name==='cheer'?3.5:buffer.duration;
   if(name==='kick'){
    const data=buffer.getChannelData(0),window=Math.floor(rate*.01),energy=[];
    for(let i=0;i<data.length-window;i+=window){let total=0;for(let j=0;j<window;j++)total+=data[i+j]**2;energy.push(total/window);}
    const threshold=Math.max(...energy)*.3;start=Math.max(0,energy.findIndex(n=>n>=threshold)*.01-.025);length=.45;
   }
   const count=Math.min(Math.round(length*rate),buffer.length-Math.round(start*rate));let peak=0;
   for(let c=0;c<channels;c++)for(let i=0;i<count;i++)peak=Math.max(peak,Math.abs(buffer.getChannelData(c)[Math.round(start*rate)+i]));
   const gain=Math.min(4,.8/Math.max(peak,.001)),output=new Int16Array(count*channels);
   for(let i=0;i<count;i++){const fade=Math.min(1,i/(rate*.008),(count-i)/(rate*(name==='kick'?.025:.2)));for(let c=0;c<channels;c++)output[i*channels+c]=Math.round(buffer.getChannelData(c)[Math.round(start*rate)+i]*gain*fade*32767);}
   return {samples:Array.from(output),rate,channels,start,duration:count/rate,gain};
  },{encoded:raw.toString('base64'),name});
  const data=Buffer.alloc(44+result.samples.length*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(result.channels,22);data.writeUInt32LE(result.rate,24);data.writeUInt32LE(result.rate*result.channels*2,28);data.writeUInt16LE(result.channels*2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);result.samples.forEach((v,i)=>data.writeInt16LE(v,44+i*2));writeFileSync('apps/game/src/renderer/assets/audio/'+name+'.wav',data);
  edits.push({file:name+'.wav',sourceSha256:createHash('sha256').update(raw).digest('hex'),startSeconds:result.start,durationSeconds:result.duration,gain:result.gain,sampleRate:result.rate,channels:result.channels});
 }
 writeFileSync('apps/game/src/renderer/assets/audio/edits.json',JSON.stringify(edits,null,2)+'\n');console.log(edits);
}finally{await app.close();}
