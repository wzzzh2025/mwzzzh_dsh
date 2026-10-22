// @vitest-environment jsdom
/** Skills settings page: inventory, diagnostics, and the lifecycle actions. */

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { SkillsSection } from '../src/client/SkillsSection.tsx'
import { en } from '../src/client/locales.ts'
import type { ScanResult, SkillsSectionInjected } from '../src/client/types.ts'

afterEach(cleanup)

const scanFixture: ScanResult = {
  roots: [
    { source: 'project-dsh', path: '/proj/.dsh/skills', rank: 100, present: false, entries: 0 },
    { source: 'user-dsh', path: '/home/.dsh/skills', rank: 400, present: true, entries: 1 },
  ],
  skills: [{
    name: 'demo-skill',
    description: 'A demo',
    path: '/home/.dsh/skills/demo-skill/SKILL.md',
    root: 'user-dsh',
    shape: 'directory',
    bundle: 'demo-skill',
    rootPath: '/home/.dsh/skills',
    bodyChars: 12,
  }],
  disabled: [{
    name: 'parked',
    description: 'Parked',
    path: '/home/.dsh/skills/.disabled/parked/SKILL.md',
    root: 'user-dsh',
    shape: 'directory',
    bundle: 'parked',
    rootPath: '/home/.dsh/skills',
    bodyChars: 4,
  }],
  problems: [{
    name: 'broken',
    path: '/home/.dsh/skills/broken/SKILL.md',
    root: 'user-dsh',
    reason: 'yaml-error',
    detail: 'unquoted colon',
    fix: 'use a folded block',
  }, {
    name: 'no-fix',
    path: '/home/.dsh/skills/no-fix/SKILL.md',
    root: 'user-dsh',
    reason: 'read-error',
    detail: 'EACCES',
  }],
  missingRoots: ['/proj/.dsh/skills'],
}

function fixture(overrides: Partial<SkillsSectionInjected> = {}) {
  const api: SkillsSectionInjected = {
    scan: vi.fn(async () => scanFixture),
    readFile: vi.fn(async () => ({ path: '/x', text: '---\nname: demo\n---\n' })),
    browse: vi.fn(async () => ({
      path: '/home/.dsh/skills',
      parent: '/home/.dsh',
      entries: [
        { name: 'demo-skill', path: '/home/.dsh/skills/demo-skill', kind: 'directory', isSkill: true },
        { name: 'notes.md', path: '/home/.dsh/skills/notes.md', kind: 'file', isSkill: true },
        { name: 'readme.txt', path: '/home/.dsh/skills/readme.txt', kind: 'file' },
      ],
    })),
    toggle: vi.fn(async () => undefined),
    create: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    importZip: vi.fn(async () => undefined),
    listTrash: vi.fn(async () => [{
      id: 'demo-skill-1',
      name: 'trashed',
      bundle: 'trashed',
      source: 'user-dsh',
      rootPath: '/home/.dsh/skills',
      deletedAt: 1,
    }]),
    restoreTrash: vi.fn(async () => undefined),
    purgeTrash: vi.fn(async () => undefined),
    ...overrides,
  }
  const props = {
    close: vi.fn(),
    t: (key: keyof typeof en) => en[key],
    ...api,
  } as ComponentProps<typeof SkillsSection>
  return { api, props }
}

it('shows an empty trash when the host returns none', async () => {
  const { props } = fixture({ listTrash: vi.fn(async () => []) })
  render(<SkillsSection {...props} />)
  await screen.findByText(en.trashEmpty)
})

it('renders roots, loadable skills, disabled bundles, and skipped problems', async () => {
  const { props } = fixture()
  render(<SkillsSection {...props} />)
  await screen.findByText('demo-skill')
  expect(screen.getByText('missing')).toBeTruthy()
  expect(screen.getByText('parked')).toBeTruthy()
  expect(screen.getByText('broken')).toBeTruthy()
  expect(screen.getByText('use a folded block')).toBeTruthy()
  expect(screen.getByText('EACCES')).toBeTruthy()
})

it('shows a retryable error and keeps retrying until the scan succeeds', async () => {
  const scan = vi.fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ ...scanFixture, skills: [], disabled: [], problems: [] })
  const { props } = fixture({ scan })
  render(<SkillsSection {...props} />)
  await screen.findByRole('alert')
  expect(screen.getByText(/offline/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: en.retry }))
  await screen.findByText(en.empty)
})

it('opens, cancels, and submits the create form', async () => {
  const { api, props } = fixture()
  render(<SkillsSection {...props} />)
  await screen.findByText('demo-skill')
  fireEvent.click(screen.getByRole('button', { name: en.create }))
  fireEvent.click(screen.getByRole('button', { name: en.create }))
  expect(screen.queryByLabelText(en.createName)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: en.create }))
  fireEvent.click(screen.getByRole('button', { name: en.createCancel }))
  expect(screen.queryByLabelText(en.createName)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: en.create }))
  fireEvent.change(screen.getByLabelText(en.createName), { target: { value: 'new-skill' } })
  fireEvent.change(screen.getByLabelText(en.createDescription), { target: { value: 'desc' } })
  fireEvent.change(screen.getByLabelText(en.createBody), { target: { value: 'body' } })
  fireEvent.submit(screen.getByLabelText(en.createName).closest('form')!)
  await waitFor(() => { expect(api.create).toHaveBeenCalledWith({
    source: 'user-dsh', name: 'new-skill', description: 'desc', body: 'body',
  }) })
})

