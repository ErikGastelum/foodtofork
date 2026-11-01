import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev`   -> http://localhost:5173 on this computer.
// `npm run phone` -> https://<this computer's IP>:5173 for phones on the same
//   Wi-Fi. Phones only allow the camera on https pages, so this mode uses a
//   self-signed certificate (accept the browser warning once). Backend calls
//   go to /api, which this dev server forwards to the backend on localhost:8000.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'phone' ? [basicSsl()] : [])],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}));
