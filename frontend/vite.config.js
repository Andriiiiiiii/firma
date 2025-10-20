import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 3000,
    open: true,
    // Проксируем API запросы на backend
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  
  preview: {
    port: 4173,
  },
  
  build: {
    target: 'es2020',
    minify: 'terser',
    
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          three: ['three']
        }
      }
    },
    
    assetsInlineLimit: 4096,
    emptyOutDir: true,
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'three'],
  },
})