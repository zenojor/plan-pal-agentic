import { defineConfig, type Plugin } from 'vite'
import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function animalIslandAssetUrlFix(): Plugin {
  return {
    name: 'planpal-animal-island-asset-url-fix',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/')
      if (!normalizedId.includes('/animal-island-ui/') || !normalizedId.endsWith('/dist/index.css')) {
        return null
      }
      const fixed = code.replace(/(?:\.\.\/){3}files\//g, './files/')
      return fixed === code ? null : { code: fixed, map: null }
    },
  }
}

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: '../../public',
  },
  plugins: [
    animalIslandAssetUrlFix(),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    port: 5174,
  },
})
