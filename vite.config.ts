import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // face-api.js sozinho passa de 600 KB; isolamos os pesos-pesados em chunks
    // próprios para que não entrem no caminho crítico do primeiro carregamento.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('face-api.js')) return 'faceapi'
          if (id.includes('@firebase') || id.includes('/firebase/')) return 'firebase'
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'react'
          }
        },
      },
    },
  },
})
