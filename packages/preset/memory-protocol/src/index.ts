/**
 * Opt-in memory protocol as a composable prompt section.
 *
 * A project that keeps its progress truth in `memory/` needs every session to
 * read that directory before acting. `AGENTS.md` covers this when the file is
 * present, but a host-mounted section survives projects whose agent
 * instructions are absent or owned by someone else — and, unlike editing
 * `AGENTS.md`, it can be switched off from Settings.
 *
 * Host mounting is required for the Settings namespace to appear in
 * `settings.describe`. A preset `plugins` row only loads after a session joins
 * that preset, so a browser with no session would never see the switch.
 *
 * The section is inert unless the workspace actually has `memory/`: the text
 * itself is conditional, so mounting this row on a host that also serves
 * unrelated repositories costs one short paragraph and changes nothing.
 *
 * `enabled: false` drops the section entirely. Flipping it changes only what
 * the model is told — the `memory/` files on disk are never touched.
 * @module @deepseek-ai/dsh-memory-protocol
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-settings'

/** Cordis plugin name. */
export const name = 'memory-protocol'

/** The prompt registry this row contributes to. */
export const inject = ['systemPrompt']

/**
 * Section name. Namespaced so it never collides with a first-party section, and
 * stable so a later `section()` call with the same name replaces this one.
 */
export const MEMORY_PROTOCOL_SECTION = 'local:memory-protocol'

/**
 * Ordering slot: after the deployment persona (0) and before plan policy (500),
 * so the protocol reads as part of the agent's identity rather than as a tool
 * note. See `SECTION_ORDERS` in `@deepseek-ai/dsh-system-prompt`.
 */
export const MEMORY_PROTOCOL_ORDER = 400

/** Default protocol text: conditional on the workspace having `memory/`. */
export const DEFAULT_PROTOCOL = 'This project may keep its progress truth in a `memory/` directory. If the project root contains `memory/README.md`, treat that directory as authoritative for progress before acting: read `memory/README.md`, then `memory/STATE.md` (the scheduling board), then the `memory/tracks/<track>/STATE.md` for whichever track you pick. Before changing source code, state what you will change, why, and the impact, then wait for confirmation. Write conclusions back into `memory/` only: rewrite STATE/BACKLOG/ROADMAP, append to DECISIONS, and tag every claim as [实测] (with a file:line or commit pointer), [结论] (a durable decision), or [待验] (an unverified guess, which must never reach DECISIONS). If the project has no `memory/` directory, ignore this paragraph.'

/** Plugin config: whether the section is contributed at all, and its text. */
export interface Config {
  /**
   * Contribute the protocol section. `false` drops it, leaving the workspace
   * files untouched — the switch Settings uses to opt out.
   */
  enabled?: boolean
  /**
   * Replacement protocol prose. Omitted uses {@link DEFAULT_PROTOCOL}; empty
   * string behaves like `enabled: false` at render time.
   */
  text?: string
  /**
   * Override the section order. Omitted uses {@link MEMORY_PROTOCOL_ORDER}.
   * Raise it to place the protocol after tool guidance instead of before it.
   */
  order?: number
}

/** Runtime schema for the memory-protocol row. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  text: z.string(),
  order: z.number(),
})

/**
 * Register the memory-protocol section for the mounting context's scope.
 * @param ctx - a host or agent-scope context that carries the prompt registry.
 * @param config - the enable switch, replacement text, and order override.
 */
export function apply(ctx: Context, config: Config = {}): void {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber), 'memory-protocol.settings')
  })
  if ((config.enabled ?? true) === false) return

  const text = config.text ?? DEFAULT_PROTOCOL
  if (text.trim().length === 0) return

  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: MEMORY_PROTOCOL_SECTION,
        order: config.order ?? MEMORY_PROTOCOL_ORDER,
        text,
        // The protocol talks about `{{…}}`-free prose, but a project path could
        // contain braces; keep the text literal so nothing is interpolated away.
        interpolate: false,
      }),
    'memory-protocol.section()',
  )
}
