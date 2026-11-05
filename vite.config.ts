import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const PORT = 5273

export default defineConfig({
  // Relative asset paths, so the build works both at localhost and under github.io/<repo>/.
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
})
