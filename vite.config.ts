import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: '/tmp/ride-client-vite-cache',
  build: {
    outDir: '/tmp/ride-client-dist',
  },
  plugins: [react()],
})
