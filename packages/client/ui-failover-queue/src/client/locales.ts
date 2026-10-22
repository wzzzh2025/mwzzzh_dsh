/** Locale bundles for the failover-queue General row. */

/** Locale keys the row renders. */
export type FailoverQueueLocaleKey =
  | 'title'
  | 'description'
  | 'queue'
  | 'error'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  title: '模型故障转移',
  description: '503、超时或限流时按下一档供应商/模型重试。关掉或队列为空时什么也不做',
  queue: '后备路由（每行一条 provider/model）',
  error: '保存失败，请重试',
} satisfies Record<FailoverQueueLocaleKey, string>

/** English dictionary, checked complete against the zh key set. */
export const en: Record<FailoverQueueLocaleKey, string> = {
  title: 'Model failover',
  description: 'On 503, timeout, or rate limit, retry the next provider/model. Off or an empty queue does nothing.',
  queue: 'Fallback routes (one provider/model per line)',
  error: 'Could not save. Please try again.',
}
