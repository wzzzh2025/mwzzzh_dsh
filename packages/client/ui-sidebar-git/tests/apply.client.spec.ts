/** What the browser half registers, and that it all leaves with the fiber. */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, GIT_ID, GIT_KIND, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  const registered: unknown[] = []
  ctx.provide('sidebarRightTabs', {
    register: (definition: unknown) => {
      registered.push(definition)
      return () => undefined
    },
  })
  return { ctx, slots: ctx.get('slots') as SlotRegistry, registered }
}

function declareRoot(slots: SlotRegistry): void {
  slots.register({
    name: 'root',
    children: {
      'sidebar.right.pane.tab': { kind: 'keyed', scope: 'session' },
      'sidebar.right.pane.tab.title': { kind: 'keyed', scope: 'session' },
    },
  } as never, () => null)
}

describe('ui-sidebar-git apply', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale', 'sidebarRightTabs'])
  })

  it('registers a git tab type and keyed body', async () => {
    const { ctx, slots, registered } = await bench()
    declareRoot(slots)
    await ctx.plugin({ inject: [...inject], apply }).await()
    const definition = registered[0] as {
      id: string
      kind: string
      priority: string
      title(): string
      guide: { title(): string; description(): string }[]
    }
    expect(definition).toMatchObject({ id: GIT_ID, kind: GIT_KIND, priority: 'extension' })
    expect(definition.title()).toBe('Git')
    expect(definition.guide[0]!.title()).toBe('Git')
    expect(definition.guide[0]!.description()).toBeTruthy()
    const entry = slots.entries('sidebar.right.pane.tab').find(item => item.options.key === GIT_ID)!
    expect(entry.inject!()).toMatchObject({ status: expect.any(Function) })
  })

  it('collapses registrations on teardown', async () => {
    const { ctx, slots } = await bench()
    declareRoot(slots)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await fiber.dispose()
    expect(slots.entries('sidebar.right.pane.tab')).toHaveLength(0)
  })
})
