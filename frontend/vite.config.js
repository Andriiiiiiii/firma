import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 3000,
    open: true,
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
    
    // Оптимизируем для изображений
    assetsInlineLimit: 4096,
    
    // Не копируем большие файлы в bundle
    emptyOutDir: true,
  },
  
  // Оптимизация для изображений
  optimizeDeps: {
    include: ['react', 'react-dom', 'three'],
  },
})