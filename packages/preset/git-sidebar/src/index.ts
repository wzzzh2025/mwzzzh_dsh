/**
 * Git sidebar, host half: status / diff / commit over `/_git`.
 *
 * Routes are not under `/api` (that prefix belongs to `client-connection`).
 * Each handler still calls `connection.requestRejection` first. Commands never
 * set `user.name` / `user.email`.
 * @module @deepseek-ai/dsh-git-sidebar
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import {
  GitOpError, createGitRunner, parsePorcelain, resolveRepoCwd, type GitRunner,
} from './git.ts'

export {
  GitOpError, createGitRunner, parsePorcelain, resolveRepoCwd, runGit,
} from './git.ts'
export type { GitRunResult, GitRunner, GitSpawner, GitStatusEntry } from './git.ts'

/** Cordis plugin name. */
export const name = 'git-sidebar'

/** The web server this row serves from, plus the browser-trust fence. */
export const inject = ['webServer', 'connection']

/** Trust surface consumed here; the browser-side connection package owns the full type. */
interface GitSidebarConnection {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

/** The composition's connection service (typed locally: its package is a Client face). */
function connectionOf(ctx: Context): GitSidebarConnection {
  return Reflect.get(ctx, 'connection') as GitSidebarConnection
}

/** Plugin config. */
export interface Config {
  /** Route prefix. Omitted uses `/_git`. Must not start with `/api`. */
  prefix?: string
  /** Kill a git child after this many ms. */
  timeoutMs?: number
}

/** Runtime schema for the git-sidebar row. */
export const Config: z<Config> = z.object({
  prefix: z.string(),
  timeoutMs: z.number(),
})

const DEFAULT_PREFIX = '/_git'

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

async function readJson(req: IncomingMessage, limit: number): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.byteLength
    if (size > limit) throw new GitOpError('bad-request', '请求体过大')
    chunks.push(buffer)
  }
  if (size === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
  } catch {
    throw new GitOpError('bad-request', '请求体不是合法 JSON')
  }
}

function fail(res: ServerResponse, error: unknown): void {
  if (error instanceof GitOpError) {
    const status = error.code === 'not-a-repo' ? 400 : error.code === 'timeout' ? 504 : 400
    sendJson(res, status, { error: error.message, code: error.code })
    return
  }
  sendJson(res, 500, { error: (error as Error).message })
}

/**
 * Mount the git routes.
 * @param ctx - host context carrying the web server.
 * @param config - prefix and timeout.
 * @param run - git runner; omitted uses a real `git` spawn.
 */
export function apply(ctx: Context, config: Config = {}, run?: GitRunner): void {
  const prefix = config.prefix ?? DEFAULT_PREFIX
  if (prefix.startsWith('/api')) {
    throw new Error(`git-sidebar: prefix ${prefix} must not start with /api — that prefix belongs to client-connection`)
  }
  const git = run ?? createGitRunner(config.timeoutMs)

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
    }), `git-sidebar: ${suffix}`)
  }

  route('/status', 'GET', async (url) => {
    const cwd = await resolveRepoCwd(url.searchParams.get('cwd') ?? '', git)
    const result = await git(cwd, ['status', '--porcelain=v1', '-uall'])
    if (result.exitCode !== 0) throw new GitOpError('git-failed', result.stderr.trim() || 'git status 失败')
    return { cwd, entries: parsePorcelain(result.stdout) }
  })

  route('/diff', 'GET', async (url) => {
    const cwd = await resolveRepoCwd(url.searchParams.get('cwd') ?? '', git)
    const path = url.searchParams.get('path')
    if (path === null) throw new GitOpError('bad-request', '缺少 path')
    if (path.length === 0) throw new GitOpError('bad-request', '缺少 path')
    const result = await git(cwd, ['diff', '--', path])
    if (result.exitCode !== 0) throw new GitOpError('git-failed', result.stderr.trim() || 'git diff 失败')
    return { cwd, path, diff: result.stdout }
  })

  route('/commit', 'POST', async (url, req) => {
    const body = await readJson(req, 64 * 1024)
    const cwd = await resolveRepoCwd(String(body.cwd ?? url.searchParams.get('cwd') ?? ''), git)
    const message = String(body.message ?? '').trim()
    if (message.length === 0) throw new GitOpError('bad-request', '提交说明不能为空')
    const paths = Array.isArray(body.paths) ? body.paths.map(value => String(value)) : []
    if (paths.length === 0) throw new GitOpError('bad-request', '没有要提交的文件')
    const add = await git(cwd, ['add', '--', ...paths])
    if (add.exitCode !== 0) throw new GitOpError('git-failed', add.stderr.trim() || 'git add 失败')
    const commit = await git(cwd, ['commit', '-F', '-'], message)
    if (commit.exitCode !== 0) throw new GitOpError('git-failed', commit.stderr.trim() || 'git commit 失败')
    return { ok: true, stdout: commit.stdout }
  })
}
