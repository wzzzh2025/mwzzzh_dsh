/**
 * Recoverable skill trash under `$DSH_HOME/skills-manager/trash/<id>/`.
 *
 * Delete used to `rm` the bundle. The Settings page now moves it here with a
 * metadata sidecar so Restore can put it back on the original root. Purge is
 * the remaining permanent delete. Cross-device `rename` (Windows EXDEV) falls
 * back to copy-then-unlink.
 * @module @deepseek-ai/dsh-skill-manager/trash
 */

import { randomBytes } from 'node:crypto'
import * as fs from 'node:fs/promises'
import { join } from 'node:path'
import type { RootSource } from './core.ts'
import { SkillOpError, assertSkillName, contain } from './operations.ts'

/** Sidecar version written next to a trashed bundle. */
export const TRASH_METADATA_VERSION = 1

/** One recoverable trash entry. */
export interface TrashEntry {
  id: string
  name: string
  bundle: string
  source: RootSource
  rootPath: string
  deletedAt: number
}

/** On-disk sidecar next to `bundle/`. */
interface TrashMetadata extends TrashEntry {
  version: number
}

const TRASH_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SOURCES: readonly RootSource[] = ['project-dsh', 'project-agents', 'user-dsh', 'user-agents']

/** Whether `path` exists. */
async function exists(path: string): Promise<boolean> {
  try {
    await fs.stat(path)
    return true
  } catch {
    return false
  }
}

/** Filesystem calls `moveTree` uses; tests replace them. */
export interface MoveTreeOps {
  /** Rename `from` onto `to`. */
  rename(from: string, to: string): Promise<void>
  /** Recursive copy used when rename cannot cross devices. */
  cp(from: string, to: string, opts: { recursive: boolean; errorOnExist: boolean }): Promise<void>
  /** Remove the source tree after a cross-device copy. */
  rm(path: string, opts: { recursive: boolean; force: boolean }): Promise<void>
}

/** Filesystem calls `moveTree` uses when the caller omits `ops`. */
export const defaultMoveOps: MoveTreeOps = {
  rename: (from, to) => fs.rename(from, to),
  cp: (from, to, opts) => fs.cp(from, to, opts),
  rm: (path, opts) => fs.rm(path, opts),
}

/**
 * Move a tree, copying when `rename` cannot cross devices.
 * @param from - absolute source.
 * @param to - absolute destination; parent must exist.
 * @param ops - filesystem calls; omitted uses `node:fs/promises`.
 */
export async function moveTree(from: string, to: string, ops: MoveTreeOps = defaultMoveOps): Promise<void> {
  try {
    await ops.rename(from, to)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'EXDEV') throw error
    await ops.cp(from, to, { recursive: true, errorOnExist: true })
    await ops.rm(from, { recursive: true, force: true })
  }
}

/**
 * Assert a trash id is a safe directory name.
 * @param id - candidate id.
 * @returns the same id.
 */
export function assertTrashId(id: string): string {
  if (!TRASH_ID.test(id)) {
    throw new SkillOpError('invalid-name', `回收站 id 不合法: ${id}`)
  }
  return id
}

/**
 * Move one skill bundle into the trash.
 * @param root - absolute skill root holding the bundle.
 * @param name - bundle directory name.
 * @param source - root label stored for restore.
 * @param trashHome - absolute trash directory (`…/skills-manager/trash`).
 * @returns the new trash id.
 */
export async function trashSkill(
  root: string,
  name: string,
  source: RootSource,
  trashHome: string,
): Promise<string> {
  assertSkillName(name)
  const bundle = contain(root, join(root, name))
  if (!(await exists(bundle))) {
    throw new SkillOpError('not-found', `没有技能 ${name}`)
  }
  const id = `${name}-${Date.now()}-${randomBytes(3).toString('hex')}`
  const dest = join(trashHome, id)
  await fs.mkdir(dest, { recursive: true })
  const payload = join(dest, 'bundle')
  await moveTree(bundle, payload)
  const metadata: TrashMetadata = {
    version: TRASH_METADATA_VERSION,
    id,
    name,
    bundle: name,
    source,
    rootPath: root,
    deletedAt: Date.now(),
  }
  await fs.writeFile(join(dest, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
  return id
}

/**
 * List recoverable trash entries, newest first. Corrupt sidecars are skipped.
 * @param trashHome - absolute trash directory.
 * @returns entries with enough detail to restore or purge.
 */
export async function listTrash(trashHome: string): Promise<TrashEntry[]> {
  let dirents
  try {
    dirents = await fs.readdir(trashHome, { withFileTypes: true })
  } catch {
    return []
  }
  const entries: TrashEntry[] = []
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue
    const parsed = await readMetadata(join(trashHome, dirent.name))
    if (parsed === undefined) continue
    entries.push(parsed)
  }
  entries.sort((a, b) => b.deletedAt - a.deletedAt || a.name.localeCompare(b.name))
  return entries
}

/**
 * Restore one trash entry onto its original root.
 * @param trashHome - absolute trash directory.
 * @param id - trash id.
 * @returns the restored bundle path.
 */
export async function restoreTrash(trashHome: string, id: string): Promise<string> {
  assertTrashId(id)
  const dest = join(trashHome, id)
  const metadata = await readMetadata(dest)
  if (metadata === undefined) {
    throw new SkillOpError('not-found', `回收站里没有 ${id}`)
  }
  const target = contain(metadata.rootPath, join(metadata.rootPath, metadata.bundle))
  if (await exists(target)) {
    throw new SkillOpError('already-exists', `已存在同名技能 ${metadata.bundle}`)
  }
  await fs.mkdir(metadata.rootPath, { recursive: true })
  await moveTree(join(dest, 'bundle'), target)
  await fs.rm(dest, { recursive: true, force: true })
  return target
}

/**
 * Permanently delete one trash entry.
 * @param trashHome - absolute trash directory.
 * @param id - trash id.
 */
export async function purgeTrash(trashHome: string, id: string): Promise<void> {
  assertTrashId(id)
  const dest = join(trashHome, id)
  if (!(await exists(dest))) {
    throw new SkillOpError('not-found', `回收站里没有 ${id}`)
  }
  await fs.rm(dest, { recursive: true, force: true })
}

/** Read and validate one sidecar; `undefined` when the entry is unusable. */
async function readMetadata(dest: string): Promise<TrashEntry | undefined> {
  let raw: string
  try {
    raw = await fs.readFile(join(dest, 'metadata.json'), 'utf8')
  } catch {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const record = parsed as Record<string, unknown>
  if (typeof record.id !== 'string' || !TRASH_ID.test(record.id)) return undefined
  if (typeof record.name !== 'string' || typeof record.bundle !== 'string') return undefined
  if (typeof record.rootPath !== 'string' || typeof record.deletedAt !== 'number') return undefined
  if (!SOURCES.includes(record.source as RootSource)) return undefined
  if (!(await exists(join(dest, 'bundle')))) return undefined
  return {
    id: record.id,
    name: record.name,
    bundle: record.bundle,
    source: record.source as RootSource,
    rootPath: record.rootPath,
    deletedAt: record.deletedAt,
  }
}
