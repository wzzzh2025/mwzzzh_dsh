/**
 * Read-only session timeline, browser half: a conversation view that lists
 * every started turn from `turnOutline` and jumps to it in Chat. It never
 * rewinds or regenerates; those writes belong to the session log.
 */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-session-turn-outline/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { TimelineView, type TimelineViewInjected } from './TimelineView.tsx'
import { en, zh } from './locales.ts'

export type { TimelineViewInjected, TimelineViewProps } from './TimelineView.tsx'
export { scrollToChatTurn } from './TimelineView.tsx'
export type { TimelineLocaleKey } from './locales.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'session.timeline'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'sessions']

/**
 * Mount the timeline conversation view.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-session-timeline: dictionaries')

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'timeline',
    order: 15,
    label: () => t('view'),
    locale: NS,
    inject: (sessionId: SessionId): TimelineViewInjected => {
      const session = ctx.sessions.binding(sessionId)?.session
      if (session === undefined) {
        throw new Error(`ui-session-timeline: session "${sessionId}" is unavailable`)
      }
      return { jump: seq => session.loadThrough(seq) }
    },
  }, TimelineView))
}
