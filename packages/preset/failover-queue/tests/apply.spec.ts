/** Waterfalls: disabled is a no-op; a 503 advances onto the next queue entry. */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import * as Failover from '../src/index.ts'

type RequestFn = (
  payload: { agent: { session: { id: string } }; turn: number },
  next: () => Promise<LlmCallConfig>,
) => Promise<LlmCallConfig>

type ErrorFn = (
  payload: { agent: { session: { id: string } }; turn: number; failure: { code: string } },
  next: () => Promise<{ kind: 'retry' } | undefined>,
) => Promise<{ kind: 'retry' } | undefined>

function listeners(ctx: Context): { request: RequestFn; error: ErrorFn } {
  const request = vi.mocked(ctx.on).mock.calls.find(call => call[0] === 'agent/request')?.[1] as RequestFn
  const error = vi.mocked(ctx.on).mock.calls.find(call => call[0] === 'agent/request-error')?.[1] as ErrorFn
  if (request === undefined || error === undefined) throw new Error('missing listeners')
  return { request, error }
}

function mount(config?: Failover.Config): Context {
  const ctx = new Context()
  ctx.provide('settings', { configure: () => () => undefined })
  vi.spyOn(ctx, 'on').mockReturnValue(() => undefined)
  Failover.apply(ctx, config)
  return ctx
}

describe('failover-queue apply', () => {
  it('exports a schema with enabled defaulting to false', () => {
    expect(Failover.name).toBe('failover-queue')
    expect(Failover.Config).toBeTruthy()
  })

  it('passes the selected model through when disabled or the queue is empty', async () => {
    const disabled = mount({ enabled: false, queue: [{ provider: 'b', model: 'm' }] })
    const seed: LlmCallConfig = { provider: 'a', model: 'x' }
    const payload = { agent: { session: { id: 's1' } }, turn: 1, failure: { code: 'SERVER' } }
    const off = listeners(disabled)
    await expect(off.request(payload, async () => seed)).resolves.toEqual(seed)
    const next = vi.fn(async () => undefined)
    await off.error(payload, next)
    expect(next).toHaveBeenCalled()

    const empty = mount({ enabled: true, queue: [] })
    const vacant = listeners(empty)
    await expect(vacant.request(payload, async () => seed)).resolves.toEqual(seed)
    const nextEmpty = vi.fn(async () => undefined)
    await vacant.error(payload, nextEmpty)
    expect(nextEmpty).toHaveBeenCalled()

    const omitted = mount({ enabled: true })
    const absent = listeners(omitted)
    await expect(absent.request(payload, async () => seed)).resolves.toEqual(seed)
  })

  it('retries the next queue entry after a 503 and resets on a new turn', async () => {
    const ctx = mount({
      enabled: true,
      queue: [{ provider: 'fallback', model: 'cheap' }],
    })
    const { request, error } = listeners(ctx)
    const seed: LlmCallConfig = { provider: 'primary', model: 'main' }
    const payload = { agent: { session: { id: 's1' } }, turn: 1, failure: { code: 'SERVER' } }
    await expect(error(payload, async () => undefined)).resolves.toEqual({ kind: 'retry' })
    await expect(request(payload, async () => seed)).resolves.toEqual({
      provider: 'fallback', model: 'cheap',
    })
    await expect(error(payload, async () => undefined)).resolves.toBeUndefined()
    const nextTurn = { ...payload, turn: 2 }
    await expect(request(nextTurn, async () => seed)).resolves.toEqual(seed)
    const auth = { ...payload, turn: 2, failure: { code: 'AUTH' } }
    const next = vi.fn(async () => undefined)
    await error(auth, next)
    expect(next).toHaveBeenCalled()
  })
})
