/**
 * Failover queue: on 503 / timeout / rate-limit / transport, retry the next
 * configured provider/model. Disabled or empty is a no-op, so llm-retry keeps
 * the same-route recovery. This plugin prepends `agent/request-error` so a
 * failover decision beats same-model backoff.
 *
 * Host-mounted so Settings.describe exposes the namespace without an open
 * session. Agent events still reach host listeners (same as llm-retry).
 * @module @deepseek-ai/dsh-failover-queue
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import type { RequestErrorAction } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-settings'
import type { QueueEntry } from './queue.ts'
import { isFailoverCode, parseQueue } from './queue.ts'

export type { QueueEntry } from './queue.ts'
export {
  FAILOVER_CODES, formatQueueText, isFailoverCode, parseQueue, parseQueueText,
} from './queue.ts'

/** Cordis plugin name. */
export const name = 'failover-queue'

/** Plugin config: off by default, empty queue. */
export interface Config {
  /** Run failover. `false` (the default) leaves every request untouched. */
  enabled?: boolean
  /** Fallback routes tried after the user's selected model fails. */
  queue?: QueueEntry[]
}

/** Runtime schema for the failover-queue row. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(false),
  queue: z.array(z.object({
    provider: z.string(),
    model: z.string(),
  })).default([]),
})

/** Per-session failover cursor: 0 means "still on the user's model". */
interface SessionCursor {
  turn: number
  index: number
}

/**
 * Register Settings and, when enabled, the request/error waterfalls.
 * @param ctx - host or agent-scope context.
 * @param config - enable switch and fallback queue.
 */
export function apply(ctx: Context, config: Config = {}): void {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber), 'failover-queue.settings')
  })

  const enabled = config.enabled === true
  const queue = parseQueue(config.queue ?? [])
  const cursors = new Map<string, SessionCursor>()

  ctx.effect(() => ctx.on('agent/request', async (payload, next): Promise<LlmCallConfig> => {
    const resolved = await next()
    if (!enabled || queue.length === 0) return resolved
    const id = payload.agent.session.id as string
    let cursor = cursors.get(id)
    if (cursor === undefined || cursor.turn !== payload.turn) {
      cursor = { turn: payload.turn, index: 0 }
      cursors.set(id, cursor)
    }
    if (cursor.index === 0) return resolved
    const entry = queue.at(cursor.index - 1)
    if (entry === undefined) return resolved
    return { ...resolved, provider: entry.provider, model: entry.model }
  }), 'failover-queue: request')

  ctx.effect(() => ctx.on('agent/request-error', async (payload, next): Promise<RequestErrorAction> => {
    if (!enabled || queue.length === 0 || !isFailoverCode(payload.failure.code)) return next()
    const id = payload.agent.session.id as string
    let cursor = cursors.get(id)
    if (cursor === undefined || cursor.turn !== payload.turn) {
      cursor = { turn: payload.turn, index: 0 }
      cursors.set(id, cursor)
    }
    if (cursor.index >= queue.length) return next()
    cursor.index += 1
    return { kind: 'retry' }
  }, { prepend: true }), 'failover-queue: request-error')
}
