/** Host routes: trust fence, method checks, and JSON error mapping. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'
import { GitOpError, type GitRunner } from '../src/git.ts'

interface Registered {
  path: string
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void
}

function mockRes() {
  let body = ''
  const headers: Record<string, string> = {}
  const res = {
    statusCode: 200,
    headers,
    get body() { return body },
    writeHead(status: number, extra?: Record<string, string>) {
      this.statusCode = status
      Object.assign(headers, extra)
    },
    setHeader(key: string, value: string) { headers[key] = value },
    end(chunk?: string | Buffer) { body = chunk === undefined ? '' : String(chunk) },
  }
  return res as typeof res & ServerResponse
}

function request(method: string, url: string, body?: string): IncomingMessage {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(body)]) as IncomingMessage
  stream.method = method
  stream.url = url
  stream.headers = { host: 'localhost' }
  return stream
}

async function mount(options?: { rejection?: 401 | 403; prefix?: string; run?: GitRunner }) {
  const routes: Registered[] = []
  const ctx = new Context()
  ctx.provide('webServer', {
    register: (entry: Registered) => {
      routes.push(entry)
      return () => undefined
    },
  })
  ctx.provide('connection', { requestRejection: () => options?.rejection })
  const cwd = await mkdtemp(join(tmpdir(), 'dsh-git-route-'))
  const run: GitRunner = options?.run ?? (async (_dir, args) => {
    if (args[0] === 'rev-parse') return { exitCode: 0, stdout: cwd, stderr: '' }
    if (args[0] === 'status') return { exitCode: 0, stdout: '?? a.txt\n', stderr: '' }
    if (args[0] === 'diff') return { exitCode: 0, stdout: 'diff --git a\n', stderr: '' }
    if (args[0] === 'add') return { exitCode: 0, stdout: '', stderr: '' }
    if (args[0] === 'commit') return { exitCode: 0, stdout: '[main abc] msg\n', stderr: '' }
    return { exitCode: 1, stdout: '', stderr: 'unknown' }
  })
  apply(ctx, { prefix: options?.prefix, timeoutMs: 1000 }, run)
  return { routes, cwd }
}

function get(routes: Registered[], suffix: string): Registered['handler'] {
  const found = routes.find(route => route.path.endsWith(suffix))
  if (found === undefined) throw new Error(`missing ${suffix}`)
  return found.handler
}

describe('git-sidebar routes', () => {
  it('refuses a prefix under /api', async () => {
    const ctx = new Context()
    ctx.provide('webServer', { register: () => () => undefined })
    ctx.provide('connection', { requestRejection: () => undefined })
    expect(() => apply(ctx, { prefix: '/api/git' })).toThrow('/api')
  })

  it('rejects an unauthenticated caller and a wrong method', async () => {
    const { routes } = await mount({ rejection: 401 })
    const res = mockRes()
    await get(routes, '/status')(request('GET', '/_git/status'), res)
    expect(res.statusCode).toBe(401)
    const allowed = await mount()
    const method = mockRes()
    await get(allowed.routes, '/status')(request('POST', '/_git/status'), method)
    expect(method.statusCode).toBe(405)
  })

  it('returns status, diff, and commit, and maps failures', async () => {
    const { routes, cwd } = await mount()
    const status = mockRes()
    await get(routes, '/status')(request('GET', `/_git/status?cwd=${encodeURIComponent(cwd)}`), status)
    expect(JSON.parse(status.body).entries[0].path).toBe('a.txt')

    const missingDiff = mockRes()
    await get(routes, '/diff')(request('GET', `/_git/diff?cwd=${encodeURIComponent(cwd)}`), missingDiff)
    expect(missingDiff.statusCode).toBe(400)
    const missingCwd = mockRes()
    await get(routes, '/diff')(request('GET', '/_git/diff?path=a.txt'), missingCwd)
    expect(missingCwd.statusCode).toBe(400)
    const emptyPath = mockRes()
    await get(routes, '/diff')(request('GET', `/_git/diff?cwd=${encodeURIComponent(cwd)}&path=`), emptyPath)
    expect(emptyPath.statusCode).toBe(400)

    const diff = mockRes()
    await get(routes, '/diff')(request('GET', `/_git/diff?cwd=${encodeURIComponent(cwd)}&path=a.txt`), diff)
    expect(JSON.parse(diff.body).diff).toMatch(/diff --git/)

    const emptyCommit = mockRes()
    await get(routes, '/commit')(request('POST', '/_git/commit', JSON.stringify({ cwd, message: '', paths: ['a.txt'] })), emptyCommit)
    expect(emptyCommit.statusCode).toBe(400)

    const noPaths = mockRes()
    await get(routes, '/commit')(request('POST', '/_git/commit', JSON.stringify({ cwd, message: 'x' })), noPaths)
    expect(noPaths.statusCode).toBe(400)

    const committed = mockRes()
    await get(routes, '/commit')(request('POST', '/_git/commit', JSON.stringify({
      cwd, message: 'msg', paths: ['a.txt'],
    })), committed)
    expect(JSON.parse(committed.body).ok).toBe(true)

    const invalid = mockRes()
    await get(routes, '/commit')(request('POST', '/_git/commit', '{'), invalid)
    expect(invalid.statusCode).toBe(400)

    const huge = mockRes()
    await get(routes, '/commit')(request('POST', '/_git/commit', 'x'.repeat(70_000)), huge)
    expect(huge.statusCode).toBe(400)

    const boom = mockRes()
    const req = request('GET', `/_git/status?cwd=${encodeURIComponent(cwd)}`)
    Object.defineProperty(req, 'url', { get() { throw new Error('boom') } })
    await get(routes, '/status')(req, boom)
    expect(boom.statusCode).toBe(500)
  })

  it('maps a git failure and a timeout', async () => {
    const { routes, cwd } = await mount({
      run: async (dir, args) => {
        if (args[0] === 'rev-parse') return { exitCode: 0, stdout: dir, stderr: '' }
        if (args[0] === 'status') return { exitCode: 1, stdout: '', stderr: 'denied' }
        if (args[0] === 'diff') return { exitCode: 1, stdout: '', stderr: '' }
        if (args[0] === 'add') return { exitCode: 1, stdout: '', stderr: 'add failed' }
        return { exitCode: 1, stdout: '', stderr: 'commit failed' }
      },
    })
    const status = mockRes()
    await get(routes, '/status')(request('GET', `/_git/status?cwd=${encodeURIComponent(cwd)}`), status)
    expect(JSON.parse(status.body).code).toBe('git-failed')
    const diff = mockRes()
    await get(routes, '/diff')(request('GET', `/_git/diff?cwd=${encodeURIComponent(cwd)}&path=a`), diff)
    expect(JSON.parse(diff.body).code).toBe('git-failed')
    const add = mockRes()
    await get(routes, '/commit')(request('POST', '/_git/commit', JSON.stringify({
      cwd, message: 'm', paths: ['a'],
    })), add)
    expect(JSON.parse(add.body).code).toBe('git-failed')

    const timeoutMount = await mount({
      run: async (dir, args) => {
        if (args[0] === 'rev-parse') return { exitCode: 0, stdout: dir, stderr: '' }
        throw new GitOpError('timeout', 'slow')
      },
    })
    const timeout = mockRes()
    await get(timeoutMount.routes, '/status')(request('GET', `/_git/status?cwd=${encodeURIComponent(timeoutMount.cwd)}`), timeout)
    expect(timeout.statusCode).toBe(504)

    const commitFail = await mount({
      run: async (dir, args) => {
        if (args[0] === 'rev-parse') return { exitCode: 0, stdout: dir, stderr: '' }
        if (args[0] === 'add') return { exitCode: 0, stdout: '', stderr: '' }
        return { exitCode: 1, stdout: '', stderr: '' }
      },
    })
    const commit = mockRes()
    await get(commitFail.routes, '/commit')(request('POST', '/_git/commit', JSON.stringify({
      cwd: commitFail.cwd, message: 'm', paths: ['a'],
    })), commit)
    expect(JSON.parse(commit.body).code).toBe('git-failed')

    const ctx = new Context()
    ctx.provide('webServer', { register: () => () => undefined })
    ctx.provide('connection', { requestRejection: () => undefined })
    apply(ctx, {})
    const ok = await mount()
    const bare = request('GET', `/_git/status?cwd=${encodeURIComponent(ok.cwd)}`)
    bare.method = undefined
    const fallback = mockRes()
    await get(ok.routes, '/status')(bare, fallback)
    expect(fallback.statusCode).toBe(200)
  })

  it('accepts an empty JSON body, a missing URL, and empty git stderr', async () => {
    const { routes, cwd } = await mount({
      run: async (dir, args) => {
        if (args[0] === 'rev-parse') return { exitCode: 0, stdout: dir, stderr: '' }
        if (args[0] === 'status') return { exitCode: 1, stdout: '', stderr: '' }
        if (args[0] === 'add') return { exitCode: 1, stdout: '', stderr: '' }
        return { exitCode: 1, stdout: '', stderr: '' }
      },
    })
    const empty = mockRes()
    await get(routes, '/commit')(request('POST', '/_git/commit'), empty)
    expect(empty.statusCode).toBe(400)

    const noMessage = mockRes()
    await get(routes, '/commit')(request('POST', '/_git/commit', JSON.stringify({ cwd, paths: ['a'] })), noMessage)
    expect(noMessage.statusCode).toBe(400)

    const emptyPath = mockRes()
    await get(routes, '/diff')(request('GET', `/_git/diff?cwd=${encodeURIComponent(cwd)}&path=`), emptyPath)
    expect(emptyPath.statusCode).toBe(400)

    const viaQuery = mockRes()
    await get(routes, '/commit')(request('POST', `/_git/commit?cwd=${encodeURIComponent(cwd)}`, JSON.stringify({
      message: 'm', paths: ['a'],
    })), viaQuery)
    expect(JSON.parse(viaQuery.body).code).toBe('git-failed')

    const status = mockRes()
    await get(routes, '/status')(request('GET', `/_git/status?cwd=${encodeURIComponent(cwd)}`), status)
    expect(JSON.parse(status.body).error).toMatch(/git status/)

    const noUrl = mockRes()
    const req = request('GET', `/_git/status?cwd=${encodeURIComponent(cwd)}`)
    req.url = undefined
    await get(routes, '/status')(req, noUrl)
    expect(noUrl.statusCode).toBe(400)
  })

  it('maps a missing cwd and a directory that is not a repo', async () => {
    const { routes, cwd } = await mount({
      run: async (_dir, args) => {
        if (args[0] === 'rev-parse') return { exitCode: 1, stdout: '', stderr: 'not a git repo' }
        return { exitCode: 1, stdout: '', stderr: 'unused' }
      },
    })
    const missing = mockRes()
    await get(routes, '/status')(request('GET', '/_git/status'), missing)
    expect(JSON.parse(missing.body).code).toBe('bad-request')
    const outside = mockRes()
    await get(routes, '/status')(request('GET', `/_git/status?cwd=${encodeURIComponent(cwd)}`), outside)
    expect(outside.statusCode).toBe(400)
    expect(JSON.parse(outside.body).code).toBe('not-a-repo')
  })
})
