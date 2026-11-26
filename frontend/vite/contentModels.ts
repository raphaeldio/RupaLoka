/**
 * Plugin Vite: sajikan model 3D galeri dari `content/assets/models/` di `/models/*`
 * (SDD ADR 40, rencana T-116). GLB tetap disimpan dan divalidasi di `content/`; saat
 * build disalin ke `dist/models/` agar disajikan CDN Vercel, bukan `/api/assets` di
 * Render (paket gratis tidur, unduhan besar gagal saat *cold start*).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

export const MODELS_PREFIX = '/models/'
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.glb$/

/** Nama berkas .glb di `dir` (terurut); folder belum ada = kosong. */
export function listModels(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((n) => SAFE_NAME.test(n) && statSync(join(dir, n)).isFile())
      .sort()
  } catch {
    return []
  }
}

/** `/models/<nama>.glb` → jalur berkas di `dir`, atau null (tanpa path traversal). */
export function resolveModelPath(dir: string, url: string): string | null {
  const path = url.split(/[?#]/, 1)[0]
  if (!path.startsWith(MODELS_PREFIX)) return null
  let name: string
  try {
    name = decodeURIComponent(path.slice(MODELS_PREFIX.length))
  } catch {
    return null
  }
  if (!SAFE_NAME.test(name) || name.includes('..')) return null
  const file = join(dir, name)
  try {
    return statSync(file).isFile() ? file : null
  } catch {
    return null
  }
}

export function contentModels(dir: string): Plugin {
  return {
    name: 'rupaloka-content-models',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(MODELS_PREFIX)) return next()
        const file = resolveModelPath(dir, req.url)
        if (!file) {
          res.statusCode = 404
          res.end()
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'model/gltf-binary')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(readFileSync(file))
      })
    },
    generateBundle() {
      for (const name of listModels(dir)) {
        this.emitFile({ type: 'asset', fileName: `models/${name}`, source: readFileSync(join(dir, name)) })
      }
    },
  }
}
