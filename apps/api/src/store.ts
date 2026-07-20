import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createDefaultToolRegistry,
  createMemoryCheckpointer,
  createSqliteCheckpointer,
  defaultModelGateway,
  PlanPalAgentRuntime,
} from '@planpal/agent'
import { createFileBackedStores, createInMemoryStores } from '@planpal/db'

const useFileBackedStores = shouldUseFileBackedStores()
export const stores = useFileBackedStores
  ? createFileBackedStores()
  : createInMemoryStores()
const checkpointer = useFileBackedStores
  ? createLocalSqliteCheckpointer()
  : createMemoryCheckpointer()
export const agentRuntime = new PlanPalAgentRuntime(
  stores,
  createDefaultToolRegistry(),
  defaultModelGateway,
  checkpointer,
)

function createLocalSqliteCheckpointer() {
  const dataDirectory = resolve(process.cwd(), '.planpal-data')
  mkdirSync(dataDirectory, { recursive: true })
  return createSqliteCheckpointer(resolve(dataDirectory, 'langgraph-checkpoints.sqlite'))
}

function shouldUseFileBackedStores(env = process.env) {
  return env.PLANPAL_STORE_MODE !== 'memory'
    && env.NODE_ENV !== 'test'
    && !env.VITEST
}
