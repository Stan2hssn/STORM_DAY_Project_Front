import { fileURLToPath, URL } from 'node:url';

import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import vueDevTools from 'vite-plugin-vue-devtools';

const BACKEND_TARGET = 'http://localhost:8080';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    glsl(),
    ui({
      router: true,
      colorMode: false
    }),
    vueDevTools(
      {
        launchEditor: 'cursor'
      }
    ),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/ws': { target: BACKEND_TARGET, ws: true, changeOrigin: true },
      '/api': { target: BACKEND_TARGET, changeOrigin: true },
      '/auth': { target: BACKEND_TARGET, changeOrigin: true },
      '/users': { target: BACKEND_TARGET, changeOrigin: true },
      '/media': { target: BACKEND_TARGET, changeOrigin: true },
      '/media-files': { target: 'http://localhost:9000', changeOrigin: true, rewrite: (path) => path.replace(/^\/media-files/, '') },
    }
  }
});
