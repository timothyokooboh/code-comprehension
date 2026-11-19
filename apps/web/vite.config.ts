import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { messages } from './src/locales/en.ts';

export default defineConfig({ plugins: [
  vue(),
  tailwindcss(),
  {
    name: 'catalog-document-title',
    transformIndexHtml: () => [{ tag: 'title', children: messages.app.title, injectTo: 'head' }],
  },
] });
