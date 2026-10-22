// @vitest-environment jsdom
/** What the browser half registers, and that it all leaves with the fiber. */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  const register = vi.fn(() => () => undefined)
  ctx.provide('commandUi', { register })
  return { ctx, slots: ctx.get('slots') as SlotRegistry, register }
}

function declareRoot(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: { 'conversation.view': { kind: 'list', scope: 'session' } },
  } as never, () => null)
}

describe('ui-context-dashboard apply', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers the context view and the /context action', async () => {
    const { ctx, slots, register } = await bench()
    declareRoot(slots)
    await ctx.plugin({ inject: [...inject], apply }).await()
    const entry = slots.entries('conversation.view')[0]!
    expect(entry.options).toMatchObject({ id: 'context', order: 20 })
    expect(resolveSlotLabel(entry.options.label)).toBe('上下文')
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ name: 'context', ui: expect.objectContaining({ kind: 'action' }) }))
    const contribution = register.mock.calls[0]![0] as {
      label(): string
      description(): string
      available(): boolean
      ui: { run(): void }
    }
    expect(contribution.label()).toBe('上下文')
    expect(contribution.description()).toBeTruthy()
    expect(contribution.available()).toBe(true)
    contribution.ui.run()
  })

  it('collapses the view on teardown', async () => {
    const { ctx, slots } = await bench()
    declareRoot(slots)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('conversation.view')).toHaveLength(1)
    await fiber.dispose()
    expect(slots.entries('conversation.view')).toHaveLength(0)
  })
})
