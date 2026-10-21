/**
 * Skill inventory scanning with parse diagnostics.
 *
 * `dsh-skill-filesystem` deliberately degrades quietly: a `SKILL.md` with
 * broken frontmatter is dropped after a `logger.warn`, so the Web UI shows a
 * shorter catalog with no explanation. That is the right runtime behaviour and
 * the wrong debugging story — a single stray `:` inside an unquoted
 * `description` is enough to make a skill invisible forever.
 *
 * This module mirrors the provider's scan (same roots, same rank order, same
 * one-level depth) but returns *why* each candidate was rejected, including the
 * YAML error position and a suggested fix. It reads only; the provider stays
 * the single owner of what the agent actually sees.
 * @module @deepseek-ai/dsh-skill-manager/core
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

/** Where a skill root came from, mirroring the provider's `SkillSource`. */
export type RootSource = 'project-dsh' | 'project-agents' | 'user-dsh' | 'user-agents'

/** One scanned root and what it yielded. */
export interface RootReport {
  source: RootSource
  path: string
  rank: number
  /** The directory exists and was listed. */
  present: boolean
  /** Skill bundles or flat `.md` files found at depth 1. */
  entries: number
}

/** One skill that would appear in the catalog. */
export interface SkillEntry {
  name: string
  description: string
  /** Absolute path to the instruction file. */
  path: string
  root: RootSource
  /** `directory` for `<name>/SKILL.md`, `file` for a flat `<name>.md`. */
  shape: 'directory' | 'file'
  /** Extra frontmatter keys the parser accepted. */
  whenToUse?: string
  /** Frontmatter values that are not `name`/`description`, for inspection. */
  metadata: Record<string, string>
  /** Body length in characters, so an empty skill is obvious. */
  bodyChars: number
}

/** One skill that was found but rejected, with the reason and a suggested fix. */
export interface SkillProblem {
  /** Bundle or file name as it appears on disk. */
  name: string
  path: string
  root: RootSource
  /** Short machine-readable reason. */
  reason:
    | 'no-frontmatter'
    | 'yaml-error'
    | 'missing-name'
    | 'missing-description'
    | 'invalid-name'
    | 'read-error'
  /** Human-readable detail, including line/column for YAML errors. */
  detail: string
  /** What to change, when the cause is recognizable. */
  fix?: string
}

/** Full scan result. */
export interface ScanResult {
  roots: RootReport[]
  skills: SkillEntry[]
  problems: SkillProblem[]
  /** Roots that do not exist; usually the reason a skill is "missing". */
  missingRoots: string[]
}

