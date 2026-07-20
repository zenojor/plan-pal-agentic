import { PlanPalAgentRuntime } from '../packages/agent/src/runtime'
import { createInMemoryStores } from '../packages/db/src/memory'

export const stores = createInMemoryStores()
export const agentRuntime = new PlanPalAgentRuntime(stores)
