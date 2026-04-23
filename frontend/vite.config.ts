import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Embed the git commit hash at build time so the frontend can detect stale deploys
const buildHash =
  process.env.RENDER_GIT_COMMIT?.slice(0, 7) ||
  process.env.VITE_BUILD_HASH ||
  'dev'

export default defineConfig({
  plugins: [react()],
  define: {
    // Accessible in source as the global constant __BUILD_HASH__
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
