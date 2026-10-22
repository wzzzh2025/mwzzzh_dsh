/** Locale bundles for the read-only session timeline view. */

/** Locale keys the view renders. */
export type TimelineLocaleKey =
  | 'view'
  | 'empty'
  | 'turn'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  view: '时间轴',
  empty: '这个会话还没有轮次。',
  turn: '第 {turn} 轮',
} satisfies Record<TimelineLocaleKey, string>

/** English dictionary, checked complete against the zh key set. */
export const en: Record<TimelineLocaleKey, string> = {
  view: 'Timeline',
  empty: 'This session has no turns yet.',
  turn: 'Turn {turn}',
}
