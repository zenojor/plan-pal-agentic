import type { AgentEvent, AgentRun, Plan, ToolCallRecord } from '@planpal/domain'

export type PlanRepository = {
  createPlan(plan: Plan): Promise<Plan>
  getPlan(planId: string): Promise<Plan | null>
  listPlanVersions(planId: string): Promise<Plan[]>
  savePlan(plan: Plan, createdBy: 'agent' | 'command' | 'system'): Promise<Plan>
  deletePlan(planId: string): Promise<boolean>
  listPlans(): Promise<Plan[]>
}

export type AgentRepository = {
  createRun(run: AgentRun): Promise<AgentRun>
  saveRun(run: AgentRun): Promise<AgentRun>
  getRun(runId: string): Promise<AgentRun | null>
  listRuns(planId: string): Promise<AgentRun[]>
  deletePlanData(planId: string): Promise<void>
  appendEvent(event: AgentEvent): Promise<AgentEvent>
  listEvents(planId: string): Promise<AgentEvent[]>
  appendToolCall(toolCall: ToolCallRecord): Promise<ToolCallRecord>
  listToolCalls(runId: string): Promise<ToolCallRecord[]>
}

export type PlanPalStores = {
  plans: PlanRepository
  agents: AgentRepository
}



