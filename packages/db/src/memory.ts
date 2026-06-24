import type { AgentEvent, AgentRun, Plan, ToolCallRecord } from '@planpal/domain'
import type { AgentRepository, PlanPalStores, PlanRepository } from './repository'

export class InMemoryPlanRepository implements PlanRepository {
  private readonly plans = new Map<string, Plan>()
  private readonly versions = new Map<string, Plan[]>()

  async createPlan(plan: Plan) {
    this.plans.set(plan.id, plan)
    this.versions.set(plan.id, [plan])
    return plan
  }

  async getPlan(planId: string) {
    return this.plans.get(planId) ?? null
  }

  async listPlanVersions(planId: string) {
    return [...(this.versions.get(planId) ?? [])]
  }

  async savePlan(plan: Plan) {
    this.plans.set(plan.id, plan)
    const versions = this.versions.get(plan.id) ?? []
    versions.push(plan)
    this.versions.set(plan.id, versions)
    return plan
  }

  async deletePlan(planId: string) {
    const existed = this.plans.delete(planId)
    this.versions.delete(planId)
    return existed
  }

  async listPlans() {
    return [...this.plans.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }
}

export class InMemoryAgentRepository implements AgentRepository {
  private readonly runs = new Map<string, AgentRun>()
  private readonly events = new Map<string, AgentEvent[]>()
  private readonly toolCalls = new Map<string, ToolCallRecord[]>()

  async createRun(run: AgentRun) {
    this.runs.set(run.id, run)
    return run
  }

  async saveRun(run: AgentRun) {
    this.runs.set(run.id, run)
    return run
  }

  async getRun(runId: string) {
    return this.runs.get(runId) ?? null
  }

  async listRuns(planId: string) {
    return [...this.runs.values()]
      .filter((run) => run.planId === planId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  }

  async deletePlanData(planId: string) {
    const runIds = [...this.runs.values()]
      .filter((run) => run.planId === planId)
      .map((run) => run.id)
    for (const runId of runIds) {
      this.runs.delete(runId)
      this.toolCalls.delete(runId)
    }
    this.events.delete(planId)
  }

  async appendEvent(event: AgentEvent) {
    const events = this.events.get(event.planId) ?? []
    events.push(event)
    this.events.set(event.planId, events)
    return event
  }

  async listEvents(planId: string) {
    return this.events.get(planId) ?? []
  }

  async appendToolCall(toolCall: ToolCallRecord) {
    const calls = this.toolCalls.get(toolCall.runId) ?? []
    calls.push(toolCall)
    this.toolCalls.set(toolCall.runId, calls)
    return toolCall
  }

  async listToolCalls(runId: string) {
    return this.toolCalls.get(runId) ?? []
  }
}

export function createInMemoryStores(): PlanPalStores {
  return {
    plans: new InMemoryPlanRepository(),
    agents: new InMemoryAgentRepository(),
  }
}



