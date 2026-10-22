/**
 * Browser half: register `git` as a right-Sidebar tab type.
 *
 * One extra kind on the existing right sidebar; it does not replace files or
 * terminal.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { PluginArtworkDefault } from '@deepseek-ai/dsh-client-ui-primitives'
import { createGitApi } from './api.ts'
import { GitBody, GitTitle } from './GitBody.tsx'
import { en, zh } from './locales.ts'

export type { GitBodyProps } from './GitBody.tsx'
export type { GitStatusEntry, GitTabInjected } from './types.ts'
export type { SidebarGitKey } from './locales.ts'
export { createGitApi, GIT_PREFIX } from './api.ts'

/** The tab kind this package owns. */
export const GIT_KIND = 'git'

/** This implementation's identity in the tab system. */
export const GIT_ID = '@deepseek-ai/dsh-client-ui-sidebar-git'

/** This package's copy namespace. */
const NS = 'sidebarGit'

/**
 * Required browser services: the tab registry, the keyed seat, and copy.
 */
export const inject = ['slots', 'locale', 'sidebarRightTabs']

/**
 * Client plugin body: register the type, its dictionaries, its body, and its chip title.
 * @param ctx - client root context carrying the registry and the slots.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar-git: dictionaries')
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: GIT_ID,
    kind: GIT_KIND,
    priority: 'extension',
    title: () => t('type.label'),
    guide: [{
      id: 'git',
      order: 40,
      title: () => t('guide.title'),
      description: () => t('guide.description'),
      icon: PluginArtworkDefault,
    }],
  }), 'ui-sidebar-git: git type')

  const face = createGitApi()
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: GIT_ID, locale: NS, inject: () => face },
    GitBody,
  )), 'ui-sidebar-git: git tab body')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab.title', key: GIT_ID },
    GitTitle,
  )), 'ui-sidebar-git: git tab title')
}
