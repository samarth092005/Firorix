import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-pdf': ['jspdf']
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4004',
        changeOrigin: true
      }
    }
  }
});
