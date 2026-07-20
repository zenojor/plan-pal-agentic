import { MemorySaver } from '@langchain/langgraph'
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite'

export function createMemoryCheckpointer() {
  return new MemorySaver()
}

export function createSqliteCheckpointer(databasePath: string) {
  return SqliteSaver.fromConnString(databasePath)
}
