import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { createId, createPlanFromPrompt, nowIso, type AgentEvent, type AgentRun, type ToolCallRecord } from '@planpal/domain'
import { createFileBackedStores, createInMemoryStores } from '../src'

const tempDirs: string[] = []

describe('file-backed PlanPal stores', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })))
  })

  it('persists plans, runs, events, and tool calls across store instances', async () => {
    const dir = await makeTempDir()
    const filePath = join(dir, 'store.json')
    const first = createFileBackedStores(filePath)
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const savedPlan = { ...plan, currentVersion: 2, updatedAt: nowIso() }
    const run: AgentRun = {
      id: createId('run'),
      planId: plan.id,
      status: 'completed',
      inputMessage: '你是什么模型',
      createdAt: nowIso(),
      finishedAt: nowIso(),
    }
    const event: AgentEvent = {
      id: createId('evt'),
      runId: run.id,
      planId: plan.id,
      type: 'agent.finished',
      sequence: 1,
      message: 'done sk-secret-for-test Bearer abc.def',
      payload: { error: 'bad sk-secret-for-test Bearer abc.def', usedModel: false, fallbackUsed: true },
      createdAt: nowIso(),
    }
    const toolCall: ToolCallRecord = {
      id: createId('tool'),
      runId: run.id,
      toolName: 'poi.search',
      effect: 'read-only',
      argsJson: '{}',
      resultJson: '[]',
      status: 'success',
      durationMs: 2,
    }

    await first.plans.createPlan(plan)
    await first.plans.savePlan(savedPlan, 'command')
    await first.agents.createRun(run)
    await first.agents.appendEvent(event)
    await first.agents.appendToolCall(toolCall)

    const second = createFileBackedStores(filePath)
    await expect(second.plans.getPlan(plan.id)).resolves.toEqual(savedPlan)
    await expect(second.plans.listPlans()).resolves.toEqual([savedPlan])
    await expect(second.plans.listPlanVersions(plan.id)).resolves.toEqual([plan, savedPlan])
    await expect(second.agents.getRun(run.id)).resolves.toEqual(run)
    await expect(second.agents.listRuns(plan.id)).resolves.toEqual([run])
    await expect(second.agents.listToolCalls(run.id)).resolves.toEqual([toolCall])
    const persistedEvents = await second.agents.listEvents(plan.id)
    expect(persistedEvents[0]).toMatchObject({
      message: 'done [redacted] [redacted]',
      payload: { error: 'bad [redacted] [redacted]' },
    })

    const raw = await readFile(filePath, 'utf8')
    expect(raw).toContain(plan.id)
    expect(raw).toContain('poi.search')
    expect(raw).not.toContain('sk-secret-for-test')
    expect(raw).not.toContain('abc.def')
    expect(raw).not.toContain('Authorization')

    await expect(second.plans.deletePlan(plan.id)).resolves.toBe(true)
    await second.agents.deletePlanData(plan.id)
    const third = createFileBackedStores(filePath)
    await expect(third.plans.getPlan(plan.id)).resolves.toBeNull()
    await expect(third.plans.listPlans()).resolves.toEqual([])
    await expect(third.plans.listPlanVersions(plan.id)).resolves.toEqual([])
    await expect(third.agents.getRun(run.id)).resolves.toBeNull()
    await expect(third.agents.listRuns(plan.id)).resolves.toEqual([])
    await expect(third.agents.listToolCalls(run.id)).resolves.toEqual([])
    await expect(third.agents.listEvents(plan.id)).resolves.toEqual([])
    await expect(third.plans.deletePlan(plan.id)).resolves.toBe(false)
  })

  it('lists in-memory runs and tool calls by plan and run id', async () => {
    const stores = createInMemoryStores()
    const plan = await stores.plans.createPlan(createPlanFromPrompt('下午两个人看电影'))
    const otherPlan = await stores.plans.createPlan(createPlanFromPrompt('晚上吃饭'))
    const firstRun: AgentRun = {
      id: createId('run'),
      planId: plan.id,
      status: 'completed',
      inputMessage: '看电影',
      createdAt: '2026-06-23T10:00:00.000Z',
    }
    const secondRun: AgentRun = {
      id: createId('run'),
      planId: plan.id,
      status: 'completed',
      inputMessage: '买票',
      createdAt: '2026-06-23T10:01:00.000Z',
    }
    const otherRun: AgentRun = {
      id: createId('run'),
      planId: otherPlan.id,
      status: 'completed',
      inputMessage: '换饭店',
      createdAt: '2026-06-23T09:59:00.000Z',
    }
    const toolCall: ToolCallRecord = {
      id: createId('tool'),
      runId: secondRun.id,
      toolName: 'offering.search',
      effect: 'read-only',
      argsJson: '{}',
      resultJson: '{"ok":true}',
      status: 'success',
      durationMs: 3,
    }

    await stores.agents.createRun(secondRun)
    await stores.agents.createRun(otherRun)
    await stores.agents.createRun(firstRun)
    await stores.agents.appendToolCall(toolCall)

    await expect(stores.agents.listRuns(plan.id)).resolves.toEqual([firstRun, secondRun])
    await expect(stores.agents.listRuns(otherPlan.id)).resolves.toEqual([otherRun])
    await expect(stores.agents.listToolCalls(secondRun.id)).resolves.toEqual([toolCall])
    await expect(stores.agents.listToolCalls(firstRun.id)).resolves.toEqual([])
  })
})

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'planpal-store-'))
  tempDirs.push(dir)
  return dir
}




