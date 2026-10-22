/**
 * Skill manager, host half: the read-only scan plus the mutating operations.
 *
 * Routes are registered on `ctx.webServer` under `/_skill-manager`, NOT under
 * `/api`: that prefix belongs to `client-connection`, which installs the browser
 * trust fence there and answers 404 for paths it did not register itself. Each
 * handler still calls `connection.requestRejection` first, so an unauthenticated
 * or cross-site caller never reaches the inventory or a write.
 *
 * Every mutating route takes a root `source` label rather than an arbitrary
 * path, and `operations.ts` re-checks containment against that root, so a
 * request cannot address a directory the scan never recognized.
 * @module @deepseek-ai/dsh-skill-manager
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: pulls the web server's Context merge (ctx.webServer).
import type {} from '@deepseek-ai/dsh-host-webserver'
import { scan, scanRoots } from './core.ts'
import type { RootSource, ScanRoots } from './core.ts'
import {
  SkillOpError, browse, createSkill, importZip, readSkillFile, setEnabled,
} from './operations.ts'
import { listTrash, purgeTrash, restoreTrash, trashSkill } from './trash.ts'

export type {
  RootReport, RootSource, ScanResult, SkillEntry, SkillProblem,
} from './core.ts'
export type { BrowseEntry } from './operations.ts'
export type { TrashEntry } from './trash.ts'
export { scan, scanRoots, summarize } from './core.ts'
export {
  SkillOpError, browse, createSkill, deleteSkill, importZip, readSkillFile, setEnabled,
} from './operations.ts'
export { assertTrashId, listTrash, moveTree, purgeTrash, restoreTrash, trashSkill } from './trash.ts'

/** Cordis plugin name. */
export const name = 'skill-manager'

/** The web server this row serves from, plus the browser-trust fence. */
export const inject = ['webServer', 'connection']

/** Trust surface consumed here; the browser-side connection package owns the full type. */
interface SkillManagerConnection {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

/** The composition's connection service (typed locally: its package is a Client face). */
function connectionOf(ctx: Context): SkillManagerConnection {
  return Reflect.get(ctx, 'connection') as SkillManagerConnection
}

/** Plugin config. */
export interface Config {
  /** Route prefix. Omitted uses `/_skill-manager`. Must not start with `/api`. */
  prefix?: string
  /** Fixed project root; omitted resolves per request from `?cwd=`. */
  projectRoot?: string
  /** Uncompressed ceiling for zip import, in bytes. */
  maxImportBytes?: number
}

/** Runtime schema for the skill-manager row. */
export const Config: z<Config> = z.object({
  prefix: z.string(),
  projectRoot: z.string(),
  maxImportBytes: z.number(),
})

const DEFAULT_PREFIX = '/_skill-manager'
const DEFAULT_MAX_IMPORT = 32 * 1024 * 1024

/** Resolve the three home roots for one request. */
function rootsFor(config: Config, url: URL): ScanRoots {
  return {
    dshHome: process.env.DSH_HOME ?? join(homedir(), '.dsh'),
    agentsHome: process.env.DSH_AGENTS_HOME ?? join(homedir(), '.agents'),
    projectRoot: config.projectRoot ?? url.searchParams.get('cwd') ?? process.cwd(),
  }
}

/** Map a root source label back to its absolute path. */
function rootPathOf(config: Config, url: URL, source: string): string {
  const roots = scanRoots(rootsFor(config, url))
  const found = roots.find(root => root.source === (source as RootSource))
  if (found === undefined) {
    throw new SkillOpError('bad-request', `未知的 skill 根: ${source}`)
  }
  return found.path
}

/** All root paths, for the browser's containment check. */
function allRootPaths(config: Config, url: URL): string[] {
  return scanRoots(rootsFor(config, url)).map(root => root.path)
}

/** Trash directory for this process's DSH home. */
function trashHomeOf(config: Config, url: URL): string {
  return join(rootsFor(config, url).dshHome, 'skills-manager', 'trash')
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

/** Read a JSON body, bounded so a stray upload cannot exhaust memory. */
async function readJson(req: IncomingMessage, limit: number): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.byteLength
    if (size > limit) throw new SkillOpError('bad-request', '请求体过大')
    chunks.push(buffer)
  }
  if (size === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
  } catch {
    throw new SkillOpError('bad-request', '请求体不是合法 JSON')
  }
}

/** Turn a thrown value into the JSON error shape. */
function fail(res: ServerResponse, error: unknown): void {
  if (error instanceof SkillOpError) {
    const status = error.code === 'not-found' ? 404 : error.code === 'already-exists' ? 409 : 400
    sendJson(res, status, { error: error.message, code: error.code })
    return
  }
  sendJson(res, 500, { error: (error as Error).message })
}

