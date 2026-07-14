import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve, sep } from 'node:path'

if (process.platform === 'win32') {
  console.log('Skipping OpenNext packaging on Windows; Sites runs this step on Linux.')
  process.exit(0)
}

const result = spawnSync('npm', ['run', 'build:opennext'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  shell: false,
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const root = resolve(process.cwd())
const output = resolve(root, 'dist')
const guardedPrefix = `${root}${sep}`

if (!output.startsWith(guardedPrefix)) {
  throw new Error(`Refusing to prepare output outside the workspace: ${output}`)
}

const openNext = resolve(root, '.open-next')
const assets = resolve(openNext, 'assets')
const hosting = resolve(root, '.openai')
const wrangler = resolve(root, 'wrangler.jsonc')

function copyTreeDereferenced(source, destination) {
  const copy = spawnSync('cp', ['-RL', source, destination], {
    encoding: 'utf8',
    shell: false,
    stdio: 'inherit',
  })

  if (copy.status !== 0) {
    process.exit(copy.status ?? 1)
  }
}

function pruneDanglingSymlinks(directory) {
  const prune = spawnSync('find', [directory, '-xtype', 'l', '-delete'], {
    encoding: 'utf8',
    shell: false,
    stdio: 'inherit',
  })

  if (prune.status !== 0) {
    process.exit(prune.status ?? 1)
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

for (const required of [openNext, assets, hosting, wrangler]) {
  if (!existsSync(required)) {
    throw new Error(`Missing required Sites build input: ${required}`)
  }
}

rmSync(output, { force: true, recursive: true })
mkdirSync(output, { recursive: true })
const serverDirectory = resolve(output, 'server')
mkdirSync(serverDirectory, { recursive: true })
pruneDanglingSymlinks(openNext)
copyTreeDereferenced(openNext, resolve(serverDirectory, 'open-next'))
cpSync(hosting, resolve(output, '.openai'), { recursive: true })
cpSync(wrangler, resolve(output, 'wrangler.jsonc'))
cpSync(assets, output, {
  dereference: true,
  recursive: true,
})

writeFileSync(
  resolve(serverDirectory, 'index.js'),
  "export { default } from './open-next/worker.js'\n",
  'utf8',
)

assertArchiveSafeTree(output)

console.log('Prepared dist with Sites server entrypoint, OpenNext worker, metadata, and static assets.')
