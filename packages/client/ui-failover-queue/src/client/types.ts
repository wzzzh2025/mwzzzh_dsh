/** Fields this row writes on the Host `failover-queue` namespace. */

/** One fallback route. */
export interface FailoverQueueEntry {
  provider: string
  model: string
}

/** Host settings document for the failover plugin. */
export interface FailoverQueueSettings {
  /** Run failover. Omitted follows the Host default (`false`). */
  enabled?: boolean
  /** Fallback routes tried after the user's selected model fails. */
  queue?: FailoverQueueEntry[]
}
