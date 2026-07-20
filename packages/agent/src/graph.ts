import { END, START, StateGraph } from '@langchain/langgraph'
import { createApprovalNodes } from './nodes/approval'
import { createContextNodes } from './nodes/context'
import { createPlanningNodes } from './nodes/planning'
import type { PlanPalGraphDependencies } from './graph-types'
import { PlanPalGraphState, type PlanPalGraphStateValue } from './state'

export const planPalGraphNodes = [
  'loadContext',
  'understandIntent',
  'routeIntent',
  'qaAgent',
  'planningAgent',
  'callTools',
  'buildCommandProposal',
  'validateProposal',
  'requestApproval',
  'applyCommand',
  'finalize',
  'handleError',
] as const

export type PlanPalGraphNode = (typeof planPalGraphNodes)[number]

export function buildPlanPalLangGraph(deps: PlanPalGraphDependencies) {
  deps.tools.bindPlanLookup((planId) => deps.stores.plans.getPlan(planId))
  const context = createContextNodes(deps)
  const planning = createPlanningNodes(deps)
  const approval = createApprovalNodes(deps)

  return new StateGraph(PlanPalGraphState)
    .addNode('loadContext', context.loadContext)
    .addNode('understandIntent', context.understandIntent)
    .addNode('routeIntent', context.routeIntent)
    .addNode('qaAgent', context.qaAgent)
    .addNode('planningAgent', planning.planningAgent)
    .addNode('callTools', planning.callTools)
    .addNode('buildCommandProposal', planning.buildCommandProposal)
    .addNode('validateProposal', planning.validateProposal)
    .addNode('requestApproval', approval.requestApproval)
    .addNode('applyCommand', approval.applyCommand)
    .addNode('finalize', approval.finalize)
    .addNode('handleError', approval.handleError)
    .addEdge(START, 'loadContext')
    .addConditionalEdges('loadContext', hasError, {
      error: 'handleError',
      ok: 'understandIntent',
    })
    .addConditionalEdges('understandIntent', hasError, {
      error: 'handleError',
      ok: 'routeIntent',
    })
    .addConditionalEdges('routeIntent', routeIntentEdge, {
      qa: 'qaAgent',
      'candidate-search': 'planningAgent',
      'service-search': 'planningAgent',
      mutation: 'planningAgent',
      clarification: 'buildCommandProposal',
      confirmation: 'buildCommandProposal',
      error: 'handleError',
    })
    .addConditionalEdges('qaAgent', hasError, {
      error: 'handleError',
      ok: 'finalize',
    })
    .addConditionalEdges('planningAgent', planningEdge, {
      tools: 'callTools',
      proposal: 'buildCommandProposal',
      error: 'handleError',
    })
    .addConditionalEdges('callTools', toolResultEdge, {
      success: 'buildCommandProposal',
      failure: 'handleError',
    })
    .addEdge('buildCommandProposal', 'validateProposal')
    .addConditionalEdges('validateProposal', hasError, {
      error: 'handleError',
      ok: 'requestApproval',
    })
    .addEdge('requestApproval', 'applyCommand')
    .addConditionalEdges('applyCommand', applyCommandEdge, {
      error: 'handleError',
      ok: 'finalize',
      planning: 'planningAgent',
      intent: 'understandIntent',
    })
    .addConditionalEdges('handleError', recoveryEdge, {
      retry: 'buildCommandProposal',
      finish: 'finalize',
    })
    .addEdge('finalize', END)
    .compile({ checkpointer: deps.checkpointer })
}

function hasError(state: PlanPalGraphStateValue) {
  return state.error ? 'error' as const : 'ok' as const
}

function routeIntentEdge(state: PlanPalGraphStateValue) {
  return state.error ? 'error' as const : state.route?.kind ?? 'error'
}

function planningEdge(state: PlanPalGraphStateValue) {
  if (state.error) return 'error' as const
  return state.metadata.activeToolCallIds.length ? 'tools' as const : 'proposal' as const
}

function toolResultEdge(state: PlanPalGraphStateValue) {
  const active = state.toolResults.filter((result) => state.metadata.activeToolCallIds.includes(result.toolCallId))
  return active.length > 0 && active.every((result) => result.status === 'success')
    ? 'success' as const
    : 'failure' as const
}

function applyCommandEdge(state: PlanPalGraphStateValue) {
  if (state.error) return 'error' as const
  return state.metadata.continuation ?? 'ok' as const
}

function recoveryEdge(state: PlanPalGraphStateValue) {
  return state.response ? 'finish' as const : 'retry' as const
}
