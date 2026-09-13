import {sign,verify,type KeyObject} from 'node:crypto';
import {zipSync,Unzip,UnzipInflate,strToU8} from 'fflate';
import {z} from 'zod';
import {rosterSchema,utc,type Roster,type Audit} from './model.ts';
import {candidate,canonical,canonicalRoster,sha256,type Approval} from './review.ts';

const limit=200*1024*1024;
export const snapshotId=z.string().regex(/^roster-\d{4}-\d{2}\.\d{8}\.r[1-9]\d{0,5}$/);
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const manifestSchema=z.strictObject({rosterSchemaVersion:z.literal(1),snapshotId,contentHash:hash,createdAtUTC:utc,extractionStartedAt:utc,extractionCompletedAt:utc,providerId:z.string().min(1).max(100),adapterVersion:z.string().min(1).max(100),semantics:z.enum(['current','season']),identityProfileId:z.string().min(1).max(100),identityProfileVersion:z.number().int().positive(),ratingModelVersions:z.array(z.string().min(1).max(100)).min(1).max(10),rulesProfileVersions:z.array(z.string().min(1).max(100)).min(1).max(10),seasonByCompetition:z.record(z.string(),z.number().int().min(2000).max(2200)),previousSnapshotId:snapshotId.nullable(),teamCount:z.number().int().max(1000),playerCount:z.number().int().max(50000),qualitySummary:z.literal('complete-reviewed'),rightsRef:z.string().max(100).nullable(),permittedDistribution:z.enum(['development','official']),attribution:z.string().max(10000),compatibleSaveSchemaMin:z.number().int().positive(),compatibleSaveSchemaMax:z.number().int().positive(),payloadBytes:z.number().int().positive().max(limit),noticesHash:hash,signingKeyId:z.string().max(100).nullable(),signature:z.string().max(100).nullable()});
export type Manifest=z.infer<typeof manifestSchema>;
export type OpenPack={manifest:Manifest;roster:Roster;notices:string};
export function createArchive(roster:Roster,audit:Audit,approval:Approval,options:{snapshotId:string;previousSnapshotId:string|null;attribution:string;rightsRef:string|null;notices:string;key:{id:string;privateKey:KeyObject}|null}):Uint8Array {
  const checked=candidate(roster,audit);
  if(!checked.ok||checked.reviewHash!==approval.reviewHash)throw Error('CANDIDATE_CHANGED_OR_INVALID');
  if(options.key&&options.key.privateKey.asymmetricKeyType!=='ed25519')throw Error('INVALID_SIGNING_KEY');
  const payload=canonicalRoster(checked.roster), bytes=strToU8(payload);
  const manifest:Manifest=manifestSchema.parse({rosterSchemaVersion:1,snapshotId:options.snapshotId,contentHash:checked.contentHash,createdAtUTC:approval.approvedAtUTC,extractionStartedAt:audit.extractionStartedAt,extractionCompletedAt:audit.extractionCompletedAt,providerId:audit.providerId,adapterVersion:audit.adapterVersion,semantics:audit.semantics,identityProfileId:roster.identityProfileId,identityProfileVersion:roster.identityProfileVersion,ratingModelVersions:[...new Set(roster.gameProfiles.map(p=>p.ratingModelVersion))].sort(),rulesProfileVersions:[...new Set(roster.competitions.map(c=>c.rulesProfileRef))].sort(),seasonByCompetition:Object.fromEntries(roster.competitions.map(c=>[c.key,c.seasonStartYear])),previousSnapshotId:options.previousSnapshotId,teamCount:roster.teams.length,playerCount:roster.players.length,qualitySummary:'complete-reviewed',rightsRef:options.rightsRef,permittedDistribution:options.key?'official':'development',attribution:options.attribution,compatibleSaveSchemaMin:18,compatibleSaveSchemaMax:18,payloadBytes:bytes.byteLength,noticesHash:sha256(options.notices),signingKeyId:options.key?.id??null,signature:null});
  if(options.key){const unsigned=Object.fromEntries(Object.entries(manifest).filter(([key])=>key!=='signature'));manifest.signature=sign(null,Buffer.from(canonical(unsigned)),options.key.privateKey).toString('base64');}
  return zipSync({'manifest.json':strToU8(canonical(manifest)),'roster.json':bytes,'notices.txt':strToU8(options.notices)},{level:6,mtime:new Date('2026-01-01T00:00:00Z')});
}
function parseJSON(text:string):unknown {
  let depth=0,quoted=false,escape=false;
  for(const ch of text){if(quoted){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch==='"')quoted=false;}else if(ch==='"')quoted=true;else if(ch==='{'||ch==='['){if(++depth>32)throw Error('PACK_DEPTH_LIMIT');}else if(ch==='}'||ch===']')depth--;}
  return JSON.parse(text);
}
function checkDirectory(bytes:Uint8Array):void {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=bytes.length-22;
  while(end>=Math.max(0,bytes.length-65557)&&view.getUint32(end,true)!==0x06054b50)end--;
  if(end<0||end<bytes.length-65557||end+22+view.getUint16(end+20,true)!==bytes.length)throw Error('INVALID_PACK_ZIP');
  if(view.getUint16(end+4,true)!==0||view.getUint16(end+6,true)!==0||view.getUint16(end+8,true)!==3||view.getUint16(end+10,true)!==3)throw Error('UNEXPECTED_PACK_ENTRY');
  let offset=view.getUint32(end+16,true);const directoryEnd=offset+view.getUint32(end+12,true);let expanded=0;
  if(directoryEnd!==end)throw Error('INVALID_PACK_ZIP');
  for(let i=0;i<3;i++){
    if(offset+46>directoryEnd||view.getUint32(offset,true)!==0x02014b50)throw Error('INVALID_PACK_ZIP');
    const type=(view.getUint32(offset+38,true)>>>16)&0xf000;
    if(type!==0&&type!==0x8000)throw Error('UNEXPECTED_PACK_ENTRY');
    if(view.getUint16(offset+8,true)&1)throw Error('ENCRYPTED_PACK');
    expanded+=view.getUint32(offset+24,true);if(expanded>limit)throw Error('PACK_SIZE_LIMIT');
    offset+=46+view.getUint16(offset+28,true)+view.getUint16(offset+30,true)+view.getUint16(offset+32,true);
  }
  if(offset!==directoryEnd)throw Error('INVALID_PACK_ZIP');
}
export function openArchive(bytes:Uint8Array,options:{allowDevelopment:boolean;trustedKeys:ReadonlyMap<string,KeyObject>}):OpenPack {
  if(bytes.length>50*1024*1024)throw Error('PACK_SIZE_LIMIT');
  checkDirectory(bytes);
  const files=new Map<string,Buffer>();const names=new Set<string>();let expanded=0;
  const unzip=new Unzip(file=>{
    if(!['manifest.json','roster.json','notices.txt'].includes(file.name)||names.has(file.name))throw Error('UNEXPECTED_PACK_ENTRY');
    names.add(file.name);
    const max=file.name==='roster.json'?limit:1024*1024;
    if((file.originalSize??0)>max)throw Error('PACK_SIZE_LIMIT');
    let size=0;const chunks:Uint8Array[]=[];
    file.ondata=(error,data,final)=>{if(error)throw Error('INVALID_PACK_ZIP');size+=data.length;expanded+=data.length;if(size>max||expanded>limit){file.terminate();throw Error('PACK_SIZE_LIMIT');}chunks.push(data);if(final)files.set(file.name,Buffer.concat(chunks));};
    file.start();
  });
  unzip.register(UnzipInflate);
  // Feed small compressed chunks so expansion is bounded before retaining the next one.
  for(let offset=0;offset<bytes.length;offset+=1024)unzip.push(bytes.subarray(offset,offset+1024),offset+1024>=bytes.length);
  if(files.size!==3)throw Error('INCOMPLETE_PACK');
  const decode=(name:string)=>new TextDecoder('utf-8',{fatal:true}).decode(files.get(name)!);
  const manifest=manifestSchema.parse(parseJSON(decode('manifest.json')));
  if(manifest.permittedDistribution==='development'){
    if(!options.allowDevelopment||manifest.signature!==null||manifest.signingKeyId!==null)throw Error('UNTRUSTED_PACK');
  }else{
    const key=manifest.signingKeyId?options.trustedKeys.get(manifest.signingKeyId):null;
    const {signature,...unsigned}=manifest;
    if(!key||key.asymmetricKeyType!=='ed25519'||!signature||!verify(null,Buffer.from(canonical(unsigned)),key,Buffer.from(signature,'base64')))throw Error('UNTRUSTED_PACK');
  }
  const payload=decode('roster.json'),notices=decode('notices.txt');
  if(sha256(payload)!==manifest.contentHash||sha256(notices)!==manifest.noticesHash||files.get('roster.json')!.length!==manifest.payloadBytes)throw Error('PACK_CHECKSUM');
  const roster=rosterSchema.parse(parseJSON(payload));
  if(canonicalRoster(roster)!==payload||roster.teams.length!==manifest.teamCount||roster.players.length!==manifest.playerCount||roster.identityProfileId!==manifest.identityProfileId||roster.identityProfileVersion!==manifest.identityProfileVersion)throw Error('PACK_METADATA');
  return {manifest,roster,notices};
}