it('keeps the create form open when create fails', async () => {
  const { props } = fixture({ create: vi.fn(async () => { throw new Error('taken') }) })
  render(<SkillsSection {...props} />)
  await screen.findByText('demo-skill')
  fireEvent.click(screen.getByRole('button', { name: en.create }))
  fireEvent.change(screen.getByLabelText(en.createName), { target: { value: 'x' } })
  fireEvent.change(screen.getByLabelText(en.createDescription), { target: { value: 'y' } })
  fireEvent.submit(screen.getByLabelText(en.createName).closest('form')!)
  await screen.findByText(/taken/)
  expect(screen.getByLabelText(en.createName)).toBeTruthy()
})

it('opens skill detail and the directory browser', async () => {
  const { api, props } = fixture()
  render(<SkillsSection {...props} />)
  await screen.findByText('demo-skill')
  fireEvent.click(screen.getByRole('button', { name: en.detail }))
  expect(await screen.findByRole('dialog', { name: en.detail })).toBeTruthy()
  await screen.findByText(/name: demo/)
  fireEvent.click(screen.getByRole('button', { name: en.detailClose }))
  expect(screen.queryByRole('dialog', { name: en.detail })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: en.browse }))
  await screen.findByText('demo-skill/')
  expect(screen.getByText('readme.txt')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'demo-skill/' }))
  fireEvent.click(screen.getByRole('button', { name: '..' }))
  fireEvent.click(screen.getByRole('button', { name: en.detailClose }))
  expect(api.browse).toHaveBeenCalled()
})

it('shows an empty browse listing and reports browse or detail failures', async () => {
  const browse = vi.fn()
    .mockRejectedValueOnce(new Error('no browse'))
    .mockResolvedValueOnce({ path: '', entries: [] })
  const { props } = fixture({
    browse,
    readFile: vi.fn(async () => { throw new Error('no file') }),
  })
  render(<SkillsSection {...props} />)
  await screen.findByText('demo-skill')
  fireEvent.click(screen.getByRole('button', { name: en.detail }))
  await screen.findByText(/no file/)
  fireEvent.click(screen.getByRole('button', { name: en.browse }))
  await screen.findByText(/no browse/)
  fireEvent.click(screen.getByRole('button', { name: en.browse }))
  await screen.findByText(en.browseEmpty)
})

it('restores trash and purges after confirm', async () => {
  const confirm = vi.spyOn(window, 'confirm')
  const { api, props } = fixture()
  render(<SkillsSection {...props} />)
  await screen.findByText('trashed')
  fireEvent.click(screen.getByRole('button', { name: en.restore }))
  await waitFor(() => { expect(api.restoreTrash).toHaveBeenCalledWith('demo-skill-1') })
  confirm.mockReturnValueOnce(false)
  fireEvent.click(screen.getByRole('button', { name: en.purge }))
  expect(api.purgeTrash).not.toHaveBeenCalled()
  confirm.mockReturnValueOnce(true)
  fireEvent.click(screen.getByRole('button', { name: en.purge }))
  await waitFor(() => { expect(api.purgeTrash).toHaveBeenCalledWith('demo-skill-1') })
  confirm.mockRestore()
})

it('toggles, deletes after confirm, and skips delete when cancelled', async () => {
  const confirm = vi.spyOn(window, 'confirm')
  const { api, props } = fixture()
  render(<SkillsSection {...props} />)
  await screen.findByText('demo-skill')
  fireEvent.click(screen.getByRole('button', { name: en.disable }))
  await waitFor(() => { expect(api.toggle).toHaveBeenCalledWith('user-dsh', 'demo-skill', false) })
  fireEvent.click(screen.getByRole('button', { name: en.enable }))
  await waitFor(() => { expect(api.toggle).toHaveBeenCalledWith('user-dsh', 'parked', true) })
  confirm.mockReturnValueOnce(false)
  fireEvent.click(screen.getByRole('button', { name: en.remove }))
  expect(api.remove).not.toHaveBeenCalled()
  confirm.mockReturnValueOnce(true)
  fireEvent.click(screen.getByRole('button', { name: en.remove }))
  await waitFor(() => { expect(api.remove).toHaveBeenCalledWith('user-dsh', 'demo-skill') })
  confirm.mockRestore()
})

it('imports a zip through the file input', async () => {
  const { api, props } = fixture()
  render(<SkillsSection {...props} />)
  await screen.findByText('demo-skill')
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([new Uint8Array([1, 2])], 'pack.zip', { type: 'application/zip' })
  fireEvent.change(input, { target: { files: [] } })
  expect(api.importZip).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { files: [file] } })
  await waitFor(() => { expect(api.importZip).toHaveBeenCalled() })
  expect(api.importZip.mock.calls[0]?.[0]).toBe('user-dsh')
  expect(api.importZip.mock.calls[0]?.[1]).toBe('pack')
})

it('rescan button reloads the inventory', async () => {
  const { api, props } = fixture()
  render(<SkillsSection {...props} />)
  await screen.findByText('demo-skill')
  fireEvent.click(screen.getByRole('button', { name: en.refresh }))
  await waitFor(() => { expect(api.scan).toHaveBeenCalledTimes(2) })
})
