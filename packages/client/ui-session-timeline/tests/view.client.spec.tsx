// @vitest-environment jsdom
/** Timeline view: empty state, jump, and Chat scroll. */

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { SessionSeq } from '@deepseek-ai/dsh-session/types'
import { scrollToChatTurn, TimelineView } from '../src/client/TimelineView.tsx'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

function fixture(overrides: Partial<ComponentProps<typeof TimelineView>> = {}) {
  const jump = vi.fn(async () => undefined)
  const openView = vi.fn()
  const props = {
    sessionId: 's1',
    inspectCall: undefined,
    viewRequest: null,
    openView,
    completeViewRequest: vi.fn(),
    useProjection: (key: string) => (key === 'turnOutline'
      ? [{ turn: 2, seq: SessionSeq(4), prompt: 'hello', response: 'world' }]
      : undefined),
    jump,
    t: (key: keyof typeof en, vars?: Record<string, unknown>) =>
      vars === undefined ? en[key] : en[key].replace('{turn}', String(vars.turn)),
    ...overrides,
  } as ComponentProps<typeof TimelineView>
  return { props, jump, openView }
}

it('shows an empty state when the outline has no turns', () => {
  const { props } = fixture({ useProjection: () => undefined })
  render(<TimelineView {...props} />)
  expect(screen.getByText(en.empty)).toBeTruthy()
})

it('jumps to Chat after paging history through the turn start', async () => {
  const { props, jump, openView } = fixture()
  render(<TimelineView {...props} />)
  fireEvent.click(screen.getByRole('button', { name: /Turn 2/ }))
  await waitFor(() => { expect(jump).toHaveBeenCalledWith(SessionSeq(4)) })
  expect(openView).toHaveBeenCalledWith('chat', 'turn:2')
  await new Promise<void>((resolve) => { requestAnimationFrame(() => { resolve() }) })
})

it('scrolls the matching chat turn into view', () => {
  const row = document.createElement('div')
  row.setAttribute('data-chat-turn', '3')
  const scroll = vi.fn()
  row.scrollIntoView = scroll
  document.body.append(row)
  scrollToChatTurn(3)
  expect(scroll).toHaveBeenCalled()
  row.remove()
})
