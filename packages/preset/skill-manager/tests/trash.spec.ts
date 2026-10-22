/** Recoverable trash: move, list, restore, purge, and the EXDEV copy fallback. */

import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SkillOpError, createSkill } from '../src/operations.ts'
import {
  assertTrashId, defaultMoveOps, listTrash, moveTree, purgeTrash, restoreTrash, trashSkill,
} from '../src/trash.ts'

async function workspace(): Promise<{ root: string; trash: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-skill-trash-'))
  return { root: dir, trash: join(dir, 'trash') }
}

describe('assertTrashId', () => {
  it('rejects a path-like id', () => {
    expect(() => assertTrashId('../x')).toThrow(SkillOpError)
  })
})

describe('trashSkill, listTrash, restoreTrash, purgeTrash', () => {
  it('moves a bundle into trash and restores it onto the original root', async () => {
    const { root, trash } = await workspace()
    await createSkill(root, 'demo-skill', 'desc', 'body')
    const id = await trashSkill(root, 'demo-skill', 'user-dsh', trash)
    expect(id).toMatch(/^demo-skill-/)
    const listed = await listTrash(trash)
    expect(listed).toHaveLength(1)
    expect(listed[0]).toMatchObject({ id, name: 'demo-skill', source: 'user-dsh', bundle: 'demo-skill' })
    const restored = await restoreTrash(trash, id)
    expect(restored).toBe(join(root, 'demo-skill'))
    expect(await readFile(join(root, 'demo-skill', 'SKILL.md'), 'utf8')).toMatch(/name: demo-skill/)
    expect(await listTrash(trash)).toEqual([])
  })

  it('refuses a missing bundle, a colliding restore, and a missing purge', async () => {
    const { root, trash } = await workspace()
    await expect(trashSkill(root, 'ghost', 'user-dsh', trash)).rejects.toMatchObject({ code: 'not-found' })
    await createSkill(root, 'keep', 'd', 'b')
    const id = await trashSkill(root, 'keep', 'project-dsh', trash)
    await createSkill(root, 'keep', 'd', 'b')
    await expect(restoreTrash(trash, id)).rejects.toMatchObject({ code: 'already-exists' })
    await expect(restoreTrash(trash, 'no-such-id')).rejects.toMatchObject({ code: 'not-found' })
    await expect(purgeTrash(trash, 'no-such-id')).rejects.toMatchObject({ code: 'not-found' })
    await purgeTrash(trash, id)
    expect(await listTrash(trash)).toEqual([])
  })

  it('skips a corrupt sidecar, a non-directory, and an empty trash home', async () => {
    const { trash } = await workspace()
    expect(await listTrash(join(trash, 'missing'))).toEqual([])
    await mkdir(trash, { recursive: true })
    await writeFile(join(trash, 'note.txt'), 'x', 'utf8')
    await mkdir(join(trash, 'broken'), { recursive: true })
    await writeFile(join(trash, 'broken', 'metadata.json'), '{', 'utf8')
    await mkdir(join(trash, 'nullish'), { recursive: true })
    await writeFile(join(trash, 'nullish', 'metadata.json'), 'null', 'utf8')
    await mkdir(join(trash, 'bad-source'), { recursive: true })
    await mkdir(join(trash, 'bad-source', 'bundle'), { recursive: true })
    await writeFile(join(trash, 'bad-source', 'metadata.json'), JSON.stringify({
      id: 'bad-source-1', name: 'x', bundle: 'x', source: 'nope', rootPath: '/x', deletedAt: 1,
    }), 'utf8')
    await mkdir(join(trash, 'no-bundle'), { recursive: true })
    await writeFile(join(trash, 'no-bundle', 'metadata.json'), JSON.stringify({
      id: 'no-bundle-1', name: 'x', bundle: 'x', source: 'user-dsh', rootPath: '/x', deletedAt: 1,
    }), 'utf8')
    expect(await listTrash(trash)).toEqual([])

    await mkdir(join(trash, 'empty-obj', 'bundle'), { recursive: true })
    await writeFile(join(trash, 'empty-obj', 'metadata.json'), '{}', 'utf8')
    await mkdir(join(trash, 'bad-id', 'bundle'), { recursive: true })
    await writeFile(join(trash, 'bad-id', 'metadata.json'), JSON.stringify({
      id: 'Bad_ID', name: 'x', bundle: 'x', source: 'user-dsh', rootPath: '/x', deletedAt: 1,
    }), 'utf8')
    await mkdir(join(trash, 'bad-name', 'bundle'), { recursive: true })
    await writeFile(join(trash, 'bad-name', 'metadata.json'), JSON.stringify({
      id: 'ok-1', name: 1, bundle: 'x', source: 'user-dsh', rootPath: '/x', deletedAt: 1,
    }), 'utf8')
    await mkdir(join(trash, 'bad-time', 'bundle'), { recursive: true })
    await writeFile(join(trash, 'bad-time', 'metadata.json'), JSON.stringify({
      id: 'ok-2', name: 'x', bundle: 'x', source: 'user-dsh', rootPath: '/x', deletedAt: '1',
    }), 'utf8')
    expect(await listTrash(trash)).toEqual([])
  })

  it('orders two recoverable entries newest first, then by name', async () => {
    const { root, trash } = await workspace()
    await createSkill(root, 'older', 'd', 'b')
    const first = await trashSkill(root, 'older', 'user-dsh', trash)
    await createSkill(root, 'newer', 'd', 'b')
    const second = await trashSkill(root, 'newer', 'user-agents', trash)
    const listed = await listTrash(trash)
    expect(listed.map(entry => entry.id)).toEqual([second, first])

    const tied = join(trash, 'tied')
    await mkdir(join(tied, 'beta', 'bundle'), { recursive: true })
    await mkdir(join(tied, 'alpha', 'bundle'), { recursive: true })
    const same = 42
    for (const name of ['beta', 'alpha'] as const) {
      await writeFile(join(tied, name, 'metadata.json'), JSON.stringify({
        version: 1, id: name, name, bundle: name, source: 'user-dsh', rootPath: root, deletedAt: same,
      }), 'utf8')
    }
    const tiedList = await listTrash(tied)
    expect(tiedList.map(entry => entry.name)).toEqual(['alpha', 'beta'])
  })
})

describe('moveTree', () => {
  it('copies then unlinks when rename reports EXDEV', async () => {
    const { root } = await workspace()
    const from = join(root, 'from')
    const to = join(root, 'to')
    await mkdir(from)
    await writeFile(join(from, 'x.txt'), 'ok', 'utf8')
    await moveTree(from, to, {
      rename: async () => {
        throw Object.assign(new Error('cross-device'), { code: 'EXDEV' })
      },
      cp: defaultMoveOps.cp,
      rm: defaultMoveOps.rm,
    })
    expect(await readFile(join(to, 'x.txt'), 'utf8')).toBe('ok')
  })

  it('rethrows a non-EXDEV rename failure', async () => {
    await expect(moveTree('/a', '/b', {
      rename: async () => {
        throw Object.assign(new Error('busy'), { code: 'EBUSY' })
      },
      cp: async () => undefined,
      rm: async () => undefined,
    })).rejects.toMatchObject({ code: 'EBUSY' })
  })
})
