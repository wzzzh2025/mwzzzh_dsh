/** Porcelain parsing, cwd fencing, and the spawn wrapper. */

import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable, Writable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import {
  createGitRunner, parsePorcelain, resolveRepoCwd, runGit, type GitSpawner,
} from '../src/git.ts'

describe('parsePorcelain', () => {
  it('reads modified, untracked, renamed, and quoted paths', () => {
    expect(parsePorcelain('')).toEqual([])
    expect(parsePorcelain('x\n')).toEqual([])
    expect(parsePorcelain(' M src/a.ts\n?? new.txt\nR  old -> new\n?? "q file"\n')).toEqual([
      { path: 'src/a.ts', index: ' ', worktree: 'M', untracked: false },
      { path: 'new.txt', index: ' ', worktree: '?', untracked: true },
      { path: 'new', index: 'R', worktree: ' ', untracked: false },
      { path: 'q file', index: ' ', worktree: '?', untracked: true },
    ])
  })
})

describe('resolveRepoCwd', () => {
  it('rejects an empty, missing, or non-directory cwd, and a failed git probe', async () => {
    await expect(resolveRepoCwd('', async () => ({ exitCode: 0, stdout: '', stderr: '' })))
      .rejects.toMatchObject({ code: 'bad-request' })
    await expect(resolveRepoCwd(join(tmpdir(), 'dsh-git-missing'), async () => ({ exitCode: 0, stdout: '', stderr: '' })))
      .rejects.toMatchObject({ code: 'bad-request' })
    const file = join(await mkdtemp(join(tmpdir(), 'dsh-git-file-')), 'x')
    await writeFile(file, 'x')
    await expect(resolveRepoCwd(file, async () => ({ exitCode: 0, stdout: '', stderr: '' })))
      .rejects.toMatchObject({ code: 'bad-request' })
    const dir = await mkdtemp(join(tmpdir(), 'dsh-git-dir-'))
    await expect(resolveRepoCwd(dir, async () => ({ exitCode: 1, stdout: '', stderr: 'not a git repo' })))
      .rejects.toMatchObject({ code: 'not-a-repo' })
    await expect(resolveRepoCwd(dir, async () => ({ exitCode: 1, stdout: '', stderr: '' })))
      .rejects.toMatchObject({ code: 'not-a-repo' })
  })

  it('accepts the toplevel itself and a directory inside it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-git-ok-'))
    await mkdir(join(dir, 'src'))
    expect(await resolveRepoCwd(dir, async () => ({ exitCode: 0, stdout: `${dir}\n`, stderr: '' }))).toBe(dir)
    const cwd = await resolveRepoCwd(join(dir, 'src'), async () => ({
      exitCode: 0, stdout: `${dir}\n`, stderr: '',
    }))
    expect(cwd).toBe(join(dir, 'src'))
  })

  it('rejects a directory outside the reported toplevel', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-git-out-'))
    await expect(resolveRepoCwd(dir, async () => ({
      exitCode: 0, stdout: join(tmpdir(), 'other-repo'), stderr: '',
    }))).rejects.toMatchObject({ code: 'not-a-repo' })
  })
})

describe('runGit', () => {
  it('collects stdout/stderr, writes stdin, and maps spawn failures', async () => {
    const spawner = ((..._args: Parameters<GitSpawner>) => {
      const child = new EventEmitter() as ReturnType<GitSpawner>
      const stdout = new Readable({ read() {} })
      const stderr = new Readable({ read() {} })
      const chunks: Buffer[] = []
      const stdin = new Writable({
        write(chunk, _enc, cb) { chunks.push(chunk as Buffer); cb() },
      })
      Object.assign(child, { stdout, stderr, stdin, kill: vi.fn() })
      queueMicrotask(() => {
        stdout.emit('data', Buffer.from('out'))
        stderr.emit('data', Buffer.from('err'))
        child.emit('close', 0)
      })
      return child
    }) as GitSpawner
    const result = await runGit('/tmp', ['status'], 'msg', 1000, spawner)
    expect(result).toEqual({ exitCode: 0, stdout: 'out', stderr: 'err' })

    const failing = ((..._args: Parameters<GitSpawner>) => {
      const child = new EventEmitter() as ReturnType<GitSpawner>
      Object.assign(child, {
        stdout: new Readable({ read() {} }),
        stderr: new Readable({ read() {} }),
        kill: vi.fn(),
      })
      queueMicrotask(() => { child.emit('error', new Error('ENOENT')) })
      return child
    }) as GitSpawner
    await expect(runGit('/tmp', ['status'], undefined, 1000, failing)).rejects.toMatchObject({ code: 'git-failed' })
  })

  it('times out, caps oversized stdout, and treats a null close as exit 1', async () => {
    const hanging = ((..._args: Parameters<GitSpawner>) => {
      const child = new EventEmitter() as ReturnType<GitSpawner>
      Object.assign(child, {
        stdout: new Readable({ read() {} }),
        stderr: new Readable({ read() {} }),
        kill: vi.fn(),
      })
      return child
    }) as GitSpawner
    await expect(runGit('/tmp', ['status'], undefined, 10, hanging)).rejects.toMatchObject({ code: 'timeout' })

    const huge = ((..._args: Parameters<GitSpawner>) => {
      const child = new EventEmitter() as ReturnType<GitSpawner>
      const stdout = new Readable({ read() {} })
      Object.assign(child, {
        stdout, stderr: new Readable({ read() {} }), kill: vi.fn(),
      })
      queueMicrotask(() => {
        stdout.emit('data', Buffer.alloc(2 * 1024 * 1024 + 1))
        child.emit('close', null)
      })
      return child
    }) as GitSpawner
    const capped = await runGit('/tmp', ['status'], undefined, 1000, huge)
    expect(capped.exitCode).toBe(1)
  })
})

describe('createGitRunner', () => {
  it('returns a runner bound to the timeout', async () => {
    const spawner = ((..._args: Parameters<GitSpawner>) => {
      const child = new EventEmitter() as ReturnType<GitSpawner>
      Object.assign(child, {
        stdout: new Readable({ read() {} }),
        stderr: new Readable({ read() {} }),
        kill: vi.fn(),
      })
      queueMicrotask(() => { child.emit('close', 0) })
      return child
    }) as GitSpawner
    const runner = createGitRunner(1000, spawner)
    await expect(runner('/tmp', ['status'])).resolves.toEqual({ exitCode: 0, stdout: '', stderr: '' })
    expect(typeof createGitRunner()).toBe('function')
  })
})