/**
 * Mount the skill manager routes.
 * @param ctx - host context carrying the web server.
 * @param config - prefix, fixed project root, import ceiling.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const prefix = config.prefix ?? DEFAULT_PREFIX
  if (prefix.startsWith('/api')) {
    throw new Error(`skill-manager: prefix ${prefix} must not start with /api — that prefix belongs to client-connection`)
  }
  const maxImport = config.maxImportBytes ?? DEFAULT_MAX_IMPORT

  const route = (
    suffix: string,
    method: 'GET' | 'POST',
    handler: (url: URL, req: IncomingMessage) => Promise<unknown>,
  ): void => {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: `${prefix}${suffix}`,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        const rejection = connectionOf(ctx).requestRejection(req)
        if (rejection !== undefined) {
          res.statusCode = rejection
          res.end()
          return
        }
        if ((req.method ?? 'GET') !== method) {
          res.statusCode = 405
          res.setHeader('allow', method)
          res.end()
          return
        }
        try {
          const url = new URL(req.url ?? prefix, 'http://localhost')
          sendJson(res, 200, await handler(url, req))
        } catch (error) {
          fail(res, error)
        }
      },
    }), `skill-manager: ${suffix}`)
  }

  // GET /scan — the full inventory plus diagnostics.
  route('/scan', 'GET', async url => scan(rootsFor(config, url)))

  // GET /file?path=… — one skill file for the detail view.
  route('/file', 'GET', async (url) => {
    const path = url.searchParams.get('path')
    if (path === null) throw new SkillOpError('bad-request', '缺少 path')
    return readSkillFile(allRootPaths(config, url), path)
  })

  // GET /browse?path=… — directory browser restricted to the skill roots.
  route('/browse', 'GET', async (url) => {
    const path = url.searchParams.get('path') ?? undefined
    return browse(allRootPaths(config, url), path)
  })

  // POST /toggle — { source, name, enabled }
  route('/toggle', 'POST', async (url, req) => {
    const body = await readJson(req, 64 * 1024)
    const source = String(body.source ?? '')
    const skill = String(body.name ?? '')
    const enabled = body.enabled !== false
    const result = await setEnabled(rootPathOf(config, url, source), skill, enabled)
    return { ok: true, path: result, enabled }
  })

  // POST /create — { source, name, description, body }
  route('/create', 'POST', async (url, req) => {
    const body = await readJson(req, 256 * 1024)
    const result = await createSkill(
      rootPathOf(config, url, String(body.source ?? '')),
      String(body.name ?? ''),
      String(body.description ?? ''),
      String(body.body ?? ''),
    )
    return { ok: true, path: result }
  })

  // POST /delete — { source, name }; moves the bundle into the trash.
  route('/delete', 'POST', async (url, req) => {
    const body = await readJson(req, 64 * 1024)
    const source = String(body.source ?? '') as RootSource
    const id = await trashSkill(
      rootPathOf(config, url, source),
      String(body.name ?? ''),
      source,
      trashHomeOf(config, url),
    )
    return { ok: true, id }
  })

  // GET /trash — recoverable deletions, newest first.
  route('/trash', 'GET', async url => ({ entries: await listTrash(trashHomeOf(config, url)) }))

  // POST /trash-restore — { id }
  route('/trash-restore', 'POST', async (url, req) => {
    const body = await readJson(req, 64 * 1024)
    const path = await restoreTrash(trashHomeOf(config, url), String(body.id ?? ''))
    return { ok: true, path }
  })

  // POST /trash-delete — { id }; permanent.
  route('/trash-delete', 'POST', async (url, req) => {
    const body = await readJson(req, 64 * 1024)
    await purgeTrash(trashHomeOf(config, url), String(body.id ?? ''))
    return { ok: true }
  })

  // POST /import — { source, name, base64 } where base64 is a zip archive.
  route('/import', 'POST', async (url, req) => {
    const body = await readJson(req, Math.ceil(maxImport * 1.4) + 4096)
    const base64 = String(body.base64 ?? '')
    if (base64.length === 0) throw new SkillOpError('bad-request', '缺少 base64')
    const bytes = Buffer.from(base64, 'base64')
    if (bytes.byteLength > maxImport) {
      throw new SkillOpError('bad-request', `压缩包超过上限 ${Math.round(maxImport / 1024 / 1024)} MB`)
    }
    return importZip(
      rootPathOf(config, url, String(body.source ?? '')),
      String(body.name ?? ''),
      bytes,
      maxImport,
    )
  })
}
