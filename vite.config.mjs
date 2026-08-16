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
      output:{
        manualChunks(id){if(id.includes('/node_modules/three/'))return 'three';},
      },
    },
  },
});
