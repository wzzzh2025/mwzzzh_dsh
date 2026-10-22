/**
 * Composer context-window chip, browser half. It registers a compact control
 * on `conversation.input.right` that writes the current model's
 * `contextWindow` through the Settings document — the same field Settings →
 * Models edits — so compaction and the occupancy ring pick up the new
 * capacity on the next request. The write is global for that model, not
 * per-session: `ModelSelection` has no window field.
 */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { ContextCapSelect } from './ContextCapSelect.tsx'
import type { ContextCapSelectInjected } from './ContextCapSelect.tsx'
import { en, zh, type ComposerContextLocaleKey } from './locales.ts'
import { ComposerContextStore } from './store.ts'

export type { ContextCapSelectInjected, ContextCapSelectProps } from './ContextCapSelect.tsx'
export type { ComposerContextState, SetWindowResult } from './store.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'composer.context'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Composer context-window chip copy. */
    'composer.context': ComposerContextLocaleKey
  }
}

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'remote', 'remote.llm', 'remote.settings', 'configForms']

/**
 * Mount the composer context-window chip.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-composer-context: chip dictionaries')

  const controller = new ComposerContextStore(ctx, ctx.configForms.describe())
  ctx.effect(() => {
    const refresh = (): void => { void controller.load() }
    const disposers = [
      ctx.remote.$on('llm/adapters-updated', refresh),
      ctx.on('connection/reset', refresh),
    ]
    refresh()
    return () => {
      for (const dispose of disposers) dispose()
      controller.dispose()
    }
  }, 'ui-composer-context: provider and settings refresh')

  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'context-cap',
    order: 100,
    locale: NS,
    inject: (): ContextCapSelectInjected => ({
      hooks: { contextCap: controller.store },
      setWindow: (provider, model, tokens) => controller.setWindow(provider, model, tokens),
    }),
  }, ContextCapSelect))
}
