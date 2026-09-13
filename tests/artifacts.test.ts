import {it,expect} from 'vitest';
import {mkdtemp,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {inventory,verifyArtifact,treeHash} from '../scripts/artifacts.ts';
import {steamPreview} from '../scripts/steam-preview.ts';
it('verifies a complete package and detects altered, added or unsafe manifest entries',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fcu-artifact-'));await mkdir(join(root,'resources'));await writeFile(join(root,'resources','app.asar'),'original');
 await writeFile(join(root,'Football Club Universe.exe'),'fixture executable');
 const files=await inventory(root),manifest={schema:1,appVersion:'0.9.0',platform:'win32',architecture:'x64',files};
 await writeFile(join(root,'FCU-manifest.json'),JSON.stringify(manifest));expect((await verifyArtifact(root,manifest)).files).toEqual(files);const original=await treeHash(root,['FCU-manifest.json']);
 const preview=await steamPreview(root,'1000','1001');expect(preview).toContain('"Preview" "1"');expect(preview).not.toContain('SetLive');expect(preview).toContain('"LocalPath" "resources/app.asar"');
 await writeFile(join(root,'resources','app.asar'),'modified');await expect(verifyArtifact(root,manifest)).rejects.toThrow('do not match');expect(await treeHash(root,['FCU-manifest.json'])).not.toBe(original);
 await expect(steamPreview(root,'1000','1001')).rejects.toThrow('do not match');
 await writeFile(join(root,'resources','app.asar'),'original');await writeFile(join(root,'extra.bin'),'extra');await expect(verifyArtifact(root,manifest)).rejects.toThrow('do not match');
 await expect(verifyArtifact(root,{...manifest,files:[{...files[0],path:'../outside'}]})).rejects.toThrow('do not match');
});
