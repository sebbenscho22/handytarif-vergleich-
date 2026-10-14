import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative Pfade: der Build läuft so auch in einem Unterordner (z. B. GitHub Pages).
  base: './',
})
