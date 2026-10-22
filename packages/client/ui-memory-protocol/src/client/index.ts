/**
 * Memory-protocol settings row, browser half: the General switch over the
 * `memory-protocol` namespace the Host plugin registers. The row appears
 * only while the Host serves that namespace, so a deployment that never
 * composed the plugin shows no trace of it.
 */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { MemoryProtocolRow, type MemoryProtocolRowInjected } from './MemoryProtocolRow.tsx'
import { en, zh, type MemoryProtocolLocaleKey } from './locales.ts'
import type { MemoryProtocolSettings } from './types.ts'

export type { MemoryProtocolRowInjected, MemoryProtocolRowProps } from './MemoryProtocolRow.tsx'
export type { MemoryProtocolSettings } from './types.ts'
export type { MemoryProtocolLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Memory-protocol General row copy. */
    'settings.memoryProtocol': MemoryProtocolLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'settings.memoryProtocol'

/** Host settings namespace this row writes. */
const MEMORY_PROTOCOL_NS = 'memory-protocol'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'configForms']

/**
 * Mount the memory-protocol General row while the Host serves its namespace.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-memory-protocol: dictionaries')
  const form = ctx.configForms.get<MemoryProtocolSettings>(MEMORY_PROTOCOL_NS)
  const face = (): MemoryProtocolRowInjected => ({
    hooks: { memoryProtocol: form },
    setEnabled: async (enabled) => {
      const ok = await form.set('enabled', enabled)
      if (!ok) throw new Error('settings write refused')
    },
  })
  ctx.effect(() => ctx.configForms.whileServed([MEMORY_PROTOCOL_NS], () => ctx.slots.inject('settings.general.item', () =>
    ctx.slots.register({
      name: 'settings.general.item', id: MEMORY_PROTOCOL_NS, order: 18, locale: NS, inject: face,
    }, MemoryProtocolRow))), 'ui-memory-protocol: general row')
}
