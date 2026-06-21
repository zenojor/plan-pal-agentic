import { PlanPalAgentRuntime } from '@planpal/agent'
import { createFileBackedStores, createInMemoryStores } from '@planpal/db'

export const stores = shouldUseFileBackedStores()
  ? createFileBackedStores()
  : createInMemoryStores()
export const agentRuntime = new PlanPalAgentRuntime(stores)

function shouldUseFileBackedStores(env = process.env) {
  return env.PLANPAL_STORE_MODE !== 'memory'
    && env.NODE_ENV !== 'test'
    && !env.VITEST
}
