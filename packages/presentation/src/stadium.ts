import * as THREE from 'three';
import { text } from './text.ts';
import { brand } from '../../contracts/src/index.ts';

// Original fictional stadium dressing, centralized separately from club identities.
const boards = [brand.short, ...text.stadiumBoards];
export function createStadium(scene:THREE.Scene, homeColor:string, awayColor:string) {
  const root=new THREE.Group();scene.add(root);
  const geometries:THREE.BufferGeometry[]=[];
  const materials:THREE.Material[]=[];
  const textures:THREE.Texture[]=[];
  const box=(x:number,y:number,z:number)=>{const g=new THREE.BoxGeometry(x,y,z);geometries.push(g);return g;};
  const mat=(color:string)=>{const m=new THREE.MeshStandardMaterial({color,roughness:1});materials.push(m);return m;};
  const concrete=mat('#26354b');const rail=mat('#e3d8b7');
  function add(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number){const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);root.add(mesh);return mesh;}
  const seats: {x:number;y:number;z:number;side:number}[]=[];
  for(const side of [-1,1])for(let row=0;row<13;row++) {
    add(box(114,1.4,2.4),concrete,0,row*1.1,side*(39+row*2.2));
    for(let col=0;col<56;col++)if(col%14!==0)seats.push({x:-54+col*1.95,y:1.3+row*1.1,z:side*(39+row*2.2),side});
  }
  for(const side of [-1,1])for(let row=0;row<11;row++) {
    add(box(2.2,1.4,72),concrete,side*(58+row*2),row*1.1,0);
    for(let col=0;col<34;col++)if(col%11!==0)seats.push({x:side*(58+row*2),y:1.3+row*1.1,z:-33+col*2,side});
  }
  const body=new THREE.InstancedMesh(box(.95,1.2,.65),mat('#ffffff'),seats.length);
  const arms=new THREE.InstancedMesh(box(.35,.95,.4),mat('#e6c291'),seats.length*2);arms.frustumCulled=false;root.add(arms);
  const heads=new THREE.InstancedMesh(box(.65,.65,.65),mat('#d9b392'),seats.length);
  body.frustumCulled=false;heads.frustumCulled=false;root.add(body,heads);
  const transform=new THREE.Object3D();
  for(let i=0;i<seats.length;i++){const seat=seats[i]!;body.setColorAt(i,new THREE.Color(i%5===0?'#e7dab7':i%7===0?'#253c5b':seat.side<0?homeColor:awayColor));}
  const flags:THREE.Group[]=[];
  for(const side of [-1,1])for(const x of [-43,-16,16,43]) {
    add(box(.16,6,.16),rail,x,7,side*46);
    const pivot=new THREE.Group();pivot.position.set(x,9,side*46);root.add(pivot);
    const cloth=new THREE.Mesh(box(3.8,2,.08),mat(side<0?homeColor:awayColor));cloth.position.x=1.9;pivot.add(cloth);
    const stripe=new THREE.Mesh(box(3.8,.45,.1),rail);stripe.position.x=1.9;pivot.add(stripe);flags.push(pivot);
  }
  // Upper decks, cantilever roof strips and aisle rails give the bowl depth.
  for(const side of [-1,1]){
    add(box(120,1,8),rail,0,17,side*66);
    add(box(9,1,78),rail,side*80,15,0);
    for(const x of [-55,-28,0,28,55]){add(box(.3,13,.3),rail,x,8,side*61);add(box(.25,.4,26),rail,x,7,side*51);}
    add(box(115,2,.5),mat(side<0?homeColor:awayColor),0,9,side*54);
  }
  for(const [i,label] of boards.entries()) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
    const ctx=canvas.getContext('2d');if(!ctx)continue;
    ctx.fillStyle=i%2?'#e8bc60':'#1a2c4b';ctx.fillRect(0,0,512,64);ctx.fillStyle=i%2?'#17243c':'#fff0cc';ctx.font='bold 36px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,34);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
    const m=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});materials.push(m);
    for(const side of [-1,1]){const board=add(box(25,2.8,.3),m,-39+i*26,1.5,side*35.8);board.rotation.x=-.25;}
  }
  for(const x of [-62,62])for(const z of [-43,43]) {
    add(box(.5,15,.5),rail,x,7.5,z);
    add(box(6,2,.7),mat('#fff0c0'),x,15,z);
  }
  function animate(time:number,cheer:number){
    for(let i=0;i<seats.length;i++){
      const seat=seats[i]!;const bounce=Math.max(0,Math.sin(time*5+i*.63))*(.12+cheer*.8);
      transform.position.set(seat.x,seat.y+bounce,seat.z);transform.updateMatrix();body.setMatrixAt(i,transform.matrix);
      transform.position.y+=.92;transform.updateMatrix();heads.setMatrixAt(i,transform.matrix);
      const wave=Math.sin(time*3+seat.x*.12+seat.z*.1);
      for(const side of [-1,1]){transform.position.set(seat.x+side*.66,seat.y+.5+bounce,seat.z);transform.rotation.z=side*(.65+Math.max(0,wave)*1.6);transform.updateMatrix();arms.setMatrixAt(i*2+(side===1?1:0),transform.matrix);}transform.rotation.z=0;
    }
    body.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;arms.instanceMatrix.needsUpdate=true;
    flags.forEach((flag,i)=>{flag.rotation.y=Math.sin(time*3+i)*.42;flag.rotation.z=Math.sin(time*4+i)*.12;});
  }
  animate(0,0);
  return {animate,dispose(){root.removeFromParent();body.dispose();heads.dispose();arms.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}};
}
