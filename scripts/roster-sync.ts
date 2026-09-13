import {open,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {syncPlanSchema,syncRoster} from '../packages/roster-pipeline/src/sync.ts';
import {sportmonksProvider,sportmonksTransport} from '../packages/roster-pipeline/src/sportmonks.ts';

const configuration=z.strictObject({plan:syncPlanSchema,roles:z.record(z.string(),z.enum(['GK','DEF','MID','FWD'])),requestsPerMinute:z.number().int().min(1).max(600),responses:z.record(z.string(),z.unknown()).nullable()});
try{
  const path=process.argv[2];if(!path)throw Error('Pass a private configuration JSON path; --live is additionally required for network access.');
  const file=await open(path,'r');let raw:unknown;
  try{if((await file.stat()).size>20*1024*1024)throw Error('Configuration exceeds 20 MB.');raw=JSON.parse(await file.readFile('utf8'));}finally{await file.close();}
  const config=configuration.parse(raw);
  if(config.responses===null&&!process.argv.includes('--live'))throw Error('Live requests are disabled. Supply fixture responses or explicitly use --live.');
  const token=process.env.SPORTMONKS_API_TOKEN;
  if(config.responses===null&&!token)throw Error('Configure SPORTMONKS_API_TOKEN locally before live sync.');
  const controller=new AbortController();process.once('SIGINT',()=>controller.abort());
  const responses=config.responses;
  const request=responses===null?sportmonksTransport({token:token!,requestsPerMinute:config.requestsPerMinute,signal:controller.signal}):async(path:string)=>{if(!Object.hasOwn(responses,path))throw Error('MISSING_FIXTURE_RESPONSE');return responses[path];};
  const result=await syncRoster(config.plan,sportmonksProvider(request,config.roles,config.requestsPerMinute),controller.signal);
  const directory=join(process.cwd(),'apps/roster-tool/.local/candidates');await mkdir(directory,{recursive:true});
  const destination=join(directory,randomUUID()+'.json');await writeFile(destination,JSON.stringify(result),{flag:'wx'});
  console.log(`${responses===null?'Provider':'Synthetic response'} candidate ready for manual review: ${destination}`);
}catch(error){console.error(error instanceof z.ZodError?'Invalid private sync configuration or provider schema.':error instanceof Error?error.message:'Sync failed.');process.exitCode=1;}
