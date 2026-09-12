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
  line(62,179,101,78,'#d4e4b5');line(258,179,219,78,'#d4e4b5');line(101,78,219,78,'#d4e4b5');line(83,130,237,130,'#d4e4b5');
  if(sampleHighlight(h.kind,progress).phase!=='reaction'){
    for(let x=104;x<217;x+=7)line(x,45,x,79,'#b0c7bb');
    for(let y=45;y<=79;y+=6)line(103,y,217,y,'#b0c7bb');
    rect(102,44,3,38,'#fff4d3');rect(102,43,116,3,'#fff4d3');rect(215,44,3,38,'#fff4d3');
  }
  const player=(x:number,y:number,kit:string,pose:Parameters<typeof paintFootballer>[4],scale=1,back=false)=>paintFootballer(c,x,y,kit,pose,time,scale,back);
  const pose=sampleHighlight(h.kind,progress);
  if(pose.phase==='reaction') {
    rect(0,79,320,101,'#183451');rect(0,82,320,2,'#e1b758');
    const word=h.kind==='goal'?t.goalBanner:h.kind==='save'?t.saveBanner:t.missBanner;
    label(word,109,24,h.kind==='shot'?'#eecf95':'#fff1a3');
    player(160,174+(h.kind==='goal'?Math.round(Math.sin(time*9))*2:0),h.kind==='save'?'#eabf54':h.color,h.kind==='shot'?'sad':'up',1.3);
    if(h.kind==='goal'){for(let i=0;i<16;i++)rect(20+i*18,113+((Math.floor(time*15)+i*7)%58),2,3,i%2?'#e3bd65':'#e57962');player(111,176,h.color,'run',1.1);player(209,176,h.color,'up',1.1);}
    if(h.kind==='save'){rect(146,133,8,8,'#fff2cc');rect(149,135,3,3,'#283748');}
    return;
  }
  player(pose.keeperX-(pose.phase==='shot'?14:0),pose.keeperY+12,'#eabf54',pose.phase==='shot'?'dive':'stand',.7);
  player(180-Math.min(1,progress/.4)*13,108,h.opponentColor,'stand',.72);
  player(pose.runnerX,pose.runnerY,h.color,pose.phase==='approach'?'run':'kick',.95,true);
  const ballX=pose.phase==='approach'?153:pose.ballX;
  const ballY=pose.phase==='approach'?pose.runnerY-8:pose.ballY;
  rect(ballX-3,ballY-3,6,6,'#fff4d6');rect(ballX-1,ballY-1,2,2,'#25374c');
}
