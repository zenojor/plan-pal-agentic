import { END, START, StateGraph, StateSchema, type GraphNode } from '@langchain/langgraph'
import * as z from 'zod'

export const planPalGraphNodes = [
  'understandTurn',
  'routeIntent',
  'callTools',
  'proposePatch',
  'applyCommand',
  'interruptForUser',
  'finish',
] as const

export type PlanPalGraphNode = (typeof planPalGraphNodes)[number]

const PlanPalGraphState = new StateSchema({
  stage: z.string().default('understandTurn'),
  route: z.string().default('qa'),
  needsUser: z.boolean().default(false),
})

function mark(stage: PlanPalGraphNode): GraphNode<typeof PlanPalGraphState> {
  return async (state) => ({
    ...state,
    stage,
  })
}

export function buildPlanPalLangGraph() {
  return new StateGraph(PlanPalGraphState)
    .addNode('understandTurn', mark('understandTurn'))
    .addNode('routeIntent', mark('routeIntent'))
    .addNode('callTools', mark('callTools'))
    .addNode('proposePatch', mark('proposePatch'))
    .addNode('applyCommand', mark('applyCommand'))
    .addNode('interruptForUser', mark('interruptForUser'))
    .addNode('finish', mark('finish'))
    .addEdge(START, 'understandTurn')
    .addEdge('understandTurn', 'routeIntent')
    .addEdge('routeIntent', 'callTools')
    .addEdge('callTools', 'proposePatch')
    .addEdge('proposePatch', 'applyCommand')
    .addEdge('applyCommand', 'finish')
    .addEdge('interruptForUser', 'finish')
    .addEdge('finish', END)
    .compile()
}
