import {treeHash,sourceHash,desktopNotices} from './artifacts.ts';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import { build } from 'esbuild';
export async function buildDesktop(development=false){
const config=JSON.parse(await readFile('package.json','utf8'));
let sourceCommit=null,sourceDirty=true;
try{sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();sourceDirty=Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim());}catch{ /* Source archives need no Git installation. */ }
const info={appVersion:config.version,sourceCommit,sourceDirty,lockHash:createHash('sha256').update(await readFile('package-lock.json')).digest('hex'),rendererHash:development?null:await treeHash('dist'),sourceHash:await sourceHash()};
const main=await build({metafile:true,entryPoints:['apps/game/src/main/index.ts'],outfile:'dist-electron/main.js',bundle:true,platform:'node',format:'esm',external:['electron'],target:'node22',define:{__FCU_BUILD__:JSON.stringify(info)}});
await build({entryPoints:['apps/game/src/preload/index.ts'],outfile:'dist-electron/preload.cjs',bundle:true,platform:'node',format:'cjs',external:['electron'],target:'node22'});

await copyFile('assets/original/fcu-icon.png','dist-electron/icon.png');
await writeFile('dist-electron/THIRD_PARTY_MAIN_LICENSES.txt',await desktopNotices(Object.keys(main.metafile.inputs)));
await writeFile('dist-electron/build-info.json',JSON.stringify({...info,desktopHash:await treeHash('dist-electron',['build-info.json'])},null,2)+'\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))await buildDesktop();
