import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: imprescindible para que el build funcione dentro de un SCORM/LMS
  base: './',
  plugins: [react()],
})