/** Roots to scan, in the provider's rank order. */
export interface ScanRoots {
  dshHome: string
  agentsHome: string
  projectRoot: string
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Build the root list exactly as `dsh-skill-filesystem` does. */
export function scanRoots(input: ScanRoots): Array<{ source: RootSource; path: string; rank: number }> {
  return [
    { source: 'project-dsh', path: join(input.projectRoot, '.dsh', 'skills'), rank: 100 },
    { source: 'project-agents', path: join(input.projectRoot, '.agents', 'skills'), rank: 200 },
    { source: 'user-dsh', path: join(input.dshHome, 'skills'), rank: 400 },
    { source: 'user-agents', path: join(input.agentsHome, 'skills'), rank: 500 },
  ]
}

/**
 * Minimal frontmatter split. Returns the raw block plus the body, or `undefined`
 * when the file does not open with a `---` fence.
 */
function splitFrontmatter(text: string): { block: string; body: string; bodyOffsetLine: number } | undefined {
  const normalized = text.replace(/^\uFEFF/, '')
  if (!normalized.startsWith('---')) return undefined
  const end = normalized.indexOf('\n---', 3)
  if (end < 0) return undefined
  const block = normalized.slice(normalized.indexOf('\n', 3) + 1, end)
  const afterFence = normalized.indexOf('\n', end + 1)
  const body = afterFence < 0 ? '' : normalized.slice(afterFence + 1)
  const bodyOffsetLine = normalized.slice(0, afterFence < 0 ? normalized.length : afterFence).split('\n').length
  return { block, body, bodyOffsetLine }
}

/**
 * Parse one scalar, honoring the `key: value` and `key: >-` folded forms the
 * skill format actually uses. Anything requiring a real YAML engine is out of
 * scope: the point is to *explain* failures, not to accept more syntax.
 */
function parseScalar(block: string, key: string): string | undefined {
  const lines = block.split('\n')
  const index = lines.findIndex(line => new RegExp(`^${key}:\\s*(.*)$`).test(line))
  if (index < 0) return undefined
  const match = new RegExp(`^${key}:\\s*(.*)$`).exec(lines[index] as string) as RegExpExecArray
  const first = match[1] as string
  // Folded / literal block scalar: gather the indented lines that follow.
  if (first === '>-' || first === '>' || first === '|-' || first === '|') {
    const gathered: string[] = []
    for (const line of lines.slice(index + 1)) {
      if (line.trim().length === 0) { gathered.push(''); continue }
      if (!/^\s/.test(line)) break
      gathered.push(line.trim())
    }
    return gathered.join(first.startsWith('>') ? ' ' : '\n').trim()
  }
  return first.trim()
}

/**
 * Detect the unquoted-colon trap that breaks most hand-written frontmatter.
 * `description: text with Keywords: a, b` parses as a nested mapping, which
 * YAML rejects outright.
 */
function colonTrap(block: string): { key: string; line: number } | undefined {
  const lines = block.split('\n')
  for (const [index, line] of lines.entries()) {
    const match = /^([A-Za-z0-9_-]+):\s+(.*)$/.exec(line)
    if (!match) continue
    const value = match[2] as string
    // A second `key: value` shape inside the scalar, not inside quotes.
    const inner = /:\s+\S/.exec(value.replace(/'[^']*'|"[^"]*"/g, ''))
    if (inner !== null) return { key: match[1] as string, line: index + 1 }
  }
  return undefined
}

/** Classify one skill file, returning either the entry or the problem. */
function classify(
  text: string,
  path: string,
  root: RootSource,
  shape: 'directory' | 'file',
  fallbackName: string,
): { entry: SkillEntry } | { problem: SkillProblem } {
  const split = splitFrontmatter(text)
  if (split === undefined) {
    return {
      problem: {
        name: fallbackName, path, root, reason: 'no-frontmatter',
        detail: '文件没有以 `---` 开头，或缺少闭合的 `---` 行',
        fix: 'SKILL.md 必须以一行 `---` 开始，frontmatter 结束后再用一行 `---` 闭合',
      },
    }
  }

  const trap = colonTrap(split.block)
  if (trap !== undefined) {
    return {
      problem: {
        name: fallbackName, path, root, reason: 'yaml-error',
        detail: `frontmatter 第 ${trap.line} 行的 \`${trap.key}\` 值里含未转义的冒号 → YAML 报 "Nested mappings are not allowed in compact mappings"`,
        fix: `把 \`${trap.key}:\` 改成折叠块 \`${trap.key}: >-\` 并在下一行缩进写内容，或给整个值加引号`,
      },
    }
  }

  const name = parseScalar(split.block, 'name')
  const description = parseScalar(split.block, 'description')
  if (name === undefined || name.length === 0) {
    return {
      problem: {
        name: fallbackName, path, root, reason: 'missing-name',
        detail: 'frontmatter 缺少 `name`',
        fix: '加一行 `name: <kebab-case 名字>`',
      },
    }
  }
  if (!KEBAB.test(name)) {
    return {
      problem: {
        name, path, root, reason: 'invalid-name',
        detail: `\`name: ${name}\` 不是 kebab-case`,
        fix: '只用小写字母、数字和连字符，例如 `my-skill`',
      },
    }
  }
  if (description === undefined || description.length === 0) {
    return {
      problem: {
        name, path, root, reason: 'missing-description',
        detail: 'frontmatter 缺少 `description`',
        fix: '加一行 `description: <一句话说明什么时候用它>`；含冒号时改用 `>-` 折叠块',
      },
    }
  }

  const metadata: Record<string, string> = {}
  for (const line of split.block.split('\n')) {
    const match = /^([A-Za-z0-9_-]+):\s*(.+)$/.exec(line)
    if (match === null) continue
    const key = match[1] as string
    if (key === 'name' || key === 'description') continue
    metadata[key] = (match[2] as string).trim()
  }

  const whenToUse = parseScalar(split.block, 'whenToUse')
  return {
    entry: {
      name, description, path, root, shape, metadata,
      ...(whenToUse === undefined ? {} : { whenToUse }),
      bodyChars: split.body.length,
    },
  }
}

/**
 * Scan every root and classify every candidate.
 * @param input - the three home roots that decide where skills live.
 * @returns skills that would load, problems that would not, and root health.
 */
export async function scan(input: ScanRoots): Promise<ScanResult> {
  const roots: RootReport[] = []
  const skills: SkillEntry[] = []
  const problems: SkillProblem[] = []
  const missingRoots: string[] = []

  for (const root of scanRoots(input)) {
    let entries
    try {
      entries = await readdir(root.path, { withFileTypes: true })
    } catch {
      roots.push({ ...root, present: false, entries: 0 })
      missingRoots.push(root.path)
      continue
    }

    let count = 0
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory()) {
        const file = join(root.path, entry.name, 'SKILL.md')
        try {
          await stat(file)
        } catch {
          continue
        }
        count += 1
        try {
          const text = await readFile(file, 'utf8')
          const result = classify(text, file, root.source, 'directory', entry.name)
          if ('entry' in result) skills.push(result.entry)
          else problems.push(result.problem)
        } catch (error) {
          problems.push({
            name: entry.name, path: file, root: root.source, reason: 'read-error',
            detail: `读取失败: ${(error as Error).message}`,
          })
        }
      } else if (entry.name.endsWith('.md')) {
        const file = join(root.path, entry.name)
        count += 1
        try {
          const text = await readFile(file, 'utf8')
          const result = classify(text, file, root.source, 'file', entry.name.slice(0, -3))
          if ('entry' in result) skills.push(result.entry)
          else problems.push(result.problem)
        } catch (error) {
          problems.push({
            name: entry.name, path: file, root: root.source, reason: 'read-error',
            detail: `读取失败: ${(error as Error).message}`,
          })
        }
      }
    }
    roots.push({ ...root, present: true, entries: count })
  }

