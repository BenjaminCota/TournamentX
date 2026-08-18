import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 4173,
    host: '0.0.0.0'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('leaflet')) return 'maps';
          if (id.includes('@stripe') || id.includes('qrcode') || id.includes('canvas-confetti')) return 'payments';
          if (id.includes('socket.io')) return 'realtime';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
});
