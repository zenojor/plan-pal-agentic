import { build } from 'esbuild'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve, sep } from 'node:path'

const root = resolve(process.cwd())
const output = resolve(root, 'dist')
const serverDirectory = resolve(output, 'server')
const staticDirectory = resolve(output, 'static')
const publicDirectory = resolve(root, 'public')
const hosting = resolve(root, '.openai')
const workerEntry = resolve(root, 'scripts', 'sites-worker-entry.ts')
const workerStore = resolve(root, 'scripts', 'sites-worker-store.ts')
const guardedPrefix = `${root}${sep}`

for (const path of [output, serverDirectory, staticDirectory]) {
  if (!path.startsWith(guardedPrefix)) {
    throw new Error(`Refusing to prepare output outside the workspace: ${path}`)
  }
}

for (const required of [publicDirectory, hosting, workerEntry, workerStore]) {
  if (!existsSync(required)) {
    throw new Error(`Missing required Sites build input: ${required}`)
  }
}

rmSync(output, { force: true, recursive: true })
mkdirSync(serverDirectory, { recursive: true })
cpSync(publicDirectory, output, { recursive: true })
cpSync(publicDirectory, staticDirectory, { recursive: true })
cpSync(hosting, resolve(output, '.openai'), { recursive: true })

await build({
  entryPoints: [workerEntry],
  outfile: resolve(serverDirectory, 'index.js'),
  bundle: true,
  conditions: ['worker', 'browser', 'import', 'default'],
  external: ['node:*'],
  format: 'esm',
  legalComments: 'none',
  loader: { '.html': 'text' },
  mainFields: ['browser', 'module', 'main'],
  minify: false,
  platform: 'browser',
  plugins: [{
    name: 'sites-in-memory-store',
    setup(build) {
      build.onResolve({ filter: /^\.\/store$/ }, (args) => {
        if (args.importer === resolve(root, 'apps', 'api', 'src', 'index.ts')) {
          return { path: workerStore }
        }
        return undefined
      })
    },
  }],
  sourcemap: false,
  target: 'es2022',
})

writeFileSync(
  resolve(output, 'wrangler.jsonc'),
  `${JSON.stringify({
    main: 'server/index.js',
    compatibility_date: '2026-07-13',
    compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
    assets: {
      directory: 'static',
      binding: 'ASSETS',
    },
  }, null, 2)}\n`,
  'utf8',
)

assertArchiveSafeTree(output)

console.log('Prepared dist with a bundled Sites worker, metadata, and static assets.')

function assertArchiveSafeTree(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      assertArchiveSafeTree(entryPath)
      continue
    }

    if (!entry.isFile()) {
      throw new Error(`Unsupported archive member remains after packaging: ${entryPath}`)
    }
  }
}
