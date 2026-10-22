// @vitest-environment jsdom
/** Composer context-window chip: inherit vs pin, and a refused write. */

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { LlmConfigurableProvider, SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import { ContextCapSelect, type ContextCapSelectProps } from '../src/client/ContextCapSelect.tsx'
import type { ComposerContextState } from '../src/client/store.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const provider: LlmConfigurableProvider = {
  provider: 'akali',
  displayName: 'akali',
  settingsNs: 'llm-pi-ai',
  settingsPath: ['providers', 'akali'],
}

function namespace(window: number, user = false): SettingsNamespaceView {
  const models = [{ id: 'flash', contextWindow: window }]
  return {
    autoGenerate: true,
    ns: 'llm-pi-ai',
    schema: {},
    value: { providers: { akali: { models } } } as SettingsNamespaceView['value'],
    ...user ? { user: { providers: { akali: { models } } } as SettingsNamespaceView['user'] } : {},
    applies: 'live',
    secrets: [],
    revision: 1,
  } as SettingsNamespaceView
}

const t: ContextCapSelectProps['t'] = makeTranslate(zh)

function setup(options: {
  window?: number
  user?: boolean
  status?: ComposerContextState['status']
  setWindow?: ContextCapSelectProps['setWindow']
} = {}) {
  const selection = createSnapshotStore({
    value: { next: { provider: 'akali', model: 'flash' }, lastUsed: null },
  })
  const cap = createSnapshotStore<ComposerContextState>({
    status: options.status ?? 'ready',
    error: null,
    writable: true,
    providers: [provider],
    namespaces: new Map([['llm-pi-ai', namespace(options.window ?? 1_000_000, options.user === true)]]),
  })
  const setWindow = vi.fn(options.setWindow ?? (async () => ({ ok: true as const })))
  const props = {
    useProjection: (_key: string, selector?: (value: unknown) => unknown) =>
      bindSnapshotSelector(selection)(state => (selector ?? (value => value))(state.value)),
    useContextCap: bindSnapshotSelector(cap),
    setWindow,
    t,
  } as unknown as ContextCapSelectProps
  render(<ContextCapSelect {...props} />)
  return { setWindow }
}

function trigger(): HTMLButtonElement {
  return screen.getByRole('button', { name: /^上下文上限/ }) as HTMLButtonElement
}

it('hides until the Settings snapshot is ready', () => {
  setup({ status: 'loading' })
  expect(screen.queryByRole('button', { name: /^上下文上限/ })).toBeNull()
})

it('shows the effective window when the composition names one and the user layer does not', () => {
  setup({ window: 1_000_000, user: false })
  expect(trigger().textContent).toContain(zh['gear.1m'])
})

it('shows the pinned gear and submits a new window', async () => {
  const { setWindow } = setup({ window: 128_000, user: true })
  expect(trigger().textContent).toContain(zh['gear.128k'])
  fireEvent.click(trigger())
  fireEvent.click(screen.getByRole('menuitem', { name: zh['gear.64k'] }))
  await waitFor(() => {
    expect(setWindow).toHaveBeenCalledWith('akali', 'flash', 64_000)
  })
})

it('inherits the catalog when Default is chosen, and toasts a refused write', async () => {
  const { setWindow } = setup({
    window: 128_000,
    user: true,
    setWindow: async () => ({ ok: false, message: 'conflict' }),
  })
  fireEvent.click(trigger())
  fireEvent.click(screen.getByRole('menuitem', { name: zh['gear.default'] }))
  await waitFor(() => {
    expect(setWindow).toHaveBeenCalledWith('akali', 'flash', undefined)
  })
  expect(await screen.findByText(zh['error.write'].replace('{message}', 'conflict'))).toBeTruthy()
})
