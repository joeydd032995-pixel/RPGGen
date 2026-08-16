import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base:'./',
  build:{
    rollupOptions:{
      input:{
        game:resolve(import.meta.dirname,'index.html'),
        softwareRenderer:resolve(import.meta.dirname,'software-renderer.html'),
      },
    },
  },
});
