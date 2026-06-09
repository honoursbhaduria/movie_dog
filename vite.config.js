import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/tmdb-proxy': {
        target: 'https://api.tmdb.org/3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tmdb-proxy/, ''),
        headers: {
          'Referer': 'https://www.tmdb.org/',
          'Origin': 'https://www.tmdb.org/'
        }
      },
      '/tmdb-image-proxy': {
        target: 'https://image.tmdb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tmdb-image-proxy/, '')
      }
    }
  }
})
