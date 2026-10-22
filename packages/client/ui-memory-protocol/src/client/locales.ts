/** Locale bundles for the memory-protocol General row. */

/** Locale keys the row renders. */
export type MemoryProtocolLocaleKey = 'title' | 'description' | 'error'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  title: '记忆协议',
  description: '让 Agent 动手前先读 memory/。关掉只影响提示词，不改磁盘上的文件',
  error: '保存失败，请重试',
} satisfies Record<MemoryProtocolLocaleKey, string>

/** English dictionary, checked complete against the zh key set. */
export const en: Record<MemoryProtocolLocaleKey, string> = {
  title: 'Memory protocol',
  description: 'Ask the agent to read memory/ before acting. Turning this off changes only what the model is told, not the files on disk.',
  error: 'Could not save. Please try again.',
}
