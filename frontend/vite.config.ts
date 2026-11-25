/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { contentModels } from './vite/contentModels.ts'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
// Model 3D galeri (ADR 40): content/assets/models → /models/* (dev) dan dist/models (build).
const modelsDir = fileURLToPath(new URL('../content/assets/models', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), contentModels(modelsDir)],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    // content/cities.yaml dibundel sebagai cadangan bila API tidak dapat dihubungi.
    fs: { allow: [repoRoot] },
    proxy: { '/api': 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
