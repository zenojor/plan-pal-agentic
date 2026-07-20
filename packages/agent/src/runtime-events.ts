import { createId, nowIso, type AgentEvent, type AgentEventType } from '@planpal/domain'
import type { PlanPalStores } from '@planpal/db'
import type { AgentEventSink } from './runtime'

export class RuntimeEventEmitter {
  private sequence = 0

  private constructor(
    private readonly stores: PlanPalStores,
    private readonly sink: AgentEventSink,
    private readonly runId: string,
    private readonly planId: string,
  ) {}

  static async create(
    stores: PlanPalStores,
    sink: AgentEventSink,
    runId: string,
    planId: string,
  ) {
    const emitter = new RuntimeEventEmitter(stores, sink, runId, planId)
    const events = await stores.agents.listEvents(planId)
    emitter.sequence = events
      .filter((event) => event.runId === runId)
      .reduce((maximum, event) => Math.max(maximum, event.sequence), 0)
    return emitter
  }

  async emit(type: AgentEventType, message: string, payload?: unknown) {
    const event: AgentEvent = {
      id: createId('evt'),
      runId: this.runId,
      planId: this.planId,
      type,
      sequence: this.sequence + 1,
      message,
      payload,
      createdAt: nowIso(),
    }
    this.sequence = event.sequence
    await this.stores.agents.appendEvent(event)
    await this.sink(event)
    return event
  }

  nextSequence() {
    return this.sequence + 1
  }
}
