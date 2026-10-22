/** Host routes: trust fence, method checks, and JSON error mapping. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { zipSync } from 'fflate'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'

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

async function mount(options?: {
  rejection?: 401 | 403
  projectRoot?: string | null
  prefix?: string
  maxImportBytes?: number
}) {
  const projectRoot = options?.projectRoot === null
    ? undefined
    : (options?.projectRoot ?? await mkdtemp(join(tmpdir(), 'dsh-skill-routes-')))
  const routes: Registered[] = []
  const ctx = new Context()
  ctx.provide('webServer', {
    register: (entry: Registered) => {
      routes.push(entry)
      return () => undefined
    },
  })
  ctx.provide('connection', {
    requestRejection: () => options?.rejection,
  })
  if (projectRoot !== undefined) {
    vi.stubEnv('DSH_HOME', join(projectRoot, '.home-dsh'))
    vi.stubEnv('DSH_AGENTS_HOME', join(projectRoot, '.home-agents'))
  }
  apply(ctx, {
    ...(projectRoot === undefined ? {} : { projectRoot }),
    ...(options?.prefix === undefined ? {} : { prefix: options.prefix }),
    ...(options?.maxImportBytes === undefined ? {} : { maxImportBytes: options.maxImportBytes }),
  })
  return { ctx, routes, projectRoot }
}

function get(routes: Registered[], suffix: string): Registered['handler'] {
  const found = routes.find(route => route.path.endsWith(suffix))
  if (found === undefined) throw new Error(`missing ${suffix}`)
  return found.handler
}

function request(method: string, url: string, body?: string): IncomingMessage {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(body)]) as IncomingMessage
  stream.method = method
  stream.url = url
  stream.headers = { host: 'localhost' }
  return stream
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('skill-manager routes', () => {
  it('refuses a prefix under /api', async () => {
    const ctx = new Context()
    ctx.provide('webServer', { register: () => () => undefined })
    ctx.provide('connection', { requestRejection: () => undefined })
    expect(() => apply(ctx, { prefix: '/api/skills' })).toThrow('/api')
  })

  it('rejects an unauthenticated caller before scanning', async () => {
    const { routes } = await mount({ rejection: 401 })
    const res = mockRes()
    await get(routes, '/scan')(request('GET', '/_skill-manager/scan'), res)
    expect(res.statusCode).toBe(401)
  })

  it('answers 405 when the method does not match the route', async () => {
    const { routes } = await mount()
    const res = mockRes()
    await get(routes, '/scan')(request('POST', '/_skill-manager/scan'), res)
    expect(res.statusCode).toBe(405)
    expect(res.headers.allow).toBe('GET')
  })

  it('scans, reads, browses, and maps SkillOpError codes', async () => {
    const { routes, projectRoot } = await mount()
    await mkdir(join(projectRoot, '.dsh', 'skills', 'demo'), { recursive: true })
    await writeFile(join(projectRoot, '.dsh', 'skills', 'demo', 'SKILL.md'), `---
name: demo
description: x
---
`, 'utf8')

    const scanRes = mockRes()
    await get(routes, '/scan')(request('GET', '/_skill-manager/scan'), scanRes)
    expect(JSON.parse(scanRes.body).skills[0].name).toBe('demo')

    const missingFile = mockRes()
    await get(routes, '/file')(request('GET', '/_skill-manager/file'), missingFile)
    expect(missingFile.statusCode).toBe(400)

    const fileRes = mockRes()
    const filePath = join(projectRoot, '.dsh', 'skills', 'demo', 'SKILL.md')
    await get(routes, '/file')(request('GET', `/_skill-manager/file?path=${encodeURIComponent(filePath)}`), fileRes)
    expect(JSON.parse(fileRes.body).text).toMatch(/name: demo/)

    const browseRes = mockRes()
    await get(routes, '/browse')(request('GET', '/_skill-manager/browse'), browseRes)
    expect(JSON.parse(browseRes.body).entries.length).toBeGreaterThan(0)

    const badRoot = mockRes()
    await get(routes, '/toggle')(request('POST', '/_skill-manager/toggle', JSON.stringify({
      source: 'no-such', name: 'demo', enabled: false,
    })), badRoot)
    expect(badRoot.statusCode).toBe(400)

    const missing = mockRes()
    await get(routes, '/toggle')(request('POST', '/_skill-manager/toggle', JSON.stringify({
      source: 'project-dsh', name: 'ghost', enabled: false,
    })), missing)
    expect(missing.statusCode).toBe(404)

    const created = mockRes()
    await get(routes, '/create')(request('POST', '/_skill-manager/create', JSON.stringify({
      source: 'project-dsh', name: 'second', description: 'y', body: 'z',
    })), created)
    expect(JSON.parse(created.body).ok).toBe(true)

    const collision = mockRes()
    await get(routes, '/create')(request('POST', '/_skill-manager/create', JSON.stringify({
      source: 'project-dsh', name: 'second', description: 'y', body: 'z',
    })), collision)
    expect(collision.statusCode).toBe(409)

    const deleted = mockRes()
    await get(routes, '/delete')(request('POST', '/_skill-manager/delete', JSON.stringify({
      source: 'project-dsh', name: 'second',
    })), deleted)
    const deletedBody = JSON.parse(deleted.body) as { ok: boolean; id: string }
    expect(deletedBody.ok).toBe(true)
    expect(deletedBody.id).toMatch(/^second-/)

    const trashRes = mockRes()
    await get(routes, '/trash')(request('GET', '/_skill-manager/trash'), trashRes)
    expect(JSON.parse(trashRes.body).entries[0].id).toBe(deletedBody.id)

    const restoredTrash = mockRes()
    await get(routes, '/trash-restore')(request('POST', '/_skill-manager/trash-restore', JSON.stringify({
      id: deletedBody.id,
    })), restoredTrash)
    expect(JSON.parse(restoredTrash.body).ok).toBe(true)

    const deletedAgain = mockRes()
    await get(routes, '/delete')(request('POST', '/_skill-manager/delete', JSON.stringify({
      source: 'project-dsh', name: 'second',
    })), deletedAgain)
    const purgedId = JSON.parse(deletedAgain.body).id as string
    const purged = mockRes()
    await get(routes, '/trash-delete')(request('POST', '/_skill-manager/trash-delete', JSON.stringify({
      id: purgedId,
    })), purged)
    expect(JSON.parse(purged.body).ok).toBe(true)

    const parked = mockRes()
    await get(routes, '/toggle')(request('POST', '/_skill-manager/toggle', JSON.stringify({
      source: 'project-dsh', name: 'demo', enabled: false,
    })), parked)
    expect(JSON.parse(parked.body).enabled).toBe(false)
    const restored = mockRes()
    await get(routes, '/toggle')(request('POST', '/_skill-manager/toggle', JSON.stringify({
      source: 'project-dsh', name: 'demo',
    })), restored)
    expect(JSON.parse(restored.body).enabled).toBe(true)

    const imported = mockRes()
    const zip = zipSync({
      'wrap/SKILL.md': new TextEncoder().encode('---\nname: packed\ndescription: x\n---\n'),
    })
    await get(routes, '/import')(request('POST', '/_skill-manager/import', JSON.stringify({
      source: 'project-dsh', name: 'packed', base64: Buffer.from(zip).toString('base64'),
    })), imported)
    expect(JSON.parse(imported.body).written).toBeGreaterThan(0)

    const noMethod = mockRes()
    const bare = request('GET', '/_skill-manager/scan')
    bare.method = undefined
    await get(routes, '/scan')(bare, noMethod)
    expect(noMethod.statusCode).toBe(200)
  })

  it('rejects an oversized or invalid JSON body and a missing import', async () => {
    const { routes } = await mount({ maxImportBytes: 16 })
    const huge = mockRes()
    const big = request('POST', '/_skill-manager/create', 'x'.repeat(300_000))
    await get(routes, '/create')(big, huge)
    expect(huge.statusCode).toBe(400)

    const invalid = mockRes()
    await get(routes, '/create')(request('POST', '/_skill-manager/create', '{'), invalid)
    expect(invalid.statusCode).toBe(400)

    const empty = mockRes()
    await get(routes, '/create')(request('POST', '/_skill-manager/create'), empty)
    expect(empty.statusCode).toBe(400)

    const blank = JSON.stringify({})
    for (const suffix of ['/toggle', '/delete', '/trash-restore', '/trash-delete'] as const) {
      const res = mockRes()
      await get(routes, suffix)(request('POST', `/_skill-manager${suffix}`, blank), res)
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    }

    const importBlank = mockRes()
    await get(routes, '/import')(request('POST', '/_skill-manager/import', blank), importBlank)
    expect(importBlank.statusCode).toBe(400)

    const createPartial = mockRes()
    await get(routes, '/create')(request('POST', '/_skill-manager/create', JSON.stringify({
      source: 'project-dsh',
    })), createPartial)
    expect(createPartial.statusCode).toBe(400)

    const deletePartial = mockRes()
    await get(routes, '/delete')(request('POST', '/_skill-manager/delete', JSON.stringify({
      source: 'project-dsh',
    })), deletePartial)
    expect(deletePartial.statusCode).toBe(400)

    const missingZip = mockRes()
    await get(routes, '/import')(request('POST', '/_skill-manager/import', JSON.stringify({
      source: 'user-dsh', name: 'x',
    })), missingZip)
    expect(JSON.parse(missingZip.body).error).toMatch(/base64/)

    const oversizedZip = mockRes()
    await get(routes, '/import')(request('POST', '/_skill-manager/import', JSON.stringify({
      source: 'user-dsh', name: 'x', base64: Buffer.alloc(64).toString('base64'),
    })), oversizedZip)
    expect(JSON.parse(oversizedZip.body).error).toMatch(/上限/)
  })

  it('maps missing import source and name after a valid archive', async () => {
    const { routes } = await mount()
    const zip = zipSync({
      'wrap/SKILL.md': new TextEncoder().encode('---\nname: packed\ndescription: x\n---\n'),
    })
    const base64 = Buffer.from(zip).toString('base64')
    const noSource = mockRes()
    await get(routes, '/import')(request('POST', '/_skill-manager/import', JSON.stringify({
      name: 'packed', base64,
    })), noSource)
    expect(noSource.statusCode).toBe(400)
    const noName = mockRes()
    await get(routes, '/import')(request('POST', '/_skill-manager/import', JSON.stringify({
      source: 'project-dsh', base64,
    })), noName)
    expect(noName.statusCode).toBe(400)
  })

  it('maps an unexpected throw to HTTP 500', async () => {
    const { routes } = await mount()
    const res = mockRes()
    await get(routes, '/file')(request('GET', '/_skill-manager/file?path='), res)
    // empty path is still a string; force a non-SkillOpError via a broken URL host
    const boom = mockRes()
    const handler = get(routes, '/scan')
    const req = request('GET', '/_skill-manager/scan')
    Object.defineProperty(req, 'url', { get() { throw new Error('boom') } })
    await handler(req, boom)
    expect(boom.statusCode).toBe(500)
  })

  it('resolves the project root from ?cwd= when config omits it', async () => {
    delete process.env.DSH_HOME
    delete process.env.DSH_AGENTS_HOME
    const projectRoot = await mkdtemp(join(tmpdir(), 'dsh-skill-cwd-'))
    const { routes } = await mount({ projectRoot: null })
    const res = mockRes()
    await get(routes, '/scan')(request('GET', `/_skill-manager/scan?cwd=${encodeURIComponent(projectRoot)}`), res)
    expect(res.statusCode).toBe(200)
    const req = request('GET', '/_skill-manager/scan')
    req.url = undefined
    const fallback = mockRes()
    await get(routes, '/scan')(req, fallback)
    expect(fallback.statusCode).toBe(200)
  })
})
