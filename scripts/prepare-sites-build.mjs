import { build } from 'esbuild'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { extname, relative, resolve, sep } from 'node:path'

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

const buildResult = await build({
  entryPoints: [workerEntry],
  outfile: resolve(serverDirectory, 'index.js'),
  bundle: true,
  // Cloudflare Workers supports node:async_hooks when nodejs_compat is enabled.
  // Do not select the browser export here: LangGraph's browser entry skips its
  // AsyncLocalStorage initialization, which makes interrupt() lose the active
  // graph config and fail with "Called interrupt() outside the context of a graph."
  conditions: ['worker', 'import', 'default'],
  external: ['node:*'],
  format: 'esm',
  legalComments: 'none',
  loader: { '.html': 'text' },
  mainFields: ['browser', 'module', 'main'],
  metafile: true,
  minify: true,
  // `platform: 'browser'` implicitly enables the browser export condition even
  // when it is omitted above. A Worker is a neutral ESM runtime with selected
  // Node compatibility APIs, so keep condition selection explicit.
  platform: 'neutral',
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
  }, {
    name: 'sites-embedded-static-assets',
    setup(build) {
      build.onResolve({ filter: /^sites:static-assets$/ }, () => ({
        namespace: 'sites-static-assets',
        path: 'sites:static-assets',
      }))
      build.onLoad({ filter: /.*/, namespace: 'sites-static-assets' }, () => ({
        contents: `export default ${JSON.stringify(readStaticAssets(publicDirectory))}`,
        loader: 'js',
      }))
    },
  }],
  sourcemap: false,
  target: 'es2022',
})

assertLangGraphAsyncContextBundled(buildResult.metafile)

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

function assertLangGraphAsyncContextBundled(metafile) {
  const normalizedInputs = Object.keys(metafile.inputs).map((path) => path.replaceAll('\\', '/'))
  const hasLangGraphNodeInitializer = normalizedInputs.some((path) => (
    path.includes('/@langchain/langgraph/dist/node.js')
  ))
  const importsAsyncHooks = Object.values(metafile.outputs).some((output) => (
    output.imports.some((entry) => entry.external && entry.path === 'node:async_hooks')
  ))

  if (!hasLangGraphNodeInitializer || !importsAsyncHooks) {
    throw new Error(
      'Sites worker was built without LangGraph AsyncLocalStorage support; interrupt/resume would fail at runtime.',
    )
  }
}

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

function readStaticAssets(directory) {
  const assets = {}
  const pending = [directory]

  while (pending.length > 0) {
    const current = pending.pop()
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = resolve(current, entry.name)
      if (entry.isDirectory()) {
        pending.push(entryPath)
        continue
      }
      if (!entry.isFile()) {
        throw new Error(`Unsupported static asset type: ${entryPath}`)
      }

      const pathname = `/${relative(directory, entryPath).split(sep).join('/')}`
      assets[pathname] = {
        body: readFileSync(entryPath).toString('base64'),
        contentType: contentTypeFor(entryPath),
      }
    }
  }

  return assets
}

function contentTypeFor(path) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  })[extname(path).toLowerCase()] ?? 'application/octet-stream'
}
