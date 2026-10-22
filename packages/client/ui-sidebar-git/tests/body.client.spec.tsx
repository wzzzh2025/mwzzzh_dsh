// @vitest-environment jsdom
/** Git tab body: status, diff, commit, and empty/error states. */

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { GitBody, GitTitle } from '../src/client/GitBody.tsx'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

function fixture(overrides: Partial<ComponentProps<typeof GitBody>> & { emptyCwd?: boolean } = {}) {
  const { emptyCwd, ...rest } = overrides
  const status = rest.status ?? vi.fn(async () => [{ path: 'a.ts', index: ' ', worktree: 'M', untracked: false }])
  const diff = rest.diff ?? vi.fn(async () => 'diff --git a')
  const commit = rest.commit ?? vi.fn(async () => undefined)
  const props = {
    sessionId: 's1',
    useSessions: (select: (state: { byId: Record<string, { cwd?: string } | undefined> }) => unknown) =>
      select({ byId: emptyCwd === true ? { s1: {} } : { s1: { cwd: '/repo' } } }),
    t: (key: keyof typeof en) => en[key],
    ...rest,
    status,
    diff,
    commit,
  } as ComponentProps<typeof GitBody>
  return { props, status, diff, commit }
}

it('shows no-workspace copy without a cwd', () => {
  const { props } = fixture({ emptyCwd: true })
  render(<GitBody {...props} />)
  expect(screen.getByText(en.noWorkspace)).toBeTruthy()
})

it('lists status, opens a diff, and commits selected paths', async () => {
  const { props, diff, commit, status } = fixture({
    status: vi.fn(async () => [
      { path: 'a.ts', index: ' ', worktree: 'M', untracked: false },
      { path: 'new.txt', index: ' ', worktree: '?', untracked: true },
    ]),
    diff: vi.fn(async () => ''),
    commit: vi.fn(async () => { throw new Error('no identity') }),
  })
  render(<GitBody {...props} />)
  await screen.findByText('a.ts')
  fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
  await waitFor(() => { expect(diff).toHaveBeenCalledWith('/repo', 'a.ts') })
  await screen.findByText(en.diffEmpty)
  const box = screen.getAllByRole('checkbox')[0]!
  fireEvent.click(box)
  fireEvent.click(box)
  fireEvent.submit(screen.getByLabelText(en.message).closest('form')!)
  expect(commit).not.toHaveBeenCalled()
  fireEvent.click(box)
  fireEvent.change(screen.getByLabelText(en.message), { target: { value: 'fix' } })
  fireEvent.submit(screen.getByLabelText(en.message).closest('form')!)
  await screen.findByText(/no identity/)
  expect(status).toHaveBeenCalledTimes(1)
})

it('commits selected paths after a successful write', async () => {
  const { props, commit, status } = fixture()
  render(<GitBody {...props} />)
  await screen.findByText('a.ts')
  fireEvent.click(screen.getByRole('button', { name: en.refresh }))
  await waitFor(() => { expect(status).toHaveBeenCalledTimes(2) })
  fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
  await screen.findByText(/diff --git/)
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.change(screen.getByLabelText(en.message), { target: { value: 'fix' } })
  fireEvent.submit(screen.getByLabelText(en.message).closest('form')!)
  await waitFor(() => { expect(commit).toHaveBeenCalledWith('/repo', 'fix', ['a.ts']) })
  expect(status).toHaveBeenCalledTimes(3)
})

it('shows an empty tree, a retryable error, and a failed diff', async () => {
  const status = vi.fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce([])
  const { props } = fixture({
    status,
    diff: vi.fn(async () => { throw new Error('no diff') }),
  })
  render(<GitBody {...props} />)
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: en.retry }))
  await screen.findByText(en.empty)
})

it('reports a failed diff without blanking the list', async () => {
  const { props } = fixture({
    diff: vi.fn(async () => { throw new Error('no diff') }),
  })
  render(<GitBody {...props} />)
  await screen.findByText('a.ts')
  fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
  await screen.findByText(/no diff/)
  expect(screen.getByText('a.ts')).toBeTruthy()
})

it('renders the chip title', () => {
  const props = {
    useTabInfo: () => ({ tab: { title: 'Git' } }),
  } as ComponentProps<typeof GitTitle>
  render(<GitTitle {...props} />)
  expect(screen.getByText('Git')).toBeTruthy()
})
