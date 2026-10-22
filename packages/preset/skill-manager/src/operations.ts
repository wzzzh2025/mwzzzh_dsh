/**
 * Mutating operations over the skill roots.
 *
 * Every write here is containment-checked against a root the scan already
 * recognized: a path is only accepted when its resolved absolute form still
 * lives under that root, which is what stops a crafted skill name (`../../x`)
 * or a zip entry (`../../../etc/`) from writing outside the skill tree.
 *
 * Disabling is expressed on disk rather than in a state file. A skill root is
 * scanned at depth 1 — `<root>/<name>/SKILL.md` or `<root>/<name>.md` — so moving
 * a bundle into `<root>/.disabled/<name>/` removes it from the catalog with no
 * bookkeeping to keep in sync, and moving it back restores it byte for byte.
 * @module @deepseek-ai/dsh-skill-manager/operations
 */

import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import type { RootSource } from './core.ts'

/** Marker directory holding disabled bundles, one level below a root. */
export const DISABLED_DIR = '.disabled'

/** Raised for every rejected operation; `code` is stable for callers. */
export class SkillOpError extends Error {
  constructor(
    readonly code:
      | 'not-found'
      | 'outside-root'
      | 'invalid-name'
      | 'already-exists'
      | 'not-a-directory'
      | 'unsupported-archive'
      | 'bad-request',
    message: string,
  ) {
    super(message)
    this.name = 'SkillOpError'
  }
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Assert that `candidate` resolves to `root` itself or something below it.
 * @param root - absolute skill root.
 * @param candidate - absolute path being written.
 * @returns the resolved path, safe to use.
 */
export function contain(root: string, candidate: string): string {
  const resolvedRoot = resolve(root)
  const resolved = resolve(candidate)
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + sep)) {
    throw new SkillOpError('outside-root', `路径越界: ${resolved} 不在 ${resolvedRoot} 之下`)
  }
  return resolved
}

/** Validate a skill name before it becomes a path segment. */
export function assertSkillName(name: string): string {
  if (!KEBAB.test(name)) {
    throw new SkillOpError('invalid-name', `技能名必须是 kebab-case: ${name}`)
  }
  return name
}

/** Whether `path` exists. */
async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Toggle one skill between active and disabled.
 * @param root - absolute skill root holding the bundle.
 * @param name - bundle directory name.
 * @param enabled - target state.
 * @returns the bundle's new absolute path.
 */
export async function setEnabled(root: string, name: string, enabled: boolean): Promise<string> {
  assertSkillName(name)
  const active = contain(root, join(root, name))
  const parked = contain(root, join(root, DISABLED_DIR, name))

  if (enabled) {
    if (!(await exists(parked))) {
      throw new SkillOpError('not-found', `没有已禁用的技能 ${name}`)
    }
    await mkdir(dirname(active), { recursive: true })
    if (await exists(active)) {
      throw new SkillOpError('already-exists', `已存在同名技能 ${name}`)
    }
    await rename(parked, active)
    return active
  }

  if (!(await exists(active))) {
    throw new SkillOpError('not-found', `没有技能 ${name}`)
  }
  await mkdir(dirname(parked), { recursive: true })
  if (await exists(parked)) {
    throw new SkillOpError('already-exists', `已存在同名禁用项 ${name}`)
  }
  await rename(active, parked)
  return parked
}

/** One entry visible in the directory browser. */
export interface BrowseEntry {
  name: string
  path: string
  kind: 'directory' | 'file'
  /** Present for `.md` files and directories that look like a skill bundle. */
  isSkill?: boolean
}

/**
 * List one directory for the browser, refusing anything outside the roots.
 * @param allowedRoots - absolute roots the browser may show.
 * @param path - directory to list; omitted lists the roots themselves.
 * @returns entries with enough detail to recognize a skill bundle.
 */
export async function browse(allowedRoots: readonly string[], path?: string): Promise<{
  path: string
  parent?: string
  entries: BrowseEntry[]
}> {
  if (path === undefined) {
    const entries: BrowseEntry[] = []
    for (const root of allowedRoots) {
      if (!(await exists(root))) continue
      entries.push({ name: root, path: root, kind: 'directory' })
    }
    return { path: '', entries }
  }

  const target = resolve(path)
  const inside = allowedRoots.some((root) => {
    const resolvedRoot = resolve(root)
    return target === resolvedRoot || target.startsWith(resolvedRoot + sep)
  })
  if (!inside) throw new SkillOpError('outside-root', `路径越界: ${target}`)

  let dirents
  try {
    dirents = await readdir(target, { withFileTypes: true })
  } catch {
    throw new SkillOpError('not-found', `读不到目录 ${target}`)
  }

  const entries: BrowseEntry[] = []
  for (const dirent of dirents) {
    const full = join(target, dirent.name)
    if (dirent.isDirectory()) {
      entries.push({
        name: dirent.name,
        path: full,
        kind: 'directory',
        isSkill: await exists(join(full, 'SKILL.md')),
      })
    } else if (dirent.name.endsWith('.md')) {
      entries.push({ name: dirent.name, path: full, kind: 'file', isSkill: true })
    }
  }
  entries.sort((a, b) => Number(b.kind === 'directory') - Number(a.kind === 'directory') || a.name.localeCompare(b.name))

  const parent = dirname(target)
  const parentInside = allowedRoots.some((root) => {
    const resolvedRoot = resolve(root)
    return parent === resolvedRoot || parent.startsWith(resolvedRoot + sep)
  })
  return { path: target, ...(parentInside ? { parent } : {}), entries }
}

