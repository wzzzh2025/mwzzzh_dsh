/**
 * Context occupancy dashboard, browser half: a conversation view over the
 * official `contextPressure`, `contextBreakdown`, and `tokenUsage` projections,
 * plus a `/context` action that opens that tab. Not a length picker.
 */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-commands/client'
import type {} from '@deepseek-ai/dsh-token-meter/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { ContextDashboard } from './ContextDashboard.tsx'
import { clickConversationView } from './format.ts'
import { en, zh } from './locales.ts'

export type { ContextDashboardProps } from './ContextDashboard.tsx'
export { clickConversationView, formatTokens, occupancyPercent } from './format.ts'
export type { ContextDashboardLocaleKey } from './locales.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'context.dashboard'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale']

/**
 * Mount the context dashboard view and the `/context` action.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-context-dashboard: dictionaries')

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'context',
    order: 20,
    label: () => t('view'),
    locale: NS,
  }, ContextDashboard))

  ctx.inject(['commandUi'], (child) => {
    child.effect(() => child.commandUi.register({
      name: 'context',
      label: () => t('command'),
      description: () => t('commandHint'),
      available: () => true,
      ui: {
        kind: 'action',
        run: () => { clickConversationView(t('view')) },
      },
    }), 'ui-context-dashboard: /context')
  })
}
