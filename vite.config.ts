import { defineConfig } from 'vite';
export default defineConfig(({command})=>({
  root:'apps/game',base:'./',build:{outDir:'../../dist',emptyOutDir:true,license:{fileName:'THIRD_PARTY_RENDERER_LICENSES.md'}
  },worker:{format:'es'},
  plugins:[{name:'production-csp',transformIndexHtml(html){return command==='build'?html.replace("connect-src 'self' ws://localhost:5173","connect-src 'self'"):html;}}]
}));
