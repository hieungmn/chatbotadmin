import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin()
  ],

  // 🔴 ĐÂY LÀ PHẦN QUAN TRỌNG: Mở khóa để trang web khác gọi được vào localhost
  server: {
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },
  
  define: {
    'process.env.NODE_ENV': '"production"', 
  },

  build: {
    lib: {
      entry: 'src/main.tsx',       
      name: 'MyChatbot',           
      fileName: () => 'chatbot-widget.js', 
      formats: ['umd'],            
    },
    sourcemap: false,
    emptyOutDir: true,
  },
  preview: {
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  },
});