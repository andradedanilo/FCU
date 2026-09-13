import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readdir,stat,readFile} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {z} from 'zod';
export async function hashFile(path:string){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
export async function inventory(root:string,exclude:readonly string[]=[]){
 const files:{path:string;bytes:number;sha256:string}[]=[];
 async function walk(directory:string){for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name),name=relative(root,path).replaceAll('\\','/');if(exclude.includes(name))continue;if(entry.isSymbolicLink())throw Error('Artifact contains an unsupported symbolic link');if(entry.isDirectory())await walk(path);else if(entry.isFile())files.push({path:name,bytes:(await stat(path)).size,sha256:await hashFile(path)});}}
 await walk(root);return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
export async function treeHash(root:string,exclude:readonly string[]=[]){return createHash('sha256').update(JSON.stringify(await inventory(root,exclude))).digest('hex');}
export async function sourceHash():Promise<string|null>{
 let paths:string[];try{paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).sort();}catch{return null;}
 const hash=createHash('sha256');for(const path of paths){hash.update(path+'\0');try{hash.update(await hashFile(resolve(path)));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;hash.update('missing');}}return hash.digest('hex');
}
const fileSchema=z.strictObject({path:z.string().min(1).max(500),bytes:z.number().int().nonnegative(),sha256:z.string().regex(/^[a-f0-9]{64}$/)});
export const manifestSchema=z.strictObject({schema:z.literal(1),appVersion:z.string().max(40),platform:z.enum(['win32','linux']),architecture:z.literal('x64'),files:z.array(fileSchema).max(10000)});
export async function verifyArtifact(root:string,input:unknown){const manifest=manifestSchema.parse(input),files=await inventory(root,['FCU-manifest.json']);if(JSON.stringify(files)!==JSON.stringify(manifest.files))throw Error('Packaged files do not match the manifest');return manifest;}
export async function desktopNotices(inputs:readonly string[]){
 const roots=new Set<string>();for(const input of inputs){const marker='node_modules/',index=input.lastIndexOf(marker);if(index<0)continue;const parts=input.slice(index+marker.length).split('/');roots.add(input.slice(0,index+marker.length)+parts.slice(0,parts[0]!.startsWith('@')?2:1).join('/'));}
 const notices:string[]=[];for(const root of [...roots].sort()){const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8')) as {name:string;version:string;license?:string};const names=(await readdir(root)).filter(name=>/^(licen[sc]e|copying|notice)(\.|$)/i.test(name)).sort();if(!names.length)throw Error('Missing bundled dependency notice: '+pkg.name);notices.push(pkg.name+' '+pkg.version+' / '+(pkg.license??'See notice'));for(const name of names)notices.push(await readFile(join(root,name),'utf8'));}return notices.join('\n\n');
}
