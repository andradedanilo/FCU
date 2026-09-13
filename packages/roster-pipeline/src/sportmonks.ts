import {z} from 'zod';
import {setTimeout as delay} from 'node:timers/promises';
import type {Page,RosterProvider} from './provider.ts';

type TransportOptions={token:string;requestsPerMinute:number;signal?:AbortSignal;fetch?:typeof fetch;wait?:(ms:number)=>Promise<void>;now?:()=>number};
export function sportmonksTransport(options:TransportOptions):(path:string)=>Promise<unknown>{
  if(!options.token.trim()||!Number.isInteger(options.requestsPerMinute)||options.requestsPerMinute<1||options.requestsPerMinute>600)throw Error('INVALID_PROVIDER_CONFIGURATION');
  const request=options.fetch??fetch,now=options.now??Date.now;
  const wait=options.wait??(async(ms:number)=>{await delay(ms,undefined,{signal:options.signal});});
  let next=0,queue=Promise.resolve<unknown>(null);
  return path=>{
    // Only adapter-owned relative paths are accepted; credentials never enter URLs or errors.
    if(!/^(leagues|teams|squads|players)\/[0-9a-z/?=&]+$/i.test(path))return Promise.reject(Error('INVALID_PROVIDER_PATH'));
    const operation=queue.catch(()=>null).then(async()=>{
      for(let attempt=0;attempt<=4;attempt++){
        options.signal?.throwIfAborted();
        await wait(Math.max(0,next-now()));next=now()+Math.ceil(60000/options.requestsPerMinute);
        let response:Response;
        const timeout=AbortSignal.timeout(15000),signal=options.signal?AbortSignal.any([options.signal,timeout]):timeout;
        try{response=await request('https://api.sportmonks.com/v3/football/'+path,{headers:{Authorization:options.token,Accept:'application/json'},redirect:'error',signal});}
        catch{options.signal?.throwIfAborted();if(attempt===4)throw Error('PROVIDER_UNAVAILABLE');await wait(1000*2**attempt);continue;}
        if(response.status===401||response.status===403){await response.body?.cancel();throw Error('PROVIDER_ACCESS_DENIED');}
        if(response.status===429||response.status>=500){
          const retry=response.headers.get('retry-after');await response.body?.cancel();
          if(attempt===4)throw Error('PROVIDER_RETRY_EXHAUSTED');
          const seconds=retry===null?NaN:Number(retry),date=retry===null?NaN:Date.parse(retry);
          const requested=Number.isFinite(seconds)?seconds*1000:Number.isFinite(date)?date-now():0;
          if(requested>60000)throw Error('PROVIDER_RETRY_LATER');
          await wait(Math.max(1000*2**attempt,requested));continue;
        }
        if(!response.ok){await response.body?.cancel();throw Error('PROVIDER_HTTP_ERROR');}
        if(!response.body)throw Error('EMPTY_PROVIDER_RESPONSE');
        const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
        try{
          while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>20*1024*1024)throw Error('PROVIDER_RESPONSE_LIMIT');chunks.push(chunk.value);}
          return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
        }catch{throw Error('INVALID_PROVIDER_RESPONSE');}finally{await reader.cancel();reader.releaseLock();}
      }
      throw Error('PROVIDER_UNAVAILABLE');
    });
    queue=operation;return operation;
  };
}

const id=z.number().int().positive().safe(),ref=z.string().regex(/^[1-9]\d{0,14}$/);
const season=z.object({id,league_id:id,starting_at:z.iso.date()});
const team=z.object({id,name:z.string().min(1).max(200)});
const member=z.object({player_id:id,team_id:id,season_id:id});
const player=z.object({id,name:z.string().min(1).max(200),date_of_birth:z.iso.date(),position_id:id});
const envelope=z.object({data:z.unknown(),pagination:z.object({has_more:z.boolean()}).optional()});
export function sportmonksProvider(request:(path:string)=>Promise<unknown>,roles:Readonly<Record<string,'GK'|'DEF'|'MID'|'FWD'>>,requestsPerMinute=60):RosterProvider{
  async function data(path:string){const response=envelope.parse(await request(path));if(response.pagination?.has_more)throw Error('UNEXPECTED_PROVIDER_PAGINATION');return response.data;}
  const page=<T>(items:T[],path:string):Page<T>=>({items,nextCursor:null,total:items.length,requestFingerprint:path,fetchedAtUTC:new Date().toISOString(),sourceUpdatedAtUTC:null});
  function noCursor(cursor:string|null){if(cursor!==null)throw Error('UNSUPPORTED_CURSOR');}
  return {
    id:'sportmonks',capabilities:async()=>({membership:'season',maxBatchSize:1,requestsPerMinute,sourceTimestamps:false}),
    listSeasons:async competition=>{
      const path='leagues/'+ref.parse(competition)+'?include=seasons';
      const league=z.object({id,seasons:z.array(season).max(500)}).parse(await data(path));
      if(String(league.id)!==competition||league.seasons.some(s=>String(s.league_id)!==competition))throw Error('PROVIDER_ID_MISMATCH');
      return page(league.seasons.map(s=>({ref:String(s.id),startYear:Number(s.starting_at.slice(0,4))})),path);
    },
    listTeams:async(seasonRef,cursor)=>{
      noCursor(cursor);const path='teams/seasons/'+ref.parse(seasonRef);
      return page(z.array(team).max(1000).parse(await data(path)).map(t=>({ref:String(t.id),name:t.name})),path);
    },
    fetchSquad:async(teamRef,seasonRef,cursor)=>{
      noCursor(cursor);const path='squads/seasons/'+ref.parse(seasonRef)+'/teams/'+ref.parse(teamRef);
      const squad=z.array(member).max(1000).parse(await data(path));
      if(squad.some(m=>String(m.team_id)!==teamRef||String(m.season_id)!==seasonRef))throw Error('PROVIDER_ID_MISMATCH');
      return page(squad.map(m=>({playerRef:String(m.player_id),teamRef})),path);
    },
    fetchPlayers:async(ids,cursor)=>{
      noCursor(cursor);if(ids.length!==1)throw Error('UNSUPPORTED_BATCH');
      const path='players/'+ref.parse(ids[0]),raw=await data(path);
      const p=player.parse(Array.isArray(raw)?z.array(player).length(1).parse(raw)[0]:raw);
      if(String(p.id)!==ids[0])throw Error('PROVIDER_ID_MISMATCH');
      const role=roles[String(p.position_id)];if(!role)throw Error('UNMAPPED_PROVIDER_ROLE');
      return page([{ref:String(p.id),name:p.name,dateOfBirth:p.date_of_birth,role}],path);
    }
  };
}
