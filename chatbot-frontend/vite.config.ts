import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  // 🎯 THÊM DÒNG NÀY ĐỂ FIX LỖI "process is not defined"
  define: {
    'process.env': {},
    'process.browser': true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget-entry.tsx'),
      name: 'ChatbotWidget',
      fileName: () => 'chatbot-widget.js',
      formats: ['iife'],
    },
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  },
});