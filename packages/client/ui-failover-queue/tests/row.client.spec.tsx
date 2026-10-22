// @vitest-environment jsdom
/** The switch and queue editor follow accepted Host state. */

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ComponentProps } from 'react'
import { FailoverQueueRow } from '../src/client/FailoverQueueRow.tsx'
import { en } from '../src/client/locales.ts'
import type { FailoverQueueSettings } from '../src/client/types.ts'

afterEach(cleanup)

function fixture(value: FailoverQueueSettings = { enabled: true, queue: [{ provider: 'a', model: 'b' }] }) {
  const formState = createSnapshotStore<ConfigFormSnapshot<FailoverQueueSettings>>({
    status: 'ready', value, base: {}, user: {}, revision: 0, writable: true,
  })
  const setEnabled = vi.fn(async (enabled: boolean) => {
    formState.update((state) => { state.value = { ...state.value, enabled } })
  })
  const setQueue = vi.fn(async () => undefined)
  const props = {
    useFailoverQueue: bindSnapshotSelector(formState),
    setEnabled,
    setQueue,
    t: (key: keyof typeof en) => en[key],
  } as ComponentProps<typeof FailoverQueueRow>
  return { setEnabled, setQueue, props }
}

it('writes enabled and commits the queue textarea on blur', async () => {
  const { props, setEnabled, setQueue } = fixture()
  render(<FailoverQueueRow {...props} />)
  const area = screen.getByLabelText(en.queue)
  fireEvent.blur(area)
  expect(setQueue).not.toHaveBeenCalled()
  fireEvent.change(area, { target: { value: 'x/y' } })
  fireEvent.blur(area)
  await waitFor(() => { expect(setQueue).toHaveBeenCalledWith('x/y') })
  fireEvent.click(screen.getByRole('switch', { name: en.title }))
  await waitFor(() => { expect(setEnabled).toHaveBeenCalledWith(false) })
})

it('keeps the textarea after a refused queue write', async () => {
  const { props, setQueue } = fixture()
  setQueue.mockRejectedValue(new Error('settings write refused'))
  render(<FailoverQueueRow {...props} />)
  const area = screen.getByLabelText(en.queue)
  fireEvent.change(area, { target: { value: 'x/y' } })
  fireEvent.blur(area)
  await screen.findByText(en.error)
})

it('keeps the queue hidden while failover is off and reports a refused write', async () => {
  const { props, setEnabled } = fixture({ enabled: false })
  setEnabled.mockRejectedValue(new Error('settings write refused'))
  render(<FailoverQueueRow {...props} />)
  expect(screen.queryByLabelText(en.queue)).toBeNull()
  fireEvent.click(screen.getByRole('switch'))
  await screen.findByText(en.error)
})
