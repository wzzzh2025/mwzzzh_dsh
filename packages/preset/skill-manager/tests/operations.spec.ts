/** Mutating operations: containment, toggle, browse, create, import, delete. */

import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  SkillOpError, assertSkillName, browse, contain, createSkill, deleteSkill, importZip,
  readSkillFile, scaffoldSkill, setEnabled,
} from '../src/operations.ts'

async function root(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-skill-ops-'))
  await mkdir(join(dir, 'keep'), { recursive: true })
  await writeFile(join(dir, 'keep', 'SKILL.md'), '---\nname: keep\ndescription: x\n---\n', 'utf8')
  return dir
}

describe('contain', () => {
  it('accepts the root itself and rejects a sibling path', () => {
    expect(contain('/skills', '/skills')).toBe(resolve('/skills'))
    expect(() => contain('/skills', '/other')).toThrow(SkillOpError)
  })
})

describe('assertSkillName', () => {
  it('rejects a non-kebab name', () => {
    expect(() => assertSkillName('Nope')).toThrow(SkillOpError)
  })
})

describe('setEnabled', () => {
  it('parks and restores a bundle, and refuses missing or colliding names', async () => {
    const dir = await root()
    const parked = await setEnabled(dir, 'keep', false)
    expect(parked).toContain('.disabled')
    await expect(setEnabled(dir, 'keep', false)).rejects.toMatchObject({ code: 'not-found' })
    await expect(setEnabled(dir, 'missing', true)).rejects.toMatchObject({ code: 'not-found' })
    await mkdir(join(dir, 'keep'), { recursive: true })
    await expect(setEnabled(dir, 'keep', true)).rejects.toMatchObject({ code: 'already-exists' })
    await deleteSkill(dir, 'keep')
    const restored = await setEnabled(dir, 'keep', true)
    expect(restored).toBe(join(dir, 'keep'))
    await mkdir(join(dir, '.disabled', 'keep'), { recursive: true })
    await expect(setEnabled(dir, 'keep', false)).rejects.toMatchObject({ code: 'already-exists' })
  })
})

describe('browse and readSkillFile', () => {
  it('lists roots, then one directory, and refuses a path outside them', async () => {
    const dir = await root()
    const listing = await browse([dir])
    expect(listing.entries[0]?.path).toBe(dir)
    const inner = await browse([dir], dir)
    expect(inner.entries.some(entry => entry.isSkill === true)).toBe(true)
    const child = await browse([dir], join(dir, 'keep'))
    expect(child.parent).toBe(dir)
    await writeFile(join(dir, 'notes.md'), 'x', 'utf8')
    await writeFile(join(dir, 'notes.txt'), 'x', 'utf8')
    await mkdir(join(dir, 'other'), { recursive: true })
    const withFile = await browse([dir], dir)
    expect(withFile.entries.some(entry => entry.kind === 'file')).toBe(true)
    expect(withFile.entries.some(entry => entry.name === 'notes.txt')).toBe(false)
    await expect(browse([dir], join(dir, '..', 'outside'))).rejects.toMatchObject({ code: 'outside-root' })
    await expect(browse([dir], join(dir, 'missing'))).rejects.toMatchObject({ code: 'not-found' })
    const file = await readSkillFile([dir], join(dir, 'keep', 'SKILL.md'))
    expect(file.text).toMatch(/name: keep/)
    await expect(readSkillFile([dir], join(dir, '..', 'x'))).rejects.toMatchObject({ code: 'outside-root' })
    await expect(readSkillFile([dir], join(dir, 'nope.md'))).rejects.toMatchObject({ code: 'not-found' })
  })

  it('omits a missing root from the top-level listing', async () => {
    const listing = await browse([join(tmpdir(), 'dsh-skill-missing-root')])
    expect(listing.entries).toEqual([])
  })
})

describe('createSkill and deleteSkill', () => {
  it('writes a folded description and refuses an empty one or a collision', async () => {
    const dir = await root()
    expect(scaffoldSkill('n', 'line', 'body')).toMatch(/description: >-/)
    await expect(createSkill(dir, 'keep', 'x', 'b')).rejects.toMatchObject({ code: 'already-exists' })
    await expect(createSkill(dir, 'new-one', '  ', 'b')).rejects.toMatchObject({ code: 'bad-request' })
    const created = await createSkill(dir, 'new-one', 'hello: world', 'Do the thing')
    const text = await readFile(join(created, 'SKILL.md'), 'utf8')
    expect(text).toMatch(/description: >-/)
    expect(text).toMatch(/Do the thing/)
    await deleteSkill(dir, 'new-one')
    await expect(deleteSkill(dir, 'new-one')).rejects.toMatchObject({ code: 'not-found' })
  })
})

describe('importZip', () => {
  it('extracts a wrapped archive, drops traversal, and refuses hostile cases', async () => {
    const dir = await root()
    const bytes = zipSync({
      'wrap/': new Uint8Array(),
      'wrap/SKILL.md': new TextEncoder().encode('---\nname: packed\ndescription: x\n---\n'),
      'wrap/notes.txt': new TextEncoder().encode('ok'),
      '../escape.txt': new TextEncoder().encode('no'),
      '/abs.txt': new TextEncoder().encode('no'),
      'C:/win.txt': new TextEncoder().encode('no'),
    })
    const result = await importZip(dir, 'packed', bytes)
    expect(result.written).toBeGreaterThan(0)
    expect(result.skipped.length).toBeGreaterThan(0)
    await expect(importZip(dir, 'packed', bytes)).rejects.toMatchObject({ code: 'already-exists' })
    await expect(importZip(dir, 'bad-zip', new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
      code: 'unsupported-archive',
    })
    const empty = zipSync({ 'readme.txt': new TextEncoder().encode('no skill') })
    await expect(importZip(dir, 'no-skill', empty)).rejects.toMatchObject({ code: 'unsupported-archive' })
    const bomb = zipSync({ 'wrap/SKILL.md': new Uint8Array(64) })
    await expect(importZip(dir, 'bomb', bomb, 8)).rejects.toMatchObject({ code: 'bad-request' })
  })
})
