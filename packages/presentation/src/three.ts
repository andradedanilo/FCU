import * as THREE from 'three';
import { type MatchPresenter, type MatchView } from './projector.ts';
import { createStadium } from './stadium.ts';
import { samplePlay } from './choreography.ts';
import type { MatchEvent, PlayerId } from '../../contracts/src/index.ts';

export function createThreePresenter(onFailure:()=>void):MatchPresenter & {shadows(value:boolean):void;fps(value:number):void;replay():void} {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#12332e');
  const camera=new THREE.OrthographicCamera(-70,70,50,-50,0.1,400);camera.position.set(0,95,100);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  function fitCamera(width:number,height:number) {
    const footprint=new THREE.Box3(new THREE.Vector3(-68,-3,-51),new THREE.Vector3(68,16,51));
    const projected=new THREE.Box3();
    for(const x of [footprint.min.x,footprint.max.x])for(const y of [footprint.min.y,footprint.max.y])for(const z of [footprint.min.z,footprint.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
    const aspect=width/Math.max(1,height);const halfHeight=Math.max((projected.max.y-projected.min.y)/2+2,70/aspect);
    const center=(projected.min.y+projected.max.y)/2;
    camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=center+halfHeight;camera.bottom=center-halfHeight;camera.updateProjectionMatrix();
  }
  let renderer:THREE.WebGLRenderer|null=null;let container:HTMLElement|null=null;let resize:ResizeObserver|null=null;
  let stadium:ReturnType<typeof createStadium>|null=null;
  let progress=1;let ambient=0;let replaying=false;
  let view:MatchView|null=null;let lastKey='';let speed=1;let frame=0;let start=0;let lastFrame=0;let frameRate=30;let active=false;let disposed=false;
  const figures=new Map<PlayerId,THREE.Group>();const allocatedGeometries:THREE.BufferGeometry[]=[];const allocatedMaterials:THREE.Material[]=[];
  const geometry=<T extends THREE.BufferGeometry>(value:T)=>{allocatedGeometries.push(value);return value;};
  const material=(color:string)=>{const m=new THREE.MeshStandardMaterial({color,roughness:0.95});allocatedMaterials.push(m);return m;};
  const mesh=(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number)=>{const result=new THREE.Mesh(g,m);result.position.set(x,y,z);result.receiveShadow=true;scene.add(result);return result;};
  const grass=material('#30724e');const stripe=material('#397d55');const white=material('#e9efce');const concrete=material('#23473d');
  mesh(geometry(new THREE.BoxGeometry(118,2,82)),concrete,0,-1.8,0);
  mesh(geometry(new THREE.PlaneGeometry(105,68)),grass,0,0,0).rotation.x=-Math.PI/2;
  for(let i=0;i<10;i++)if(i%2===0)mesh(geometry(new THREE.PlaneGeometry(10.5,68)),stripe,-47.25+i*10.5,.02,0).rotation.x=-Math.PI/2;
  const line=(points:number[][])=>{const g=geometry(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p[0]!,0.08,p[1]!))));const m=new THREE.LineBasicMaterial({color:'#d9e8bc'});allocatedMaterials.push(m);scene.add(new THREE.Line(g,m));};
  line([[-52.5,-34],[52.5,-34],[52.5,34],[-52.5,34],[-52.5,-34]]);line([[0,-34],[0,34]]);
  const circle=geometry(new THREE.RingGeometry(9.1,9.3,48));mesh(circle,white,0,.09,0).rotation.x=-Math.PI/2;
  for(const sign of [-1,1]) {
    line([[sign*52.5,-20],[sign*36,-20],[sign*36,20],[sign*52.5,20]]);
    line([[sign*52.5,-9],[sign*47,-9],[sign*47,9],[sign*52.5,9]]);
    for(const z of [-4.5,4.5])mesh(geometry(new THREE.BoxGeometry(.35,4,.35)),white,sign*53,2,z);
    mesh(geometry(new THREE.BoxGeometry(.35,.35,9.3)),white,sign*53,4,0);
    const net=material('#96b5a0');net.wireframe=true;
    mesh(geometry(new THREE.BoxGeometry(3,4,9)),net,sign*54.5,2,0);
    for(const x of [-57,57])mesh(geometry(new THREE.CylinderGeometry(.18,.18,2,6)),white,x,1,sign*34);
  }
  scene.add(new THREE.HemisphereLight('#f9f4d8','#234638',2.6));
  const light=new THREE.DirectionalLight('#fff2cf',3);light.position.set(-35,75,30);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-80;light.shadow.camera.right=80;light.shadow.camera.top=70;light.shadow.camera.bottom=-70;light.shadow.normalBias=.1;scene.add(light);
  const bodyGeometry=geometry(new THREE.CylinderGeometry(.65,.8,2.1,6));const headGeometry=geometry(new THREE.SphereGeometry(.55,8,6));const legGeometry=geometry(new THREE.BoxGeometry(.4,1.1,.45));
  const skin=material('#d6b38c');const dark=material('#172b29');
  const ball=mesh(geometry(new THREE.IcosahedronGeometry(.55,1)),white,0,.65,0);ball.castShadow=true;
  function buildFigures(next:MatchView) {
    stadium=createStadium(scene,next.figures.find(f=>f.team===next.home)!.color,next.figures.find(f=>f.team!==next.home)!.color);
    for(const figure of next.figures) {
      const group=new THREE.Group();const kit=material(figure.role==='GK'?'#ecd370':figure.color);
      const body=new THREE.Mesh(bodyGeometry,kit);body.position.y=1.9;body.castShadow=true;group.add(body);
      const head=new THREE.Mesh(headGeometry,skin);head.position.y=3.55;head.castShadow=true;group.add(head);
      for(const x of [-.38,.38]){const leg=new THREE.Mesh(legGeometry,figure.team===next.home?dark:white);leg.position.set(x,.55,0);leg.name=x<0?'leftLeg':'rightLeg';group.add(leg);}
      group.position.set(figure.x,0,figure.z);scene.add(group);figures.set(figure.id,group);
    }
  }
  function draw(value:number) {
    if(!view||!renderer||disposed)return;
    const pose=samplePlay(view,value);
    for(const f of view.figures){
      const group=figures.get(f.id)!;const position=pose.positions[f.id]!;
      group.position.set(position.x,position.y,position.z);
      group.rotation.z=f.role==='GK'&&f.team!==view.event?.clubId?pose.keeperDive:0;
      const stride=value>0&&value<1?Math.sin(value*Math.PI*12)*.65:0;
      group.getObjectByName('leftLeg')!.rotation.x=stride;
      group.getObjectByName('rightLeg')!.rotation.x=-stride;
    }
    ball.position.set(pose.ball.x,pose.ball.y,pose.ball.z);ball.rotation.z=value*12;
    stadium?.animate(ambient,view.event?.type==='goal'&&value>.65&&value<1?1:0);
    renderer.render(scene,camera);
  }
  function animate(time:number) {
    if(disposed||!active||document.hidden)return;
    if(!start)start=time;
    progress=Math.min(1,(time-start)/(replaying?3000:800/speed));
    if(time-lastFrame>=1000/frameRate){ambient+=Math.min(.1,(time-lastFrame)/1000);draw(progress);lastFrame=time;}
    if(replaying&&progress===1){draw(1);active=false;replaying=false;}else frame=requestAnimationFrame(animate);
  }
  function pause(){replaying=false;active=false;cancelAnimationFrame(frame);draw(progress);}
  function visibility(){if(document.hidden){cancelAnimationFrame(frame);}else if(active){start=performance.now()-progress*(replaying?3000:800/speed);lastFrame=performance.now();frame=requestAnimationFrame(animate);}else draw(progress);}
  function failed(event:Event){event.preventDefault();pause();onFailure();}
  return {
    mount(target){container=target;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.setAttribute('aria-label','Stylized football pitch');renderer.domElement.addEventListener('webglcontextlost',failed);target.append(renderer.domElement);resize=new ResizeObserver(()=>{if(!renderer||!container)return;const width=container.clientWidth;const height=container.clientHeight;renderer.setSize(width,height);fitCamera(width,height);draw(progress);});resize.observe(target);document.addEventListener('visibilitychange',visibility);}catch{onFailure();}},
    render(next:MatchView,_events:MatchEvent[]){if(disposed)return;if(figures.size===0)buildFigures(next);view=next;const key=`${next.fixtureId}/${next.event?.order??-1}`;if(key!==lastKey){replaying=false;lastKey=key;start=0;progress=0;}if(!active){active=true;if(start)start=performance.now()-progress*(replaying?3000:800/speed);lastFrame=performance.now();frame=requestAnimationFrame(animate);}draw(progress);},
    setSpeed(value){speed=value;},pause,
    replay(){if(disposed||!view?.event)return;cancelAnimationFrame(frame);replaying=true;progress=0;start=0;active=true;lastFrame=performance.now();frame=requestAnimationFrame(animate);},
    shadows(value){if(renderer){renderer.shadowMap.enabled=value;draw(progress);}},fps(value){frameRate=value;},
    dispose(){disposed=true;stadium?.dispose();cancelAnimationFrame(frame);resize?.disconnect();document.removeEventListener('visibilitychange',visibility);renderer?.domElement.removeEventListener('webglcontextlost',failed);renderer?.domElement.remove();for(const g of allocatedGeometries)g.dispose();for(const m of allocatedMaterials)m.dispose();light.shadow.dispose();renderer?.dispose();renderer?.forceContextLoss();figures.clear();scene.clear();renderer=null;container=null;}
  };
}
