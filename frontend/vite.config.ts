import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/impairments': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
      '/properties': 'http://localhost:8000',
      '/jurisdictions': 'http://localhost:8000',
      '/deficiencies': 'http://localhost:8000',
      '/demo': 'http://localhost:8000',
    },
  },
})
