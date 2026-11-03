import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Fixture mode imports JSON from ../docs/fixtures and ../eval_results, so allow the repo root.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, fs: { allow: ['..'] } },
})
