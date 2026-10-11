import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://restaurant-booking-backend-05xa.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})

