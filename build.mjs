import { build } from 'esbuild'
import { cp, rm } from 'node:fs/promises'

const root = new URL('.', import.meta.url)
const publicDir = new URL('./public', root)
const distDir = new URL('./dist', root)

await rm(distDir, { recursive: true, force: true })
await cp(publicDir, distDir, { recursive: true })

await build({
  entryPoints: {
    'scripts/background': './src/background.ts',
    'scripts/extension-popover': './src/extension-popover.ts',
    'scripts/open-popover': './src/open-popover/index.ts',
  },
  bundle: true,
  format: 'iife',
  outdir: './dist',
  platform: 'browser',
  target: 'chrome120',
})
