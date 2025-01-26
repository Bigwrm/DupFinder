import { defineConfig } from 'vite';
    import wasm from '@vitejs/plugin-wasm';

    export default defineConfig({
      plugins: [wasm()],
      optimizeDeps: {
        exclude: ['gpu.js']
      },
      server: {
        port: 3000
      }
    });
