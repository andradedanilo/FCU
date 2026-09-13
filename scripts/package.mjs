import {audioAssets} from '../apps/game/src/renderer/audioAssets.ts';
import {inventory,treeHash,sourceHash,verifyArtifact} from './artifacts.ts';
import {createHash} from 'node:crypto';
import { packager } from '@electron/packager';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { brand } from '../packages/contracts/src/index.ts';

const platform = process.argv[2];
if (platform !== 'win32' && platform !== 'linux') throw new Error('Choose win32 or linux.');
if (platform !== process.platform) throw new Error('Build each FCU folder on its native OS.');
const config = JSON.parse(await readFile('package.json', 'utf8'));
const info=JSON.parse(await readFile('dist-electron/build-info.json','utf8'));
if(info.appVersion!==config.version||info.lockHash!==createHash('sha256').update(await readFile('package-lock.json')).digest('hex')||info.rendererHash!==await treeHash('dist')||info.desktopHash!==await treeHash('dist-electron',['build-info.json'])||info.sourceHash!==await sourceHash())throw Error('Build is stale. Run npm run build before packaging.');
await readFile('dist/THIRD_PARTY_RENDERER_LICENSES.md');await readFile('dist-electron/THIRD_PARTY_MAIN_LICENSES.txt');
await mkdir('work', { recursive: true });
const staging = await mkdtemp(resolve('work/package-'));
// Only bundled application files enter the archive; no source, secrets or dependencies.
await cp('dist', join(staging, 'dist'), { recursive: true });
await cp('dist-electron', join(staging, 'dist-electron'), { recursive: true });
await writeFile(join(staging, 'package.json'), JSON.stringify({
  name: config.name, version: config.version, type: 'module', main: config.main,
  productName: brand.title, description: config.description, author: config.author
}, null, 2));
await mkdir('release', { recursive: true });
const destination = await mkdtemp(resolve('release/build-'));
const output = await packager({
  dir: staging, out: destination, name: brand.title,
  executableName: platform === 'win32' ? brand.title : 'fcu',
  platform, arch: 'x64', electronVersion: config.devDependencies.electron,
  ...(platform==='win32'?{icon:resolve('assets/original/fcu-icon.ico')}:{}),
  appVersion: config.version, appBundleId: 'com.fcu.game', asar: true,
  // A unique output avoids deleting or overwriting another running prototype.
  prune: false, overwrite: false
});
const audioCredits=Object.values(audioAssets).map(asset=>[asset.title,asset.author,asset.license,asset.source,asset.licenseUrl,asset.edit].join('\n')).join('\n\n');
await writeFile(join(output[0],'THIRD_PARTY_FCU.txt'),['FCU bundled dependency notices',await readFile('dist/THIRD_PARTY_RENDERER_LICENSES.md','utf8'),await readFile('dist-electron/THIRD_PARTY_MAIN_LICENSES.txt','utf8'),'Match audio credits',audioCredits].join('\n\n'));
const manifest={schema:1,appVersion:config.version,platform,architecture:'x64',files:await inventory(output[0])};
await writeFile(join(output[0],'FCU-manifest.json'),JSON.stringify(manifest,null,2)+'\n');await verifyArtifact(output[0],manifest);
await writeFile('release/latest.json', JSON.stringify({ executable: join(output[0], platform === 'win32' ? `${brand.title}.exe` : 'fcu') }));
console.log(`Portable FCU folder: ${output.join(', ')}`);
