import { integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const plans = pgTable('plans', {
  id: varchar('id', { length: 64 }).primaryKey(),
  ownerMode: varchar('owner_mode', { length: 32 }).notNull(),
  title: text('title').notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  currentVersion: integer('current_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const planVersions = pgTable('plan_versions', {
  id: varchar('id', { length: 96 }).primaryKey(),
  planId: varchar('plan_id', { length: 64 }).notNull(),
  version: integer('version').notNull(),
  intent: jsonb('intent').notNull(),
  segments: jsonb('segments').notNull(),
  routeChoices: jsonb('route_choices'),
  variantSelection: jsonb('variant_selection'),
  summary: text('summary').notNull(),
  createdBy: varchar('created_by', { length: 32 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const agentRuns = pgTable('agent_runs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  planId: varchar('plan_id', { length: 64 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  inputMessage: text('input_message').notNull(),
  checkpointId: varchar('checkpoint_id', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
})

export const agentEvents = pgTable('agent_events', {
  id: varchar('id', { length: 64 }).primaryKey(),
  runId: varchar('run_id', { length: 64 }).notNull(),
  planId: varchar('plan_id', { length: 64 }).notNull(),
  seq: integer('seq').notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const toolCalls = pgTable('tool_calls', {
  id: varchar('id', { length: 64 }).primaryKey(),
  runId: varchar('run_id', { length: 64 }).notNull(),
  toolName: varchar('tool_name', { length: 128 }).notNull(),
  effect: varchar('effect', { length: 32 }).notNull(),
  argsJson: text('args_json').notNull(),
  resultJson: text('result_json'),
  status: varchar('status', { length: 32 }).notNull(),
  durationMs: integer('duration_ms').notNull(),
})
