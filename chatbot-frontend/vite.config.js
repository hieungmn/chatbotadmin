import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Đảm bảo trùng khớp với package.json
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin()
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },
  
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process': JSON.stringify({ env: { NODE_ENV: 'production' } }), // 🎯 Đã sửa: Chuẩn cú pháp JSON cho esbuild
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/widget-entry.tsx'),      
      name: 'MyChatbot',           
      // 🎯 SỬA DÒNG NÀY: Ép thẳng chuỗi tên file, không dùng hàm arrow nữa để tránh bị tự chèn đuôi iife
      fileName: 'chatbot-widget', 
      formats: ['iife'], 
    },
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        extend: true,
        // 🎯 THÊM ĐOẠN NÀY: Đảm bảo tên file xuất ra cố định 100% không dính chữ .iife.js
        entryFileNames: 'chatbot-widget.js',
      },
    },
  },
  
  preview: {
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  },
});