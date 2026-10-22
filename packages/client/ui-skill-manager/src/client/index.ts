/**
 * Skills settings section, browser half: the Settings navigation entry plus the
 * inventory page. Data comes from `@deepseek-ai/dsh-skill-manager`'s host routes,
 * so this package owns no service of its own.
 */

// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings shell's SlotMap merge (the 'settings.section' entry).
// Cross-plugin collaboration goes through slots, never a value import.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { createSkillsApi } from './api.ts'
import { SkillsSection } from './SkillsSection.tsx'
import { en, zh } from './locales.ts'

export type { SkillsSectionInjected, SkillsSectionProps } from './SkillsSection.tsx'

/** Dictionary namespace owned by this plugin. */
const NS = 'skills.manager'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale']

/**
 * Mount the skills section.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-skill-manager: section dictionaries')

  // `order: 16` places the entry just after Built-in plugins (15), keeping the
  // Settings list in its shipped grouping.
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skills',
    order: 16,
    label: () => t('nav'),
    locale: NS,
    inject: () => createSkillsApi(),
  }, SkillsSection))
}
