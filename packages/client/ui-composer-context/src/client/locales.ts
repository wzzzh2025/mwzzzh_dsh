/** Locale bundles for the composer context-window chip. */

/** Locale keys the chip renders. */
export type ComposerContextLocaleKey =
  | 'trigger.aria'
  | 'trigger.default'
  | 'gear.default'
  | 'gear.64k'
  | 'gear.128k'
  | 'gear.256k'
  | 'gear.512k'
  | 'gear.1m'
  | 'hint'
  | 'error.write'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger.aria': '上下文上限，当前 {window}',
  'trigger.default': '默认',
  'gear.default': '默认',
  'gear.64k': '64K',
  'gear.128k': '128K',
  'gear.256k': '256K',
  'gear.512k': '512K',
  'gear.1m': '1M',
  'hint': '对使用该模型的所有会话生效，下一轮请求起算',
  'error.write': '无法保存上下文上限：{message}',
} satisfies Record<ComposerContextLocaleKey, string>

/** English dictionary, checked complete against the zh key set. */
export const en: Record<ComposerContextLocaleKey, string> = {
  'trigger.aria': 'Context window, current {window}',
  'trigger.default': 'Default',
  'gear.default': 'Default',
  'gear.64k': '64K',
  'gear.128k': '128K',
  'gear.256k': '256K',
  'gear.512k': '512K',
  'gear.1m': '1M',
  'hint': 'Applies to every session that uses this model, from the next request',
  'error.write': 'Could not save the context window: {message}',
}
