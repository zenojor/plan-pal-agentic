import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { createId, type CandidateOption, type MerchantOffering, type PendingAction, type PlanCommand } from '@planpal/domain'
import type { PlanPalGraphDependencies } from '../graph-types'
import { invokeToolCallingModel } from '../graph-model'
import { buildPendingActionPreviewResult } from '../proposal'
import {
  PlanCommandProposalSchema,
  PlanPalInterruptSchema,
  ToolCallRequestSchema,
  type PlanCommandProposal,
  type ToolCallRequest,
  type ToolResult,
} from '../schemas'
import type { PlanPalGraphStateUpdate, PlanPalGraphStateValue } from '../state'
import { withNodePath } from '../state'

export function createPlanningNodes(deps: PlanPalGraphDependencies) {
  return {
    planningAgent: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      const expected = expectedToolName(state)
      if (!expected) return { metadata: { ...withNodePath(state, 'planningAgent'), continuation: null } }
      let message: AIMessage | null = null
      let requests: ToolCallRequest[] = []
      let fallbackReason: string | undefined
      try {
        message = await invokeToolCallingModel({
          config: deps.modelConfig,
          gateway: deps.modelGateway,
          messages: [
            new SystemMessage(`Select and call ${expected}. Use planId ${state.planId}. Do not answer in prose.`),
            ...state.messages.slice(-8),
          ],
          tools: deps.tools.list(),
        })
        requests = readToolCalls(message).filter((call) => call.name === expected)
        if (requests.length === 0) fallbackReason = `tool-selection:model-did-not-call-${expected}`
      } catch (error) {
        const reason = redactError(error)
        return {
          error: {
            code: 'MODEL_UNAVAILABLE',
            message: `模型工具调用失败：${reason}`,
            recoverable: false,
            node: 'planningAgent',
          },
          metadata: {
            ...withNodePath(state, 'planningAgent'),
            modelCalls: state.metadata.modelCalls + 1,
            continuation: null,
          },
        }
      }
      if (requests.length === 0) {
        const request = deterministicToolCall(state, expected)
        requests = [request]
        message = new AIMessage({ content: '', tool_calls: [request] })
      }
      return {
        messages: message ? [message] : [],
        toolCalls: requests,
        metadata: {
          ...withNodePath(state, 'planningAgent'),
          activeToolCallIds: requests.map((request) => request.id),
          modelCalls: state.metadata.modelCalls + 1,
          fallbackReasons: fallbackReason
            ? [...state.metadata.fallbackReasons, fallbackReason]
            : state.metadata.fallbackReasons,
          continuation: null,
        },
      }
    },

    callTools: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      const requests = state.toolCalls.filter((call) => state.metadata.activeToolCallIds.includes(call.id))
      const invocations = await Promise.all(requests.map((request) => deps.tools.invoke(state.runId, request, 2)))
      return {
        messages: invocations.map((invocation) => invocation.message),
        toolResults: invocations.map((invocation) => invocation.result),
        metadata: {
          ...withNodePath(state, 'callTools'),
          toolRetries: state.metadata.toolRetries
            + invocations.reduce((sum, invocation) => sum + Math.max(0, invocation.result.attempts - 1), 0),
        },
      }
    },

    buildCommandProposal: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      if (!state.route) return graphError(state, 'buildCommandProposal', 'Route is missing')
      const proposal = buildProposal(state)
      return {
        proposedCommands: [PlanCommandProposalSchema.parse(proposal)],
        error: null,
        metadata: withNodePath(state, 'buildCommandProposal'),
      }
    },

    validateProposal: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      const proposal = state.proposedCommands.at(-1)
      if (!state.plan || !state.route || !proposal) {
        return graphError(state, 'validateProposal', 'Proposal context is missing')
      }
      try {
        const preview = buildPendingActionPreviewResult(state.plan, proposal, state.runId)
        await deps.stores.plans.savePlan(preview.plan, 'agent')
        const action = preview.plan.pendingAction!
        const pendingApproval = PlanPalInterruptSchema.parse({
          actionId: proposal.actionId,
          runId: state.runId,
          planId: state.planId,
          baseVersion: preview.plan.currentVersion,
          kind: proposal.kind,
          action,
        })
        return {
          pendingApproval,
          plan: preview.plan,
          baseVersion: preview.plan.currentVersion,
          error: null,
          metadata: {
            ...withNodePath(state, 'validateProposal'),
            appliedCommands: [preview.command],
            appliedPatches: [preview.patch],
          },
        }
      } catch (error) {
        return graphError(state, 'validateProposal', redactError(error))
      }
    },
  }
}

