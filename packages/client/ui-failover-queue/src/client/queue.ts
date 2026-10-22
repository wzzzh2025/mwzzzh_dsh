/** Queue textarea helpers mirrored from the Host plugin's parser. */

import type { FailoverQueueEntry } from './types.ts'

/**
 * Drop empty provider/model rows.
 * @param raw - configured queue.
 * @returns usable entries in order.
 */
export function parseQueue(raw: readonly FailoverQueueEntry[]): FailoverQueueEntry[] {
  return raw
    .map(entry => ({ provider: entry.provider.trim(), model: entry.model.trim() }))
    .filter(entry => entry.provider.length > 0 && entry.model.length > 0)
}

/**
 * Parse a Settings textarea of `provider/model` lines.
 * @param text - one entry per line; the first slash splits provider from model.
 * @returns usable entries in order.
 */
export function parseQueueText(text: string): FailoverQueueEntry[] {
  const entries: FailoverQueueEntry[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    const slash = trimmed.indexOf('/')
    if (slash <= 0 || slash === trimmed.length - 1) continue
    entries.push({
      provider: trimmed.slice(0, slash).trim(),
      model: trimmed.slice(slash + 1).trim(),
    })
  }
  return parseQueue(entries)
}

/**
 * Render the queue as `provider/model` lines.
 * @param queue - usable entries.
 * @returns textarea body.
 */
export function formatQueueText(queue: readonly FailoverQueueEntry[]): string {
  return queue.map(entry => `${entry.provider}/${entry.model}`).join('\n')
}
