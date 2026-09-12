import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import electron from 'electron';
await import('./build.mjs');
const server=await createServer({server:{port:5173,strictPort:true,host:'localhost'}});await server.listen();
const child=spawn(electron,['.'],{stdio:'inherit',env:{...process.env,FCU_DEV_URL:'http://localhost:5173'}});
child.on('exit',async code=>{await server.close();process.exit(code??0);});
