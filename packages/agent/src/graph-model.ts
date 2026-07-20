import { AIMessage, type BaseMessage } from '@langchain/core/messages'
import type { StructuredTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import type { z } from 'zod'
import {
  generateAssistantReply,
  streamAssistantReply,
  type ClientModelConfig,
  type CoreMessage,
} from './model'

export type AgentModelGateway = {
  generateAssistantReply: typeof generateAssistantReply
  streamAssistantReply?: typeof streamAssistantReply
  invokeMessages?: (config: ClientModelConfig, messages: BaseMessage[]) => Promise<AIMessage>
  invokeWithTools?: (
    config: ClientModelConfig,
    messages: BaseMessage[],
    tools: StructuredTool[],
  ) => Promise<AIMessage>
  invokeStructured?: <T>(
    config: ClientModelConfig,
    messages: BaseMessage[],
    schema: z.ZodType<T>,
    name: string,
  ) => Promise<T>
}

export const defaultModelGateway: AgentModelGateway = {
  generateAssistantReply,
  streamAssistantReply,
  async invokeMessages(config, messages) {
    return asAIMessage(await createChatModel(config).invoke(messages))
  },
  async invokeWithTools(config, messages, tools) {
    const model = createChatModel(config).bindTools(tools)
    return asAIMessage(await model.invoke(messages))
  },
  async invokeStructured<T>(config: ClientModelConfig, messages: BaseMessage[], schema: z.ZodType<T>, name: string) {
    const model = createChatModel(config)
    const runnable = model.withStructuredOutput(schema, {
      name,
      method: 'jsonMode',
    })
    return schema.parse(await runnable.invoke(messages))
  },
}

export async function invokeStructuredWithGateway<T>(input: {
  config: ClientModelConfig
  gateway: AgentModelGateway
  messages: BaseMessage[]
  name: string
  schema: z.ZodType<T>
}) {
  if (input.gateway.invokeStructured) {
    return input.gateway.invokeStructured(input.config, input.messages, input.schema, input.name)
  }
  const legacyMessages = input.messages.map(toCoreMessage)
  const text = await input.gateway.generateAssistantReply(input.config, legacyMessages)
  return input.schema.parse(parseJsonObject(text))
}

export async function invokeToolCallingModel(input: {
  config: ClientModelConfig
  gateway: AgentModelGateway
  messages: BaseMessage[]
  tools: StructuredTool[]
}) {
  if (input.gateway.invokeWithTools) {
    return input.gateway.invokeWithTools(input.config, input.messages, input.tools)
  }
  return null
}

export async function invokeAnswerModel(input: {
  config: ClientModelConfig
  gateway: AgentModelGateway
  messages: BaseMessage[]
}) {
  if (input.gateway.invokeMessages) {
    return input.gateway.invokeMessages(input.config, input.messages)
  }
  const text = await input.gateway.generateAssistantReply(input.config, input.messages.map(toCoreMessage))
  return new AIMessage(text)
}

function createChatModel(config: ClientModelConfig) {
  return new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: 0,
    maxRetries: 0,
    useResponsesApi: false,
    configuration: {
      baseURL: config.resolvedBaseURL ?? config.baseURL,
    },
  })
}

function asAIMessage(message: BaseMessage) {
  return AIMessage.isInstance(message)
    ? message
    : new AIMessage({ content: message.content })
}

function toCoreMessage(message: BaseMessage): CoreMessage {
  const type = message.getType()
  const role = type === 'system' ? 'system' : type === 'ai' ? 'assistant' : 'user'
  return { role, content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }
}

function parseJsonObject(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Model response did not contain a JSON object')
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown
}
