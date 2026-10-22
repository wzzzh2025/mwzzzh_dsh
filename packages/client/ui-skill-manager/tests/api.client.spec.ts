/** Host-route fetch face: success, HTTP errors, and the inject binding. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { bytesToBase64, callSkillManager, createSkillsApi } from '../src/client/api.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('callSkillManager', () => {
  it('returns a parsed body on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { ok: true })))
    await expect(callSkillManager<{ ok: boolean }>('/_skill-manager/scan')).resolves.toEqual({ ok: true })
  })

  it('throws the host error message when present', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(400, { error: '未知的 skill 根' })))
    await expect(callSkillManager('/_skill-manager/toggle')).rejects.toThrow('未知的 skill 根')
  })

  it('throws the HTTP status when the body has no error field', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, {})))
    await expect(callSkillManager('/_skill-manager/scan')).rejects.toThrow('HTTP 401')
  })
})

describe('bytesToBase64', () => {
  it('encodes raw bytes', () => {
    expect(bytesToBase64(new Uint8Array([1, 2, 3]))).toBe(btoa('\u0001\u0002\u0003'))
  })
})

describe('createSkillsApi', () => {
  it('binds every host route onto the inject face', async () => {
    const request = vi.fn(async () => ({ path: '/tmp', text: '---' })) as typeof callSkillManager
    const api = createSkillsApi('/_skill-manager', request)
    await api.scan()
    await api.readFile('/tmp/SKILL.md')
    await api.browse()
    await api.browse('/tmp')
    await api.toggle('user-dsh', 'demo', false)
    await api.create({ source: 'user-dsh', name: 'demo', description: 'd', body: 'b' })
    await api.remove('user-dsh', 'demo')
    await api.importZip('user-dsh', 'demo', new Uint8Array([1]))
    await api.listTrash()
    await api.restoreTrash('demo-1')
    await api.purgeTrash('demo-1')
    expect(vi.mocked(request).mock.calls.map(call => call[0])).toEqual([
      '/_skill-manager/scan',
      '/_skill-manager/file?path=%2Ftmp%2FSKILL.md',
      '/_skill-manager/browse',
      '/_skill-manager/browse?path=%2Ftmp',
      '/_skill-manager/toggle',
      '/_skill-manager/create',
      '/_skill-manager/delete',
      '/_skill-manager/import',
      '/_skill-manager/trash',
      '/_skill-manager/trash-restore',
      '/_skill-manager/trash-delete',
    ])
    expect(vi.mocked(request).mock.calls[4]?.[1]).toMatchObject({ method: 'POST' })
  })
})
