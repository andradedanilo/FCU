import {build as viteBuild} from 'vite';
import {build} from 'esbuild';
await viteBuild({configFile:false,root:'apps/roster-tool',base:'./',build:{outDir:'../../dist-roster',emptyOutDir:true}});
await build({entryPoints:['apps/roster-tool/src/main.ts'],outfile:'dist-roster-electron/main.js',bundle:true,platform:'node',format:'esm',external:['electron'],target:'node22'});
await build({entryPoints:['apps/roster-tool/src/preload.ts'],outfile:'dist-roster-electron/preload.cjs',bundle:true,platform:'node',format:'cjs',external:['electron'],target:'node22'});
