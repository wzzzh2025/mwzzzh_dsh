/** The preference follows namespace availability and plugin disposal. */
import { Context } from '@deepseek-ai/cordis'
import { expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { TestRemote } from '@deepseek-ai/dsh-client-test-runtime'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply as settingsApply, inject as settingsInject } from '@deepseek-ai/dsh-client-ui-settings/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'
import type { MemoryProtocolRowInjected } from '../src/client/MemoryProtocolRow.tsx'

it('adds the General row only while served and removes it on disposal', async () => {
  expect(hostApply).not.toThrow()
  expect(inject).toEqual(['slots', 'locale', 'configForms'])
  const ctx = new Context()
  try {
    await ctx.plugin(SlotRegistry).await()
    ctx.provide('locale', new LocaleRuntime(ctx))
    const describe = vi.fn(async () => ({ ok: true as const, value: {
      writable: true, hasDocument: true,
      namespaces: [] as { ns: string; schema: object; value: object; applies: 'live'; secrets: never[]; revision: number }[],
    } }))
    const remote = new TestRemote(ctx, { settings: { describe } })
    await ctx.plugin({ inject: [...settingsInject], apply: settingsApply }).await()
    const slots = ctx.get('slots') as SlotRegistry
    slots.register({ name: 'root', children: {
      'settings.general.item': { kind: 'list', scope: 'root' },
    } } as never, () => null)
    const fiber = ctx.plugin({ inject, apply })
    await fiber.await()
    await ctx.configForms.describe().ensure()
    expect(slots.entries('settings.general.item')).toHaveLength(0)
    describe.mockResolvedValue({ ok: true, value: { writable: true, hasDocument: true, namespaces: [{
      ns: 'memory-protocol', schema: {}, value: { enabled: true }, applies: 'live', secrets: [], revision: 1,
    }] } })
    remote.emit('settings/document-updated', ['memory-protocol', 1])
    await vi.waitFor(() => { expect(slots.entries('settings.general.item')).toHaveLength(1) })
    expect(slots.entries('settings.general.item')[0]!.options).toMatchObject({ id: 'memory-protocol', order: 18 })
    const injectFace = slots.entries('settings.general.item')[0]?.inject as
      (() => MemoryProtocolRowInjected & Record<string, unknown>) | undefined
    if (injectFace === undefined) throw new Error('missing memory-protocol inject')
    const face = injectFace()
    const form = ctx.configForms.get('memory-protocol')
    const set = vi.spyOn(form, 'set').mockResolvedValue(false)
    await expect(face.setEnabled(false)).rejects.toThrow('settings write refused')
    expect(set).toHaveBeenCalledWith('enabled', false)
    describe.mockResolvedValue({ ok: true, value: { writable: true, hasDocument: true, namespaces: [] } })
    remote.emit('settings/document-updated', ['memory-protocol', 2])
    await vi.waitFor(() => { expect(slots.entries('settings.general.item')).toHaveLength(0) })
    await fiber.dispose()
    expect(slots.entries('settings.general.item')).toHaveLength(0)
  } finally {
    await ctx.fiber.dispose()
  }
})