function buildProposal(state: PlanPalGraphStateValue): PlanCommandProposal {
  const route = state.route!
  const actionId = createId('action')
  if (route.kind === 'candidate-search') {
    const result = requireSuccessfulResult(state, 'poi_search')
    const candidates = readCandidates(result.output)
    if (candidates.length === 0) return clarificationProposal(actionId, '没有找到可用候选，请补充地点或偏好。')
    const command: PlanCommand = {
      type: 'REFRESH_CANDIDATES',
      source: 'agent',
      actionId,
      mode: route.mode,
      targetSegmentId: route.segmentId,
      afterSegmentId: route.afterSegmentId,
      searchQuery: route.query,
      candidates,
    }
    return {
      actionId,
      kind: 'candidate-selection',
      commands: [command],
      rationale: route.reason,
      groundedToolCallIds: [result.toolCallId],
    } as PlanCommandProposal
  }
  if (route.kind === 'service-search') {
    const result = requireSuccessfulResult(state, 'offering_search')
    const offerings = readOfferings(result.output)
    if (offerings.length === 0) return clarificationProposal(actionId, '没有找到可用服务项，请补充房型、场次或套餐偏好。')
    const command: PlanCommand = {
      type: 'REFRESH_SERVICE_ITEMS',
      source: 'agent',
      actionId,
      segmentId: route.segmentId,
      merchantId: route.merchantId,
      category: route.category,
      query: route.query,
      offerings,
    }
    return {
      actionId,
      kind: 'service-selection',
      commands: [command],
      rationale: route.reason,
      groundedToolCallIds: [result.toolCallId],
    } as PlanCommandProposal
  }
  if (route.kind === 'clarification') {
    return {
      actionId,
      kind: 'clarification',
      commands: [{
        type: 'REQUEST_CLARIFICATION',
        source: 'agent',
        actionId,
        title: route.title,
        description: route.description,
        requiredFields: route.requiredFields,
      }],
      rationale: route.reason,
      groundedToolCallIds: [],
    }
  }
  if (route.kind === 'mutation') {
    const toolResult = state.toolResults.find((result) => state.metadata.activeToolCallIds.includes(result.toolCallId))
    return {
      actionId,
      kind: 'command-approval',
      commands: [route.command],
      rationale: route.reason,
      groundedToolCallIds: toolResult?.status === 'success' ? [toolResult.toolCallId] : [],
    }
  }
  if (route.kind === 'confirmation' && state.plan?.pendingAction) {
    return proposalFromPendingAction(state.plan.pendingAction, actionId, route.reason)
  }
  return clarificationProposal(actionId, '请说明要修改、查找还是确认哪个安排。')
}

function proposalFromPendingAction(action: PendingAction, actionId: string, reason: string): PlanCommandProposal {
  if (action.kind === 'command-confirmation') {
    return {
      actionId: action.id,
      kind: 'command-approval',
      commands: action.commands as PlanCommandProposal['commands'],
      rationale: reason,
      groundedToolCallIds: [],
    }
  }
  return clarificationProposal(actionId, '请在当前操作卡片中完成选择，或先取消该操作。')
}

function clarificationProposal(actionId: string, description: string): PlanCommandProposal {
  return {
    actionId,
    kind: 'clarification',
    commands: [{
      type: 'REQUEST_CLARIFICATION',
      source: 'agent',
      actionId,
      title: '需要补充信息',
      description,
      requiredFields: ['目标安排', '期望结果', '偏好或限制'],
    }],
    rationale: 'deterministic clarification fallback',
    groundedToolCallIds: [],
  }
}

function expectedToolName(state: PlanPalGraphStateValue) {
  if (state.route?.kind === 'candidate-search') return 'poi_search' as const
  if (state.route?.kind === 'service-search') return 'offering_search' as const
  if (state.route?.kind === 'mutation'
    && (state.route.command.type === 'CONFIRM_PLAN' || state.route.command.type === 'CREATE_SANDBOX_ORDER')) {
    return 'order_preview' as const
  }
  return null
}

function deterministicToolCall(state: PlanPalGraphStateValue, name: NonNullable<ReturnType<typeof expectedToolName>>): ToolCallRequest {
  const route = state.route!
  const args: Record<string, unknown> = { planId: state.planId }
  if (route.kind === 'candidate-search') Object.assign(args, {
    mode: route.mode,
    query: route.query,
    segmentId: route.segmentId,
    afterSegmentId: route.afterSegmentId,
    excludeCandidateIds: state.metadata.excludedCandidateIds,
  })
  if (route.kind === 'service-search') Object.assign(args, {
    segmentId: route.segmentId,
    merchantId: route.merchantId,
    category: route.category,
    query: route.query,
    limit: 6,
  })
  return ToolCallRequestSchema.parse({ id: createId('call'), name, args, type: 'tool_call' })
}

function readToolCalls(message: AIMessage | null) {
  return (message?.tool_calls ?? []).flatMap((call) => {
    const parsed = ToolCallRequestSchema.safeParse({ ...call, id: call.id, type: 'tool_call' })
    return parsed.success ? [parsed.data] : []
  })
}

function requireSuccessfulResult(state: PlanPalGraphStateValue, name: ToolResult['name']) {
  const result = state.toolResults.find((item) => item.name === name && state.metadata.activeToolCallIds.includes(item.toolCallId))
  if (!result || result.status !== 'success') throw new Error(`${name} did not return a successful result`)
  return result
}

function readCandidates(output: unknown): CandidateOption[] {
  if (!output || typeof output !== 'object' || !('candidates' in output) || !Array.isArray(output.candidates)) return []
  return output.candidates as CandidateOption[]
}

function readOfferings(output: unknown): MerchantOffering[] {
  if (!output || typeof output !== 'object' || !('offerings' in output) || !Array.isArray(output.offerings)) return []
  return output.offerings.flatMap((item) => {
    if (item && typeof item === 'object' && 'offering' in item) return [item.offering as MerchantOffering]
    return []
  })
}

function graphError(state: PlanPalGraphStateValue, node: string, message: string): PlanPalGraphStateUpdate {
  return {
    error: { code: 'PROPOSAL_ERROR', message, recoverable: true, node },
    metadata: withNodePath(state, node),
  }
}

function redactError(error: unknown) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
}
