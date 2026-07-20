import type { BaseCheckpointSaver } from '@langchain/langgraph'
import type { PlanPalStores } from '@planpal/db'
import type { ClientModelConfig } from './model'
import type { AgentModelGateway } from './graph-model'
import type { ToolRegistry } from './tools'

export type PlanPalGraphDependencies = {
  stores: PlanPalStores
  tools: ToolRegistry
  modelGateway: AgentModelGateway
  modelConfig: ClientModelConfig
  checkpointer?: BaseCheckpointSaver
}
