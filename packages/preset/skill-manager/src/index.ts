/**
 * Skill manager, host half: one read-only JSON endpoint over the scan in
 * `./core.ts`.
 *
 * Registered on `ctx.webServer` under a NON-`/api` prefix. Every `/api` path is
 * owned by `client-connection`, which installs the browser trust fence there and
 * answers 404 for paths it did not itself register — a raw web route on that
 * prefix is shadowed rather than merged. `/_skill-manager` therefore stays a
 * plain loopback web route with no fence.
 *
 * Deliberately read-only. The catalog the agent sees is owned by
 * `dsh-skill-filesystem`; mutating skill files from a debug surface is a
 * separate decision that needs its own safety story (path containment, atomic
 * writes, trash). Shipping the diagnostics first keeps this endpoint safe to
 * mount anywhere.
 * @module @deepseek-ai/dsh-skill-manager
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: pulls the web server's Context merge (ctx.webServer).
import type {} from '@deepseek-ai/dsh-host-webserver'
import { scan } from './core.ts'
import type { ScanRoots } from './core.ts'

export type {
  RootReport, RootSource, ScanResult, SkillEntry, SkillProblem,
} from './core.ts'
export { scan, scanRoots, summarize } from './core.ts'

/** Cordis plugin name. */
export const name = 'skill-manager'

/** The web server this row serves diagnostics from. */
export const inject = ['webServer']

/** Plugin config. */
export interface Config {
  /**
   * Endpoint pathname. Omitted uses `/_skill-manager/scan`. Must not start with
   * `/api`, which belongs to `client-connection`.
   */
  route?: string
  /**
   * Override the project root used for the two project-level skill roots.
   * Omitted resolves per request from the `cwd` query parameter, falling back
   * to the process working directory.
   */
  projectRoot?: string
}

/** Runtime schema for the skill-manager row. */
export const Config: z<Config> = z.object({
  route: z.string(),
  projectRoot: z.string(),
})

const DEFAULT_ROUTE = '/_skill-manager/scan'

/** Write one JSON body with no caching. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

/**
 * Mount the diagnostics endpoint.
 * @param ctx - host context carrying the web server.
 * @param config - route override and fixed project root.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const route = config.route ?? DEFAULT_ROUTE
  if (route.startsWith('/api')) {
    throw new Error(`skill-manager: route ${route} must not start with /api — that prefix belongs to client-connection`)
  }
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: route,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? route, 'http://localhost')
      const roots: ScanRoots = {
        dshHome: process.env.DSH_HOME ?? join(homedir(), '.dsh'),
        agentsHome: process.env.DSH_AGENTS_HOME ?? join(homedir(), '.agents'),
        projectRoot: config.projectRoot ?? url.searchParams.get('cwd') ?? process.cwd(),
      }
      try {
        sendJson(res, 200, await scan(roots))
      } catch (error) {
        sendJson(res, 500, { error: (error as Error).message })
      }
    },
  }), 'skill-manager: scan endpoint')
}
