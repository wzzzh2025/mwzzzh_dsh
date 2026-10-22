/** What the browser half registers, and that it all leaves with the fiber. */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'
import type { TimelineViewInjected } from '../src/client/TimelineView.tsx'
import type { SessionSeq } from '@deepseek-ai/dsh-session/types'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  const loadThrough = vi.fn(async () => undefined)
  ctx.provide('sessions', {
    binding: (sessionId: string) => sessionId === 's1' ? { session: { loadThrough } } : undefined,
  })
  return { ctx, slots: ctx.get('slots') as SlotRegistry, loadThrough }
}

function declareRoot(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: { 'conversation.view': { kind: 'list', scope: 'session' } },
  } as never, () => null)
}

describe('ui-session-timeline apply', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale', 'sessions'])
  })

  it('registers one timeline view whose jump pages history', async () => {
    const { ctx, slots, loadThrough } = await bench()
    declareRoot(slots)
    await ctx.plugin({ inject: [...inject], apply }).await()
    const entry = slots.entries('conversation.view')[0]!
    expect(entry.options).toMatchObject({ id: 'timeline', order: 15 })
    expect(resolveSlotLabel(entry.options.label)).toBe('时间轴')
    const jump = entry.inject as
      ((sessionId: string) => TimelineViewInjected & Record<string, unknown>) | undefined
    if (jump === undefined) throw new Error('missing timeline inject')
    const face = jump('s1')
    await face.jump(4 as SessionSeq)
    expect(loadThrough).toHaveBeenCalledWith(4)
    expect(() => jump('missing')).toThrow(/unavailable/)
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
