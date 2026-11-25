// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contentModels, listModels, resolveModelPath } from './contentModels.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rupaloka-models-'))
  writeFileSync(join(dir, 'item-angklung.glb'), 'glb-a')
  writeFileSync(join(dir, 'galeri-bandung.glb'), 'glb-r')
  writeFileSync(join(dir, 'catatan.txt'), 'bukan model')
  mkdirSync(join(dir, 'sub'))
})

describe('listModels', () => {
  it('hanya .glb, terurut', () => {
    expect(listModels(dir)).toEqual(['galeri-bandung.glb', 'item-angklung.glb'])
  })

  it('folder belum ada = kosong', () => {
    expect(listModels(join(dir, 'tidak-ada'))).toEqual([])
  })
})

describe('resolveModelPath', () => {
  it('memetakan /models/<nama>.glb ke berkas', () => {
    expect(resolveModelPath(dir, '/models/item-angklung.glb')).toBe(join(dir, 'item-angklung.glb'))
    expect(resolveModelPath(dir, '/models/item-angklung.glb?v=1')).toBe(join(dir, 'item-angklung.glb'))
  })

  it.each([
    '/models/../package.json',
    '/models/%2e%2e%2fpackage.json',
    '/models/sub/x.glb',
    '/models/..\\x.glb',
    '/models/catatan.txt',
    '/models/tidak-ada.glb',
    '/lain/item-angklung.glb',
    '/models/%E0%A4%A',
  ])('menolak %s', (url) => {
    expect(resolveModelPath(dir, url)).toBeNull()
  })
})

describe('plugin', () => {
  it('generateBundle memancarkan tiap model ke models/', () => {
    const plugin = contentModels(dir)
    const emitFile = vi.fn()
    const hook = plugin.generateBundle as unknown as (this: { emitFile: typeof emitFile }) => void
    hook.call({ emitFile })
    expect(emitFile.mock.calls.map(([a]) => a.fileName)).toEqual([
      'models/galeri-bandung.glb',
      'models/item-angklung.glb',
    ])
    expect(String(emitFile.mock.calls[1][0].source)).toBe('glb-a')
  })

  it('middleware dev menyajikan model dan 404 untuk jalur ilegal', () => {
    const plugin = contentModels(dir)
    let handler: (req: { url?: string }, res: FakeRes, next: () => void) => void = () => {}
    const server = { middlewares: { use: (h: typeof handler) => (handler = h) } }
    ;(plugin.configureServer as unknown as (s: typeof server) => void)(server)

    const ok = new FakeRes()
    handler({ url: '/models/item-angklung.glb' }, ok, () => {})
    expect(ok.statusCode).toBe(200)
    expect(ok.headers['Content-Type']).toBe('model/gltf-binary')
    expect(String(ok.body)).toBe('glb-a')

    const bad = new FakeRes()
    handler({ url: '/models/../vite.config.ts' }, bad, () => {})
    expect(bad.statusCode).toBe(404)

    const next = vi.fn()
    handler({ url: '/src/main.tsx' }, new FakeRes(), next)
    expect(next).toHaveBeenCalled()
  })
})

class FakeRes {
  statusCode = 200
  headers: Record<string, string> = {}
  body: unknown
  setHeader(k: string, v: string) {
    this.headers[k] = v
  }
  end(body?: unknown) {
    this.body = body
  }
}
