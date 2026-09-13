import {collectionSchema,type Collection,type RewardPlayer} from '../../contracts/src/dream.ts';
import {draw,stream} from './rng.ts';

const bands=[{min:50,max:64,weight:70},{min:65,max:79,weight:25},{min:80,max:100,weight:5}] as const;
export function newCollection(seed:number,unlocked:string[]):Collection {
 return {rng:stream(seed,'dream/rewards'),earned:0,progress:0,fixtures:[],seasons:[],unlocked:[...unlocked].sort(),queued:[],pending:null,consumed:[]};
}
function remaining(collection:Collection,pool:readonly RewardPlayer[]){
 const owned=new Set(collection.unlocked);
 return pool.filter(p=>p.ability>=50&&!owned.has(p.id)).sort((a,b)=>a.id.localeCompare(b.id));
}
export function rewardOdds(collection:Collection,pool:readonly RewardPlayer[]){
 const available=remaining(collection,pool);
 const weights=bands.map(b=>available.some(p=>p.ability>=b.min&&p.ability<=b.max)?b.weight:0);
 const total=weights.reduce<number>((a,b)=>a+b,0);
 return weights.map(weight=>({weight,total}));
}
function earn(collection:Collection,pool:readonly RewardPlayer[]){
 if(!remaining(collection,pool).length)return;
 collection.earned++;collection.queued.push(collection.earned);
}
// Called only inside the transaction that commits a completed scheduled match.
export function fixtureReward(collection:Collection,pool:readonly RewardPlayer[],fixtureId:string,forfeit:boolean){
 if(forfeit||collection.fixtures.includes(fixtureId))return;
 collection.fixtures.push(fixtureId);collection.progress++;
 if(collection.progress===3){collection.progress=0;earn(collection,pool);}
}
export function seasonReward(collection:Collection,pool:readonly RewardPlayer[],season:number){
 if(collection.seasons.includes(season))return;
 collection.seasons.push(season);earn(collection,pool);
}
export function revealPack(collection:Collection,pool:readonly RewardPlayer[]){
 if(collection.pending||!collection.queued.length)return;
 const available=remaining(collection,pool);
 if(!available.length){collection.queued=[];return;}
 const id=collection.queued.shift()!,candidates:string[]=[];
 while(candidates.length<3&&available.length){
  const guarantee=id%5===0&&candidates.length===0&&available.some(p=>p.ability>=65);
  const groups=bands.map(b=>({weight:b.weight,players:available.filter(p=>p.ability>=b.min&&p.ability<=b.max&&(guarantee?p.ability>=65:true))})).filter(b=>b.players.length);
  let random:number;[collection.rng,random]=draw(collection.rng);
  let pick=random%groups.reduce((n,g)=>n+g.weight,0),group=groups[0]!;
  for(const g of groups){if(pick<g.weight){group=g;break;}pick-=g.weight;}
  [collection.rng,random]=draw(collection.rng);const player=group.players[random%group.players.length]!;
  candidates.push(player.id);available.splice(available.findIndex(p=>p.id===player.id),1);
 }
 collection.pending={id,candidates};
}
export function choosePlayer(collection:Collection,packId:number,playerId:string):boolean{
 const previous=collection.consumed.find(p=>p.id===packId);
 if(previous)return previous.playerId===playerId;
 if(collection.pending?.id!==packId||!collection.pending.candidates.includes(playerId)||collection.unlocked.includes(playerId))return false;
 collection.unlocked.push(playerId);collection.unlocked.sort();collection.consumed.push({id:packId,playerId});collection.pending=null;return true;
}
export function validateCollection(input:unknown,pool:readonly RewardPlayer[]):Collection{
 const c=collectionSchema.parse(input),ids=new Set(pool.map(p=>p.id));
 const unique=(values:readonly unknown[])=>new Set(values).size===values.length;
 const packs=[...c.queued,...c.consumed.map(p=>p.id),...(c.pending?[c.pending.id]:[])];
 if(ids.size!==pool.length||pool.some(p=>!Number.isInteger(p.ability)||p.ability<1||p.ability>100)||!unique(c.consumed.map(p=>p.playerId))||!unique(c.unlocked)||c.unlocked.some(id=>!ids.has(id))||!unique(c.fixtures)||!unique(c.seasons)||!unique(packs)||packs.some(id=>id>c.earned)||c.progress!==c.fixtures.length%3||c.consumed.some(p=>!c.unlocked.includes(p.playerId)))throw Error('INVALID_SAVE');
 if(c.pending&&(!unique(c.pending.candidates)||c.pending.candidates.some(id=>c.unlocked.includes(id)||!pool.some(p=>p.id===id&&p.ability>=50))))throw Error('INVALID_SAVE');
 return c;
}
