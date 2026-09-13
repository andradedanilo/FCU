import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {brand} from '../packages/contracts/src/index.ts';
import {verifyArtifact} from './artifacts.ts';

function identifier(value:string){if(!/^[1-9][0-9]*$/.test(value)||Number(value)>4294967295)throw Error('Provide a valid Steam App ID and depot ID.');return value;}
function quoted(value:string){if(/["\x00-\x1f]/.test(value))throw Error('Unsupported character in Steam configuration.');return `"${value.replaceAll('\\','/')}"`;}
export async function steamPreview(root:string,appId:string,depotId:string){
 identifier(appId);identifier(depotId);if(appId===depotId)throw Error('App ID and depot ID must be different.');
 const content=resolve(root),manifest=await verifyArtifact(content,JSON.parse(await readFile(join(content,'FCU-manifest.json'),'utf8')));
 const executable=manifest.platform==='win32'?`${brand.title}.exe`:'fcu';
 if(!manifest.files.some(file=>file.path===executable)||!manifest.files.some(file=>file.path==='resources/app.asar'))throw Error('The manifest does not contain a complete FCU portable.');
 // Explicit mappings exclude files added after preparation from this preview.
 const mappings=[...manifest.files.map(file=>file.path),'FCU-manifest.json'].map(path=>`      "FileMapping" { "LocalPath" ${quoted(path)} "DepotPath" ${quoted(posix.dirname(path))} }`).join('\n');
 return `"AppBuild"\n{\n  "AppID" "${appId}"\n  "Desc" ${quoted(`${brand.short} ${manifest.appVersion} ${manifest.platform} local preview`)}\n  "Preview" "1"\n  "ContentRoot" ${quoted(content)}\n  "BuildOutput" "cache"\n  "Depots"\n  {\n    "${depotId}"\n    {\n${mappings}\n    }\n  }\n}\n`;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const [root,appId,depotId,...extra]=process.argv.slice(2);
 if(!root||!appId||!depotId||extra.length)throw Error('Usage: npm run steam:preview -- "portable folder" APP_ID DEPOT_ID');
 const config=await steamPreview(root,appId,depotId);
 await mkdir('work',{recursive:true});const output=await mkdtemp(resolve('work/steam-preview-'));
 await mkdir(join(output,'cache'));await writeFile(join(output,'app_build.vdf'),config,{flag:'wx'});
 console.log(`Prepared local SteamPipe preview: ${join(output,'app_build.vdf')}. No Steam command, login or upload was performed.`);
}
