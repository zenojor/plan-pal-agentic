import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { interrupt } from '@langchain/langgraph'
import {
  applyPlanCommand,
  type Plan,
  type PlanCommand,
  type PlanPatch,
} from '@planpal/domain'
import type { PlanPalGraphDependencies } from '../graph-types'
import { FinalAgentResponseSchema, PlanPalResumeSchema, type PlanPalResume } from '../schemas'
import type { PlanPalGraphStateUpdate, PlanPalGraphStateValue } from '../state'
import { withNodePath } from '../state'

export function createApprovalNodes(deps: PlanPalGraphDependencies) {
  return {
    requestApproval: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      if (!state.pendingApproval) return failure(state, 'requestApproval', 'Approval payload is missing', false)
      const resumed = PlanPalResumeSchema.parse(
        interrupt<typeof state.pendingApproval, PlanPalResume>(state.pendingApproval),
      )
      if (resumed.actionId !== state.pendingApproval.actionId) {
        return failure(state, 'requestApproval', 'Resume actionId does not match the interrupt', false)
      }
      return {
        resume: resumed,
        metadata: { ...withNodePath(state, 'requestApproval'), resumed: true },
      }
    },

    applyCommand: async (state: PlanPalGraphStateValue) => {
      const proposal = state.proposedCommands.at(-1)
      const resume = state.resume
      if (!state.plan || !proposal || !resume) {
        const missing = [!state.plan ? 'plan' : '', !proposal ? 'proposal' : '', !resume ? 'resume' : ''].filter(Boolean).join(', ')
        return failure(state, 'applyCommand', `Resume context is missing: ${missing}`, false)
      }
      const current = await deps.stores.plans.getPlan(state.planId)
      if (!current) return failure(state, 'applyCommand', 'Plan not found during resume', false)
      if (current.currentVersion !== state.baseVersion) {
        return failure(
          state,
          'applyCommand',
          `Plan version changed from V${state.baseVersion} to V${current.currentVersion}`,
          false,
        )
      }
      if (resume.decision === 'retry') {
        const dismissed = applyPlanCommand(current, {
          type: 'DISMISS_PENDING_ACTION',
          source: 'action-card',
          actionId: proposal.actionId,
        }, state.runId)
        await deps.stores.plans.savePlan(dismissed.plan, 'agent')
        return {
            plan: dismissed.plan,
            baseVersion: dismissed.plan.currentVersion,
            proposedCommands: [],
            pendingApproval: null,
            resume: null,
            metadata: {
              ...withNodePath(state, 'applyCommand'),
              activeToolCallIds: [],
              excludedCandidateIds: state.pendingApproval?.action.kind === 'candidate-selection'
                ? state.pendingApproval.action.candidates.map((candidate) => candidate.id)
                : state.metadata.excludedCandidateIds,
              continuation: 'planning',
            },
          }
      }
      if (proposal.kind === 'clarification' && resume.decision === 'answered' && resume.answer?.trim()) {
        const dismissed = applyPlanCommand(current, {
          type: 'DISMISS_PENDING_ACTION',
          source: 'action-card',
          actionId: proposal.actionId,
        }, state.runId)
        await deps.stores.plans.savePlan(dismissed.plan, 'agent')
        return {
            messages: [new HumanMessage(resume.answer.trim())],
            plan: dismissed.plan,
            baseVersion: dismissed.plan.currentVersion,
            proposedCommands: [],
            pendingApproval: null,
            resume: null,
            route: null,
            intent: null,
            metadata: {
              ...withNodePath(state, 'applyCommand'),
              userMessage: resume.answer.trim(),
              activeToolCallIds: [],
              continuation: 'intent',
            },
          }
      }
      if (resume.decision === 'rejected') {
        const dismissed = applyPlanCommand(current, {
          type: 'DISMISS_PENDING_ACTION',
          source: 'action-card',
          actionId: proposal.actionId,
        }, state.runId)
        await deps.stores.plans.savePlan(dismissed.plan, 'agent')
        return completedUpdate(
          state,
          dismissed.plan,
          '已取消，计划未变化。',
          'cancelled',
          [{ type: 'DISMISS_PENDING_ACTION', source: 'action-card', actionId: proposal.actionId }],
          [dismissed.patch],
        )
      }
      try {
        const result = await executeProposal(deps, current, state.runId, proposal, resume)
        return completedUpdate(
          state,
          result.plan,
          result.message,
          'completed',
          result.commands,
          result.patches,
        )
      } catch (error) {
        return failure(state, 'applyCommand', redactError(error), true)
      }
    },

    finalize: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      if (state.response) {
        return { metadata: withNodePath(state, 'finalize') }
      }
      const status = state.error ? 'failed' : 'completed'
      const text = state.error?.message ?? '已完成。'
      return {
        response: FinalAgentResponseSchema.parse({
          runId: state.runId,
          planId: state.planId,
          status,
          text,
          route: state.route?.kind ?? 'clarification',
          planVersion: state.resultPlan?.currentVersion ?? state.plan?.currentVersion,
          fallbackUsed: state.metadata.fallbackReasons.length > 0,
        }),
        messages: [new AIMessage(text)],
        metadata: withNodePath(state, 'finalize'),
      }
    },

    handleError: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      const failedTool = state.toolResults.find((result) => (
        state.metadata.activeToolCallIds.includes(result.toolCallId) && result.status === 'error'
      ))
      const message = state.error?.message ?? failedTool?.error ?? 'Agent execution failed'
      if (state.error?.recoverable !== false) {
        return {
          route: {
            kind: 'clarification',
            title: '需要补充信息',
            description: `自动重试后仍无法继续：${message}`,
            requiredFields: ['换一种描述', '提供更具体的目标或偏好'],
            reason: 'recoverable graph fallback',
          },
          error: null,
          metadata: {
            ...withNodePath(state, 'handleError'),
            fallbackReasons: [...state.metadata.fallbackReasons, `recovery:${message}`],
          },
        }
      }
      return {
        response: FinalAgentResponseSchema.parse({
          runId: state.runId,
          planId: state.planId,
          status: 'failed',
          text: message,
          route: state.route?.kind ?? 'clarification',
          planVersion: state.plan?.currentVersion,
          fallbackUsed: state.metadata.fallbackReasons.length > 0,
        }),
        metadata: withNodePath(state, 'handleError'),
      }
    },
  }
}

