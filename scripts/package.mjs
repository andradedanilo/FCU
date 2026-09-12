import { packager } from '@electron/packager';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { brand } from '../packages/contracts/src/index.ts';

const platform = process.argv[2];
if (platform !== 'win32' && platform !== 'linux') throw new Error('Choose win32 or linux.');
if (platform !== process.platform) throw new Error('Build each FCU folder on its native OS.');
const config = JSON.parse(await readFile('package.json', 'utf8'));
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
  appVersion: config.version, appBundleId: 'com.fcu.game', asar: true,
  // A unique output avoids deleting or overwriting another running prototype.
  prune: false, overwrite: false
});
await writeFile('release/latest.json', JSON.stringify({ executable: join(output[0], platform === 'win32' ? `${brand.title}.exe` : 'fcu') }));
console.log(`Portable FCU folder: ${output.join(', ')}`);