/** Read one skill file for the detail view. */
export async function readSkillFile(allowedRoots: readonly string[], path: string): Promise<{ path: string; text: string }> {
  const target = resolve(path)
  const inside = allowedRoots.some((root) => {
    const resolvedRoot = resolve(root)
    return target.startsWith(resolvedRoot + sep)
  })
  if (!inside) throw new SkillOpError('outside-root', `路径越界: ${target}`)
  try {
    return { path: target, text: await readFile(target, 'utf8') }
  } catch {
    throw new SkillOpError('not-found', `读不到文件 ${target}`)
  }
}

/** Body used for a newly created skill. */
export function scaffoldSkill(name: string, description: string, body: string): string {
  // The description is emitted as a folded block scalar: a colon in prose is the
  // single most common reason a hand-written SKILL.md fails to parse, and the
  // folded form cannot be broken by one.
  return [
    '---',
    `name: ${name}`,
    'description: >-',
    ...description.split('\n').map(line => `  ${line}`),
    '---',
    '',
    body.trimEnd(),
    '',
  ].join('\n')
}

/**
 * Create a new skill bundle under `root`.
 * @param root - absolute skill root to create in.
 * @param name - kebab-case bundle name.
 * @param description - one-line description for the frontmatter.
 * @param body - markdown instructions.
 * @returns the created bundle path.
 */
export async function createSkill(
  root: string,
  name: string,
  description: string,
  body: string,
): Promise<string> {
  assertSkillName(name)
  if (description.trim().length === 0) {
    throw new SkillOpError('bad-request', 'description 不能为空')
  }
  const bundle = contain(root, join(root, name))
  if (await exists(bundle)) {
    throw new SkillOpError('already-exists', `技能 ${name} 已存在`)
  }
  await mkdir(bundle, { recursive: true })
  await writeFile(join(bundle, 'SKILL.md'), scaffoldSkill(name, description.trim(), body), 'utf8')
  return bundle
}

/**
 * Extract a zip into a new skill bundle.
 *
 * Entries are normalized before writing: absolute paths, `..` segments, and
 * anything that resolves outside the destination bundle are dropped rather than
 * extracted, so a hostile archive cannot escape the skill root. Extraction is
 * flat-by-necessity: a single top-level directory in the archive is treated as
 * the bundle root.
 * @param root - absolute skill root to create in.
 * @param name - kebab-case bundle name.
 * @param bytes - raw zip bytes.
 * @param maxBytes - uncompressed ceiling, guarding against zip bombs.
 * @returns the created bundle path and how many entries were written.
 */
export async function importZip(
  root: string,
  name: string,
  bytes: Uint8Array,
  maxBytes = 32 * 1024 * 1024,
): Promise<{ bundle: string; written: number; skipped: string[] }> {
  assertSkillName(name)
  const bundle = contain(root, join(root, name))
  if (await exists(bundle)) {
    throw new SkillOpError('already-exists', `技能 ${name} 已存在`)
  }

  const { unzipSync } = await import('fflate')
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch (error) {
    throw new SkillOpError('unsupported-archive', `解压失败: ${(error as Error).message}`)
  }

  const names = Object.keys(entries)
  if (!names.some(entry => entry.endsWith('SKILL.md'))) {
    throw new SkillOpError('unsupported-archive', '压缩包里没有 SKILL.md')
  }

  // A single wrapping directory is the common shape; strip it so the bundle
  // root is the directory holding SKILL.md.
  const skillEntry = names.find(entry => entry.endsWith('SKILL.md')) as string
  const prefix = skillEntry.slice(0, skillEntry.length - 'SKILL.md'.length)

  const skipped: string[] = []
  let written = 0
  let total = 0
  await mkdir(bundle, { recursive: true })

  for (const [entryName, data] of Object.entries(entries)) {
    if (entryName.endsWith('/')) continue
    total += data.byteLength
    if (total > maxBytes) {
      await rm(bundle, { recursive: true, force: true })
      throw new SkillOpError('bad-request', `解压后超过上限 ${Math.round(maxBytes / 1024 / 1024)} MB`)
    }
    const relative = entryName.startsWith(prefix) ? entryName.slice(prefix.length) : entryName
    // Reject traversal before touching the disk; `contain` re-checks the result.
    if (relative.length === 0 || relative.includes('..') || relative.startsWith('/') || /^[A-Za-z]:/.test(relative)) {
      skipped.push(entryName)
      continue
    }
    const destination = contain(bundle, join(bundle, relative))
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, data)
    written += 1
  }

  return { bundle, written, skipped }
}

/**
 * Permanently remove one skill bundle. The Settings delete path uses
 * {@link trashSkill} instead; this remains the test and purge primitive.
 */
export async function deleteSkill(root: string, name: string): Promise<void> {
  assertSkillName(name)
  const bundle = contain(root, join(root, name))
  if (!(await exists(bundle))) {
    throw new SkillOpError('not-found', `没有技能 ${name}`)
  }
  await rm(bundle, { recursive: true, force: true })
}

/** Root source → the root path, for callers that only carry a source label. */
export type RootLookup = (source: RootSource) => string | undefined
