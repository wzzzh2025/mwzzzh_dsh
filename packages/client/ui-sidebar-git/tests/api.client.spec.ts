/** Host-route fetch face for the Git tab. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { callGit, createGitApi } from '../src/client/api.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('callGit', () => {
  it('returns a parsed body on success and throws on errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { ok: true })))
    await expect(callGit<{ ok: boolean }>('/_git/status')).resolves.toEqual({ ok: true })
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(400, { error: '不是 git 仓库' })))
    await expect(callGit('/_git/status')).rejects.toThrow('不是 git 仓库')
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, {})))
    await expect(callGit('/_git/status')).rejects.toThrow('HTTP 401')
  })
})

describe('createGitApi', () => {
  it('binds status, diff, and commit', async () => {
    const request = vi.fn(async () => ({ entries: [], diff: 'x' })) as typeof callGit
    const api = createGitApi('/_git', request)
    await api.status('/repo')
    await api.diff('/repo', 'a.ts')
    await api.commit('/repo', 'msg', ['a.ts'])
    expect(vi.mocked(request).mock.calls.map(call => call[0])).toEqual([
      '/_git/status?cwd=%2Frepo',
      '/_git/diff?cwd=%2Frepo&path=a.ts',
      '/_git/commit',
    ])
  })
})
