import { PlanPalAgentRuntime } from '../packages/agent/src/index'
import { createInMemoryStores } from '../packages/db/src/memory'

export const stores = createInMemoryStores()
export const agentRuntime = new PlanPalAgentRuntime(stores)
