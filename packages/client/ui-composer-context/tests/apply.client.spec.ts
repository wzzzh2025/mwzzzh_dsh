/** What the browser half registers, and that it all leaves with the fiber. */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { TestRemote } from '@deepseek-ai/dsh-client-test-runtime'
import { remoteDefaultResponses } from '@deepseek-ai/dsh-client-test-runtime/src/assembly/remote-default-responses.ts'
import { RemoteMock } from '@deepseek-ai/dsh-remote-mock'
import { apply as settingsApply, inject as settingsInject } from '@deepseek-ai/dsh-client-ui-settings/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

async function bench() {
  const mock = RemoteMock.create().load(remoteDefaultResponses)
  onTestFinished(() => { mock.assertNoUnmatched() })
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  new TestRemote(ctx, {
    llm: { listConfigurableProviders: vi.fn(async () => ({ ok: true, value: [] })) },
    settings: mock.remote.settings,
  })
  await ctx.plugin({ inject: [...settingsInject], apply: settingsApply }).await()
  return { ctx, slots: ctx.get('slots') as SlotRegistry }
}

/** The composer bar's right-control list, declared at root for this unit. */
function declareRoot(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: { 'conversation.input.right': { kind: 'list', scope: 'session' } },
  } as never, () => null)
}

describe('ui-composer-context apply', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale', 'remote', 'remote.llm', 'remote.settings', 'configForms'])
  })

  it('registers one right-side chip with a live inject face', async () => {
    const { ctx, slots } = await bench()
    declareRoot(slots)
    await ctx.plugin({ inject: [...inject], apply }).await()

    const entry = slots.entries('conversation.input.right')[0]!
    expect(entry.options).toMatchObject({ id: 'context-cap', order: 100 })
    const face = (entry.inject as () => { setWindow: unknown })()
    expect(typeof face.setWindow).toBe('function')
  })

  it('registers into a declaration that arrives after apply', async () => {
    const { ctx, slots } = await bench()
    await ctx.plugin({ inject: [...inject], apply }).await()
    declareRoot(slots)
    await vi.waitFor(() => { expect(slots.entries('conversation.input.right')).toHaveLength(1) })
  })

  it('collapses the chip on teardown', async () => {
    const { ctx, slots } = await bench()
    declareRoot(slots)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('conversation.input.right')).toHaveLength(1)
    await fiber.dispose()
    expect(slots.entries('conversation.input.right')).toHaveLength(0)
  })
})
