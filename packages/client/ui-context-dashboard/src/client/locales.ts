/** Locale bundles for the context occupancy dashboard. */

/** Locale keys the dashboard renders. */
export type ContextDashboardLocaleKey =
  | 'view'
  | 'command'
  | 'commandHint'
  | 'occupancy'
  | 'occupancyEmpty'
  | 'composition'
  | 'system'
  | 'tools'
  | 'messages'
  | 'usage'
  | 'uncached'
  | 'output'
  | 'cacheRead'
  | 'cacheWrite'
  | 'usageEmpty'
  | 'note'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  view: '上下文',
  command: '上下文',
  commandHint: '打开占用、拼装和累计用量仪表盘',
  occupancy: '占用',
  occupancyEmpty: '还没有供应商上报的占用。发一轮之后这里会出现数字。',
  composition: '下次请求怎么拼',
  system: '系统提示',
  tools: '工具',
  messages: '消息',
  usage: '累计用量',
  uncached: '未缓存输入',
  output: '输出',
  cacheRead: '缓存读取',
  cacheWrite: '缓存写入',
  usageEmpty: '还没有累计用量。',
  note: '拼装三项是启发式估算，不会加总成占用数字。占用是供应商上报的压力对上窗口。',
} satisfies Record<ContextDashboardLocaleKey, string>

/** English dictionary, checked complete against the zh key set. */
export const en: Record<ContextDashboardLocaleKey, string> = {
  view: 'Context',
  command: 'Context',
  commandHint: 'Open occupancy, composition, and cumulative usage',
  occupancy: 'Occupancy',
  occupancyEmpty: 'No provider-reported occupancy yet. Numbers appear after a request.',
  composition: 'How the next request is assembled',
  system: 'System prompt',
  tools: 'Tools',
  messages: 'Messages',
  usage: 'Cumulative usage',
  uncached: 'Uncached input',
  output: 'Output',
  cacheRead: 'Cache read',
  cacheWrite: 'Cache write',
  usageEmpty: 'No cumulative usage yet.',
  note: 'The three composition figures are heuristic and do not sum to occupancy. Occupancy pairs provider-reported pressure with the window.',
}