  // Provider rank order wins duplicate names, so sort the same way.
  const rankOf = new Map(scanRoots(input).map(root => [root.source, root.rank]))
  skills.sort((a, b) => (rankOf.get(a.root) ?? 0) - (rankOf.get(b.root) ?? 0) || a.name.localeCompare(b.name))

  return { roots, skills, problems, missingRoots }
}

/** Render a scan result as short plain text, for CLI use and tests. */
export function summarize(result: ScanResult): string {
  const lines: string[] = []
  lines.push(`根目录 (${result.roots.length})`)
  for (const root of result.roots) {
    lines.push(`  [${root.rank}] ${root.source.padEnd(15)} ${root.present ? `${root.entries} 项` : 'MISSING'}  ${root.path}`)
  }
  lines.push('')
  lines.push(`可加载 skill (${result.skills.length})`)
  for (const skill of result.skills) {
    lines.push(`  ✓ ${skill.name.padEnd(30)} ${skill.root}  ${relative(process.cwd(), skill.path)}`)
  }
  if (result.problems.length > 0) {
    lines.push('')
    lines.push(`被忽略 (${result.problems.length})`)
    for (const problem of result.problems) {
      lines.push(`  ✗ ${problem.name}  [${problem.reason}]`)
      lines.push(`      ${problem.detail}`)
      if (problem.fix !== undefined) lines.push(`      修法: ${problem.fix}`)
    }
  }
  return lines.join('\n')
}
