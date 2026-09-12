import {mkdirSync,writeFileSync} from 'node:fs';
// Original PCM sound design. This seed belongs to asset creation, never simulation.
const rate=22050,root='apps/game/src/renderer/assets/audio';mkdirSync(root,{recursive:true});let seed=90412;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const clamp=(n)=>Math.max(-1,Math.min(1,n));
function wav(name,length,render){
 const count=Math.round(rate*length),samples=new Float64Array(count);let peak=0;
 for(let i=0;i<count;i++){const value=render(i/rate,i);samples[i]=value;peak=Math.max(peak,Math.abs(value));}
 const bytes=Buffer.alloc(44+count*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++)bytes.writeInt16LE(Math.round(clamp(samples[i]/Math.max(peak,1)*.8)*32767),44+i*2);
 writeFileSync(`${root}/${name}.wav`,bytes);
}
let low=0;
wav('kick',.24,(t)=>{low+=.28*((random()*2-1)-low);return Math.sin(2*Math.PI*105*t)*Math.exp(-t*37)*.6+low*Math.exp(-t*60)*2;});
wav('whistle',.8,t=>{const gate=Math.min(1,t/.015)*Math.min(1,(.8-t)/.06);return gate*(.6+.4*Math.sin(2*Math.PI*37*t))*(Math.sin(2*Math.PI*2850*t)*.65+Math.sin(2*Math.PI*3120*t)*.28);});
function crowd(name,length,mood){
 const voices=Array.from({length:36},()=>({pitch:95+random()*170,phase:random()*6.28,start:random()*.55,pan:random(),pulse:3+random()*4}));let wash=0;
 wav(name,length,t=>{
  wash+=.35*((random()*2-1)-wash);
  const envelope=Math.min(1,t/.2)*Math.min(1,(length-t)/.45);
  let sum=0;
  for(const v of voices){const age=t-v.start;if(age<0)continue;const f=v.pitch*(mood==='cheer'?1+.12*Math.sin(Math.min(1,age/1.5)*Math.PI):1);let voice=0;
   for(let h=1;h<=12;h++){const hz=f*h,formant=mood==='groan'?400:800;const strength=Math.exp(-(((hz-formant)/260)**2))+.4*Math.exp(-(((hz-1300)/400)**2));voice+=Math.sin(2*Math.PI*hz*age+v.phase)*strength/h;}
   sum+=voice*(.6+.4*Math.sin(age*v.pulse+v.phase));
  }
  const rise=mood==='cheer'?Math.min(1,t/.5):mood==='groan'?Math.exp(-t*.35):.3;
  return envelope*(sum*.055*rise+wash*(mood==='ambient'?.18:.3));
 });
}
crowd('crowd',4,'ambient');crowd('cheer',2.4,'cheer');crowd('groan',1.8,'groan');
console.log('Five original 22.05 kHz mono PCM cues written to '+root);
