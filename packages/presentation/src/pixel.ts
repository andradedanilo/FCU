import { paintFootballer } from './sprites.ts';
import type { Highlight } from './highlights.ts';
import { sampleHighlight } from './highlights.ts';
import { text as t } from './text.ts';

// Original 320x180 pixel scene; all sprites and scenery are authored here.
export function paintHighlight(c:CanvasRenderingContext2D,h:Highlight,progress:number,time:number) {
  c.imageSmoothingEnabled=false;
  const rect=(x:number,y:number,w:number,height:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,height);};
  const line=(x:number,y:number,x2:number,y2:number,color:string)=>{c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(Math.round(x)+.5,Math.round(y)+.5);c.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);c.stroke();};
  const label=(message:string,y:number,size=15,color='#fff2b0')=>{c.font=`bold ${size}px monospace`;c.textAlign='center';c.fillStyle='#10213b';c.fillText(message,162,y+2);c.fillStyle=color;c.fillText(message,160,y);};
  rect(0,0,320,180,'#75aec0');rect(0,12,320,33,'#162d50');
  rect(0,10,320,3,'#e5c883');rect(0,14,320,2,'#485675');
  for(let row=0;row<4;row++)for(let col=0;col<64;col++){
    const x=col*5,y=17+row*6;const wave=Math.sin(time*4+col*.4+row)>.5;
    rect(x,y,3,3,'#dab184');rect(x-1,y+3,5,3,(col+row)%3===0?h.color:'#dfd6ac');
    if(wave){rect(x-2,y,1,4,'#dab184');rect(x+4,y,1,4,'#dab184');}
  }
  rect(0,42,320,10,'#f0d399');label(t.pixelBoards,49,7,'#193349');
  for(let row=0;row<9;row++)rect(0,52+row*15,320,15,row%2?'#4c914e':'#548f45');
  line(0,158,320,158,'#d4e4b5');line(0,98,320,98,'#d4e4b5');
  for(let x=43;x<278;x+=8)line(x,32,x,91,'#b0c7bb');
  for(let y=32;y<=91;y+=6)line(42,y,278,y,'#b0c7bb');
  rect(39,29,4,66,'#fff4d3');rect(39,28,242,4,'#fff4d3');rect(277,29,4,66,'#fff4d3');
  const player=(x:number,y:number,kit:string,pose:Parameters<typeof paintFootballer>[4],scale=1,back=false)=>paintFootballer(c,x,y,kit,pose,time,scale,back);
  const pose=sampleHighlight(h.kind,progress);
  const ball=(x:number,y:number)=>{rect(x-3,y-3,6,6,'#fff4d6');rect(x-1,y-1,2,2,'#25374c');};
  if(pose.phase==='reaction') {
    if(h.kind==='save')player(194,109,'#eabf54','hold',1.05);
    else player(pose.keeperX-21,105,'#eabf54','dive',1.05);
    player(142,151+(h.kind==='goal'?Math.round(Math.sin(time*8))*3:0),h.color,h.kind==='goal'?'up':'sad',1.2,true);
    if(h.kind!=='save')ball(pose.ballX,pose.ballY);
    const word=h.kind==='goal'?t.goalBanner:h.kind==='save'?t.saveBanner:t.missBanner;
    rect(0,159,320,21,'#183451');label(word,175,19,h.kind==='shot'?'#eecf95':'#fff1a3');
    return;
  }
  const diving=pose.phase==='shot';
  player(pose.keeperX-(diving?21:0),pose.keeperY+18,'#eabf54',diving?'dive':'stand',1.05);
  player(pose.runnerX,pose.runnerY,h.color,pose.phase==='approach'?'run':'kick',1.2,true);
  ball(pose.phase==='approach'?151:pose.ballX,pose.phase==='approach'?pose.runnerY-10:pose.ballY);
}
