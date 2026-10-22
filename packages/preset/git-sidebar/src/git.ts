/**
 * Git porcelain parsing and a bounded `git` spawn.
 *
 * Commands never set `user.name` / `user.email`. Identity stays whatever the
 * repository already has; a missing identity is returned as git's stderr.
 * @module @deepseek-ai/dsh-git-sidebar/git
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { resolve, sep } from 'node:path'
import { stat } from 'node:fs/promises'

/** Spawn function `runGit` uses; tests replace it. */
export type GitSpawner = typeof spawn

/** Raised for every rejected operation; `code` is stable for callers. */
export class GitOpError extends Error {
  constructor(
    readonly code: 'bad-request' | 'not-a-repo' | 'git-failed' | 'timeout',
    message: string,
  ) {
    super(message)
    this.name = 'GitOpError'
  }
}

/** One porcelain status row. */
export interface GitStatusEntry {
  path: string
  index: string
  worktree: string
  untracked: boolean
}

/** Settled git command facts. */
export interface GitRunResult {
  exitCode: number
  stdout: string
  stderr: string
}

/** Run `git` in one directory. */
export type GitRunner = (cwd: string, args: readonly string[], stdin?: string) => Promise<GitRunResult>

const DEFAULT_TIMEOUT_MS = 15_000
const MAX_OUTPUT = 2 * 1024 * 1024

/**
 * Parse `git status --porcelain=v1 -uall` into rows.
 * @param stdout - porcelain body.
 * @returns one entry per path.
 */
export function parsePorcelain(stdout: string): GitStatusEntry[] {
  const entries: GitStatusEntry[] = []
  for (const line of stdout.split('\n')) {
    if (line.length < 4) continue
    const untracked = line.startsWith('??')
    const index = untracked ? ' ' : line.slice(0, 1)
    const worktree = untracked ? '?' : line.slice(1, 2)
    let path = line.slice(3)
    const renamed = path.includes(' -> ')
    if (renamed) path = path.slice(path.lastIndexOf(' -> ') + 4)
    if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1)
    entries.push({ path, index, worktree, untracked })
  }
  return entries
}

/**
 * Bind `runGit` to a timeout and spawn implementation.
 * @param timeoutMs - kill the child after this many ms.
 * @param spawner - spawn implementation; omitted uses `child_process.spawn`.
 * @returns a runner bound to that timeout.
 */
export function createGitRunner(timeoutMs = DEFAULT_TIMEOUT_MS, spawner: GitSpawner = spawn): GitRunner {
  return (cwd, args, stdin) => runGit(cwd, args, stdin, timeoutMs, spawner)
}

/**
 * Run one git command.
 * @param cwd - working directory.
 * @param args - git arguments.
 * @param stdin - optional stdin.
 * @param timeoutMs - kill after this many ms.
 * @param spawner - spawn implementation; omitted uses `child_process.spawn`.
 * @returns exit facts.
 */
export async function runGit(
  cwd: string,
  args: readonly string[],
  stdin?: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  spawner: GitSpawner = spawn,
): Promise<GitRunResult> {
  return new Promise((resolvePromise, reject) => {
    const child: ChildProcess = spawner('git', [...args], {
      cwd,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_OPTIONAL_LOCKS: '0',
        LC_ALL: 'C',
      },
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let size = 0
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new GitOpError('timeout', `git ${args.join(' ')} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout?.on('data', (chunk: Buffer) => {
      size += chunk.byteLength
      if (size > MAX_OUTPUT) {
        child.kill('SIGTERM')
        return
      }
      stdout.push(chunk)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr.push(chunk)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(new GitOpError('git-failed', error.message))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolvePromise({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    })
    if (stdin !== undefined) {
      child.stdin?.end(stdin)
    }
  })
}

/**
 * Resolve and fence a workspace cwd: it must be a directory inside a git repo.
 * @param cwd - candidate working directory.
 * @param run - git runner used to ask for the toplevel.
 * @returns the resolved absolute path.
 */
export async function resolveRepoCwd(cwd: string, run: GitRunner): Promise<string> {
  if (cwd.trim().length === 0) throw new GitOpError('bad-request', '缺少 cwd')
  const resolved = resolve(cwd)
  try {
    const info = await stat(resolved)
    if (!info.isDirectory()) throw new GitOpError('bad-request', `不是目录: ${resolved}`)
  } catch (error) {
    if (error instanceof GitOpError) throw error
    throw new GitOpError('bad-request', `读不到目录 ${resolved}`)
  }
  const result = await run(resolved, ['rev-parse', '--show-toplevel'])
  if (result.exitCode !== 0) {
    throw new GitOpError('not-a-repo', result.stderr.trim() || `${resolved} 不是 git 仓库`)
  }
  const toplevel = resolve(result.stdout.trim())
  if (resolved !== toplevel && !resolved.startsWith(toplevel + sep)) {
    throw new GitOpError('not-a-repo', `${resolved} 不在仓库 ${toplevel} 之内`)
  }
  return resolved
}
