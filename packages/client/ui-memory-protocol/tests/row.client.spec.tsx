// @vitest-environment jsdom
/** The switch follows accepted Host state, including refused writes. */
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ComponentProps } from 'react'
import { MemoryProtocolRow } from '../src/client/MemoryProtocolRow.tsx'
import { en, zh } from '../src/client/locales.ts'
import type { MemoryProtocolSettings } from '../src/client/types.ts'

afterEach(cleanup)

function fixture(writable = true) {
  const formState = createSnapshotStore<ConfigFormSnapshot<MemoryProtocolSettings>>({
    status: 'ready', value: { enabled: true }, base: {}, user: {}, revision: 0, writable,
  })
  const setEnabled = vi.fn(async (enabled: boolean) => {
    formState.update((state) => { state.value = { enabled } })
  })
  const props = {
    useMemoryProtocol: bindSnapshotSelector(formState),
    setEnabled,
    t: (key: keyof typeof en) => en[key],
  } as ComponentProps<typeof MemoryProtocolRow>
  return { formState, setEnabled, props }
}

it('shows a saved preference and writes the next value', async () => {
  const { props, setEnabled } = fixture()
  render(<MemoryProtocolRow {...props} />)
  fireEvent.click(screen.getByRole('switch', { name: en.title }))
  await waitFor(() => { expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false') })
  expect(setEnabled).toHaveBeenCalledWith(false)
})

it.each(['refused', 'rejected'] as const)('retains accepted state after a %s write', async (failure) => {
  const { props, setEnabled } = fixture()
  if (failure === 'refused') setEnabled.mockRejectedValue(new Error('settings write refused'))
  else setEnabled.mockRejectedValue(new Error('Disconnected'))
  render(<MemoryProtocolRow {...props} />)
  fireEvent.click(screen.getByRole('switch'))
  await screen.findByText(en.error)
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
})

it('disables input until a pending write settles', async () => {
  const { props, setEnabled } = fixture()
  const pending = Promise.withResolvers<undefined>()
  setEnabled.mockReturnValue(pending.promise)
  render(<MemoryProtocolRow {...props} />)
  fireEvent.click(screen.getByRole('switch'))
  expect(screen.getByRole('switch').hasAttribute('disabled')).toBe(true)
  pending.resolve(undefined)
  await waitFor(() => { expect(screen.getByRole('switch').hasAttribute('disabled')).toBe(false) })
})

it('shows the Chinese label and cannot edit read-only settings', () => {
  const { props, setEnabled } = fixture(false)
  render(<MemoryProtocolRow {...props} t={key => zh[key as keyof typeof zh]} />)
  expect(screen.getByText(zh.title)).toBeTruthy()
  expect(screen.getByRole('switch', { name: zh.title }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  fireEvent.click(screen.getByRole('switch'))
  expect(setEnabled).not.toHaveBeenCalled()
})
