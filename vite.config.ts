import { defineConfig } from 'vite';
export default defineConfig({ root: 'apps/game', base: './', build: { outDir: '../../dist', emptyOutDir: true }, worker: { format: 'es' } });
