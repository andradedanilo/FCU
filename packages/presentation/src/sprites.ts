type Point=readonly [number,number];
type Pose='run'|'kick'|'up'|'sad'|'stand'|'dive'|'hold';
// Original football anatomy and six contact/recovery poses, drawn on the pixel grid.
const gait:ReadonlyArray<readonly [Point,Point,Point,Point]>=[
  [[-7,-12],[-11,-1],[5,-12],[8,-6]],
  [[-5,-11],[-8,0],[7,-13],[4,-7]],
  [[-2,-12],[-2,-1],[5,-15],[1,-10]],
  [[5,-12],[8,-6],[-7,-12],[-11,-1]],
  [[7,-13],[4,-7],[-5,-11],[-8,0]],
  [[5,-15],[1,-10],[-2,-12],[-2,-1]]
];
export function paintFootballer(c:CanvasRenderingContext2D,x:number,y:number,kit:string,pose:Pose,time:number,scale=1,back=false) {
  const ink='#17283c',skin='#dfad7d',skinDark='#a96e51',sock='#e0e7d1';
  const shade=`#${[1,3,5].map(i=>Math.round(parseInt(kit.slice(i,i+2),16)*.6).toString(16).padStart(2,'0')).join('')}`;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  const r=(a:number,b:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(a),Math.round(b),w,h);};
  function poly(points:ReadonlyArray<Point>,color:string){c.fillStyle=color;c.beginPath();points.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.closePath();c.fill();}
  function bone(a:Point,b:Point,width:number,color:string){
    // Stepped segments keep joints attached without subpixel feet or rotated rectangles.
    const steps=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),1);
    for(let i=0;i<=steps;i++)r(a[0]+(b[0]-a[0])*i/steps-width/2,a[1]+(b[1]-a[1])*i/steps-width/2,width,width,color);
  }
  r(-11,0,21,2,'#356443');r(-7,-1,14,3,'#2d583f');
  if(pose==='dive'){
    bone([-12,-5],[0,-11],5,kit);bone([0,-11],[11,-13],5,kit);
    bone([-12,-5],[-20,-11],4,sock);bone([-12,-5],[-20,0],4,sock);
    bone([5,-12],[17,-17],3,skin);bone([5,-9],[19,-11],3,skin);
    poly([[9,-17],[14,-18],[17,-15],[16,-10],[12,-9],[9,-12]],skin);r(10,-18,6,3,ink);r(17,-18,4,3,'#f7eccc');r(19,-12,4,3,'#f7eccc');
    c.restore();return;
  }
  const running=pose==='run';const bob=running?[0,-1,-2,0,-1,-2][Math.floor(time*9)%6]!:pose==='up'?Math.round(Math.sin(time*7))*1:0;
  c.translate(running?2:0,bob);
  let leftKnee:Point=[-4,-11],leftFoot:Point=[-5,0],rightKnee:Point=[4,-11],rightFoot:Point=[5,0];
  if(running)[leftKnee,leftFoot,rightKnee,rightFoot]=gait[Math.floor(time*9)%6]!;
  if(pose==='kick'){leftKnee=[-4,-10];leftFoot=[-6,0];rightKnee=back?[5,-15]:[8,-18];rightFoot=back?[7,-8]:time<1.65?[18,-17]:[12,-9];}
  function leg(hip:Point,knee:Point,foot:Point){bone(hip,knee,5,ink);bone(hip,knee,3,skinDark);bone(knee,foot,5,ink);bone(knee,foot,3,sock);r(foot[0]-2,foot[1]-1,7,3,ink);r(foot[0]+2,foot[1]-1,3,1,'#65767c');}
  leg([-3,-19],leftKnee,leftFoot);leg([3,-19],rightKnee,rightFoot);
  const shoulderLeft:Point=[-5,-31],shoulderRight:Point=[5,-31];
  function arm(shoulder:Point,elbow:Point,hand:Point){bone(shoulder,elbow,5,shade);bone(elbow,hand,4,ink);bone(elbow,hand,3,skin);r(hand[0]-1,hand[1]-1,3,3,skin);}
  const swing=running?Math.sin(Math.floor(time*9)%6*Math.PI/3)*5:0;
  arm(shoulderLeft,pose==='up'?[-10,-37]:pose==='sad'?[-9,-35]:[-8,-26+swing],pose==='up'?[-10,-45]:pose==='sad'?[-3,-40]:[-5,-22+swing]);
  poly([[-5,-21],[-5,-17],[-1,-16],[0,-19],[2,-16],[6,-17],[5,-23]],'#edf0db');
  poly([[-5,-33],[-8,-29],[-5,-26],[-4,-21],[4,-21],[6,-26],[6,-31],[2,-34]],ink);
  poly([[-4,-32],[-6,-29],[-3,-26],[-3,-22],[3,-22],[4,-27],[5,-30],[1,-33]],kit);
  poly([[-4,-31],[-2,-30],[-1,-23],[-3,-22]],shade);r(1,-29,2,5,'#f3d9aa');r(-1,-32,3,2,sock);
  arm(shoulderRight,pose==='up'?[10,-37]:pose==='sad'?[9,-35]:[9,-26-swing],pose==='up'?[10,-45]:pose==='sad'?[4,-40]:[6,-22-swing]);
  if(pose==='hold'){bone([-7,-27],[-2,-24],3,skin);bone([7,-27],[2,-24],3,skin);r(-4,-27,8,8,'#fff2cc');r(-1,-25,3,3,ink);}
  r(-1,-36,3,4,skinDark);
  poly([[-3,-43],[1,-45],[5,-42],[5,-39],[6,-38],[4,-35],[0,-35],[-3,-38]],ink);
  poly([[-2,-41],[1,-43],[4,-41],[4,-38],[5,-38],[3,-36],[0,-36],[-2,-38]],skin);
  if(back){r(-2,-43,6,7,'#302737');r(-1,-29,2,6,sock);c.restore();return;}
  r(-2,-41,2,4,skinDark);r(-2,-44,6,3,'#302737');r(3,-40,1,1,ink);r(3,-37,2,1,skinDark);
  c.restore();
}
