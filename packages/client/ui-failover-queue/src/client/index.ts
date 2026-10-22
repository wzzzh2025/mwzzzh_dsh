/**
 * Failover-queue settings row, browser half: the General switch and queue
 * editor over the `failover-queue` namespace. The row appears only while the
 * Host serves that namespace.
 */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { FailoverQueueRow, type FailoverQueueRowInjected } from './FailoverQueueRow.tsx'
import { parseQueueText } from './queue.ts'
import { en, zh, type FailoverQueueLocaleKey } from './locales.ts'
import type { FailoverQueueSettings } from './types.ts'

export type { FailoverQueueRowInjected, FailoverQueueRowProps } from './FailoverQueueRow.tsx'
export type { FailoverQueueSettings } from './types.ts'
export type { FailoverQueueLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Failover-queue General row copy. */
    'settings.failoverQueue': FailoverQueueLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'settings.failoverQueue'

/** Host settings namespace this row writes. */
const FAILOVER_NS = 'failover-queue'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'configForms']

/**
 * Mount the failover General row while the Host serves its namespace.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-failover-queue: dictionaries')
  const form = ctx.configForms.get<FailoverQueueSettings>(FAILOVER_NS)
  const face = (): FailoverQueueRowInjected => ({
    hooks: { failoverQueue: form },
    setEnabled: async (enabled) => {
      const ok = await form.set('enabled', enabled)
      if (!ok) throw new Error('settings write refused')
    },
    setQueue: async (text) => {
      const ok = await form.set('queue', parseQueueText(text))
      if (!ok) throw new Error('settings write refused')
    },
  })
  ctx.effect(() => ctx.configForms.whileServed([FAILOVER_NS], () => ctx.slots.inject('settings.general.item', () =>
    ctx.slots.register({
      name: 'settings.general.item', id: FAILOVER_NS, order: 19, locale: NS, inject: face,
    }, FailoverQueueRow))), 'ui-failover-queue: general row')
}
