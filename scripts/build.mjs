import { build } from 'esbuild';
await build({entryPoints:['apps/game/src/main/index.ts'],outfile:'dist-electron/main.js',bundle:true,platform:'node',format:'esm',external:['electron'],target:'node22'});
await build({entryPoints:['apps/game/src/preload/index.ts'],outfile:'dist-electron/preload.cjs',bundle:true,platform:'node',format:'cjs',external:['electron'],target:'node22'});
