import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { AgentEvent, AgentRun, Plan, ToolCallRecord } from '@planpal/domain'
import type { AgentRepository, PlanPalStores, PlanRepository } from './repository'

const DEFAULT_STORE_PATH = '.planpal-data/demo-store.json'
const SECRET_PATTERNS = [/sk-[A-Za-z0-9_-]+/g, /Bearer\s+[A-Za-z0-9._~+/=-]+/gi]

type JsonRecord<T> = Record<string, T>

type FileStoreData = {
  schemaVersion: 1
  plans: JsonRecord<Plan>
  versions: JsonRecord<Plan[]>
  runs: JsonRecord<AgentRun>
  events: JsonRecord<AgentEvent[]>
  toolCalls: JsonRecord<ToolCallRecord[]>
}

export function resolveDemoStorePath(value = process.env.PLANPAL_STORE_PATH) {
  const configured = value?.trim() || DEFAULT_STORE_PATH
  return resolve(process.cwd(), configured)
}

export function createFileBackedStores(filePath = resolveDemoStorePath()): PlanPalStores {
  const persistence = new JsonFileStore(filePath)
  return {
    plans: new FileBackedPlanRepository(persistence),
    agents: new FileBackedAgentRepository(persistence),
  }
}

class FileBackedPlanRepository implements PlanRepository {
  constructor(private readonly persistence: JsonFileStore) {}

  async createPlan(plan: Plan) {
    return this.persistence.mutate((data) => {
      const stored = cloneForStorage(plan)
      data.plans[stored.id] = stored
      data.versions[stored.id] = [stored]
      return cloneJson(stored)
    })
  }

  async getPlan(planId: string) {
    return this.persistence.snapshot((data) => cloneNullable(data.plans[planId] ?? null))
  }

  async listPlanVersions(planId: string) {
    return this.persistence.snapshot((data) => (data.versions[planId] ?? []).map((plan) => cloneJson(plan)))
  }

  async savePlan(plan: Plan, _createdBy: 'agent' | 'command' | 'system') {
    return this.persistence.mutate((data) => {
      const stored = cloneForStorage(plan)
      data.plans[stored.id] = stored
      const versions = data.versions[stored.id] ?? []
      versions.push(stored)
      data.versions[stored.id] = versions
      return cloneJson(stored)
    })
  }

  async deletePlan(planId: string) {
    return this.persistence.mutate((data) => {
      const existed = Boolean(data.plans[planId])
      delete data.plans[planId]
      delete data.versions[planId]
      return existed
    })
  }

  async listPlans() {
    return this.persistence.snapshot((data) => Object.values(data.plans)
      .map((plan) => cloneJson(plan))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)))
  }
}

class FileBackedAgentRepository implements AgentRepository {
  constructor(private readonly persistence: JsonFileStore) {}

  async createRun(run: AgentRun) {
    return this.persistence.mutate((data) => {
      const stored = cloneForStorage(run)
      data.runs[stored.id] = stored
      return cloneJson(stored)
    })
  }

  async saveRun(run: AgentRun) {
    return this.persistence.mutate((data) => {
      const stored = cloneForStorage(run)
      data.runs[stored.id] = stored
      return cloneJson(stored)
    })
  }

  async getRun(runId: string) {
    return this.persistence.snapshot((data) => cloneNullable(data.runs[runId] ?? null))
  }

  async deletePlanData(planId: string) {
    return this.persistence.mutate((data) => {
      const runIds = Object.values(data.runs)
        .filter((run) => run.planId === planId)
        .map((run) => run.id)
      for (const runId of runIds) {
        delete data.runs[runId]
        delete data.toolCalls[runId]
      }
      delete data.events[planId]
    })
  }

  async appendEvent(event: AgentEvent) {
    return this.persistence.mutate((data) => {
      const stored = cloneForStorage(event)
      const events = data.events[stored.planId] ?? []
      events.push(stored)
      data.events[stored.planId] = events
      return cloneJson(stored)
    })
  }

  async listEvents(planId: string) {
    return this.persistence.snapshot((data) => (data.events[planId] ?? []).map((event) => cloneJson(event)))
  }

  async appendToolCall(toolCall: ToolCallRecord) {
    return this.persistence.mutate((data) => {
      const stored = cloneForStorage(toolCall)
      const calls = data.toolCalls[stored.runId] ?? []
      calls.push(stored)
      data.toolCalls[stored.runId] = calls
      return cloneJson(stored)
    })
  }
}

class JsonFileStore {
  private data: FileStoreData | undefined
  private pending: Promise<void> = Promise.resolve()

  constructor(private readonly filePath: string) {}

  async snapshot<T>(selector: (data: FileStoreData) => T) {
    await this.pending
    const data = await this.load()
    return selector(data)
  }

  async mutate<T>(mutator: (data: FileStoreData) => T | Promise<T>) {
    let output: T | undefined
    const operation = this.pending.then(async () => {
      const data = await this.load()
      output = await mutator(data)
      await this.persist(data)
    })
    this.pending = operation.catch(() => undefined)
    await operation
    return output as T
  }

  private async load() {
    if (this.data) return this.data
    try {
      const raw = await readFile(this.filePath, 'utf8')
      this.data = normalizeData(JSON.parse(raw))
    } catch (error) {
      if (isMissingFileError(error)) {
        this.data = emptyData()
      } else {
        throw error
      }
    }
    return this.data
  }

  private async persist(data: FileStoreData) {
    await mkdir(dirname(this.filePath), { recursive: true })
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`
    await writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    await rename(tmpPath, this.filePath)
  }
}

function emptyData(): FileStoreData {
  return {
    schemaVersion: 1,
    plans: {},
    versions: {},
    runs: {},
    events: {},
    toolCalls: {},
  }
}

function normalizeData(value: unknown): FileStoreData {
  if (!value || typeof value !== 'object') return emptyData()
  const input = value as Partial<FileStoreData>
  return {
    schemaVersion: 1,
    plans: normalizeRecord(input.plans),
    versions: normalizeRecord(input.versions),
    runs: normalizeRecord(input.runs),
    events: normalizeRecord(input.events),
    toolCalls: normalizeRecord(input.toolCalls),
  }
}

function normalizeRecord<T>(value: unknown): Record<string, T> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, T>
}

function cloneNullable<T>(value: T | null) {
  return value === null ? null : cloneJson(value)
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function cloneForStorage<T>(value: T): T {
  return redactSecrets(cloneJson(value)) as T
}

function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') return redactSecretText(value)
  if (Array.isArray(value)) return value.map(redactSecrets)
  if (!value || typeof value !== 'object') return value
  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    output[key] = redactSecrets(child)
  }
  return output
}

function redactSecretText(value: string) {
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[redacted]'), value)
}

function isMissingFileError(error: unknown) {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'ENOENT')
}






