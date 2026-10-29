import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The README says the app runs at http://localhost:5173 (Vite's default port).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