async function executeProposal(
  deps: PlanPalGraphDependencies,
  initial: Plan,
  runId: string,
  proposal: PlanPalGraphStateValue['proposedCommands'][number],
  resume: PlanPalResume,
) {
  let plan = initial
  const commands: PlanCommand[] = []
  const patches: PlanPatch[] = []
  const apply = async (command: PlanCommand) => {
    const result = applyPlanCommand(plan, command, runId)
    plan = result.plan
    commands.push(command)
    patches.push(result.patch)
    await deps.stores.plans.savePlan(plan, 'agent')
  }
  const proposed = proposal.commands[0] as PlanCommand
  if (proposal.kind === 'candidate-selection') {
    const candidateId = requireValue(resume.candidateId, 'candidateId')
    const candidates = proposed.type === 'REFRESH_CANDIDATES' ? proposed.candidates ?? [] : []
    if (!candidates.some((candidate) => candidate.id === candidateId)) throw new Error('Candidate is not part of this approval')
    await apply({ type: 'CHOOSE_CANDIDATE', source: 'action-card', actionId: proposal.actionId, candidateId })
    return { plan, commands, patches, message: '候选已应用，可通过版本撤销。' }
  }
  if (proposal.kind === 'service-selection') {
    const offeringId = requireValue(resume.offeringId, 'offeringId')
    if (proposed.type !== 'REFRESH_SERVICE_ITEMS') throw new Error('Service proposal is invalid')
    if (!proposed.offerings?.some((offering) => offering.id === offeringId)) throw new Error('Offering is not part of this approval')
    await apply({
      type: 'SELECT_SERVICE_ITEM',
      source: 'action-card',
      segmentId: proposed.segmentId,
      merchantId: requireValue(proposed.merchantId, 'merchantId'),
      offeringId,
      quantity: resume.quantity,
    })
    return { plan, commands, patches, message: '商品或服务已选择。' }
  }
  if (proposal.kind === 'command-approval') {
    if (resume.decision !== 'approved') throw new Error('Command approval requires an approved decision')
    const confirmedCommands = plan.pendingAction?.kind === 'command-confirmation'
      ? plan.pendingAction.commands.map((command) => ({ ...command, source: 'action-card' as const }))
      : []
    await apply({ type: 'CONFIRM_COMMAND_ACTION', source: 'action-card', actionId: proposal.actionId })
    // CONFIRM_COMMAND_ACTION applies the wrapped commands inside the domain
    // boundary. Keep those effective writes in the graph trace as first-class
    // commands instead of hiding them behind the wrapper command.
    const confirmationPatch = patches.at(-1)
    commands.push(...confirmedCommands)
    if (confirmationPatch) patches.push(...confirmedCommands.map(() => confirmationPatch))
    return { plan, commands, patches, message: '已应用修改，可撤销' }
  }
  if (proposal.kind === 'clarification') {
    return { plan, commands, patches, message: '未收到有效的补充信息，计划未变化。' }
  }
  throw new Error('Plan variant resume is not available for this proposal')
}

function completedUpdate(
  state: PlanPalGraphStateValue,
  plan: Plan,
  text: string,
  status: 'completed' | 'cancelled',
  commands: PlanCommand[],
  patches: PlanPatch[],
): PlanPalGraphStateUpdate {
  return {
    resultPlan: plan,
    plan,
    error: null,
    pendingApproval: null,
    messages: [new AIMessage(text)],
    response: FinalAgentResponseSchema.parse({
      runId: state.runId,
      planId: state.planId,
      status,
      text,
      route: state.route?.kind ?? 'clarification',
      planVersion: plan.currentVersion,
      fallbackUsed: state.metadata.fallbackReasons.length > 0,
    }),
    metadata: {
      ...withNodePath(state, 'applyCommand'),
      appliedCommands: commands,
      appliedPatches: patches,
    },
  }
}

function failure(
  state: PlanPalGraphStateValue,
  node: string,
  message: string,
  recoverable: boolean,
): PlanPalGraphStateUpdate {
  return {
    error: { code: 'GRAPH_EXECUTION_ERROR', message, recoverable, node },
    metadata: withNodePath(state, node),
  }
}

function requireValue(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is required`)
  return value
}

function redactError(error: unknown) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
}
