import { fileURLToPath, URL } from 'node:url';

import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';

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
      '/auth': 'http://localhost:30080',
      '/users': 'http://localhost:30080',
      '/api': 'http://localhost:30080',
      '/ws': {
        target: 'http://localhost:30080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
