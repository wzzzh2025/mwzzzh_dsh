/** Scan + classify: loadable skills, skipped frontmatter, and root health. */

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scan, scanRoots, summarize } from '../src/core.ts'

async function home() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-skill-core-'))
  return {
    dshHome: join(root, 'dsh'),
    agentsHome: join(root, 'agents'),
    projectRoot: join(root, 'project'),
    root,
  }
}

async function writeSkill(dir: string, name: string, text: string): Promise<void> {
  const bundle = join(dir, name)
  await mkdir(bundle, { recursive: true })
  await writeFile(join(bundle, 'SKILL.md'), text, 'utf8')
}

const GOOD = `---
name: demo-skill
description: >-
  A demo
whenToUse: always
extra: keep
---

Body text
`

describe('scanRoots', () => {
  it('mirrors the provider rank order', () => {
    const roots = scanRoots({ dshHome: '/dsh', agentsHome: '/agents', projectRoot: '/proj' })
    expect(roots.map(root => [root.source, root.rank])).toEqual([
      ['project-dsh', 100],
      ['project-agents', 200],
      ['user-dsh', 400],
      ['user-agents', 500],
    ])
  })
})

describe('scan', () => {
  it('classifies loadable, disabled, skipped, and missing roots', async () => {
    const input = await home()
    const user = join(input.dshHome, 'skills')
    await writeSkill(user, 'demo-skill', GOOD)
    await writeSkill(join(user, '.disabled'), 'parked', GOOD.replace('demo-skill', 'parked'))
    await writeSkill(join(user, '.disabled'), 'also-parked', GOOD.replace('demo-skill', 'also-parked'))
    await writeSkill(user, 'broken', `---
name: broken
description: trap: unquoted colon here
---
`)
    await writeSkill(user, 'no-name', `---
description: missing name
---
`)
    await writeSkill(user, 'bad-name', `---
name: NotKebab
description: x
---
`)
    await writeSkill(user, 'no-desc', `---
name: no-desc
---
`)
    await writeSkill(user, 'empty-name', `---
name:
description: x
---
`)
    await mkdir(join(user, 'empty-dir'), { recursive: true })
    await writeFile(join(user, 'flat.md'), `---
name: flat-file
description: a flat skill
---
`, 'utf8')
    await writeFile(join(user, 'notes.txt'), 'ignore', 'utf8')
    await writeFile(join(user, 'bom.md'), `\uFEFF---
name: bom-skill
description: x
---
`, 'utf8')
    await writeFile(join(user, 'closed.md'), `---
name: closed
description: x
---`, 'utf8')
    await writeFile(join(user, 'unclosed.md'), `---
name: unclosed
description: x
`, 'utf8')
    await mkdir(join(user, '.hidden'), { recursive: true })
    await mkdir(join(user, '.disabled', 'no-skill'), { recursive: true })
    await writeFile(join(user, '.disabled', 'note.txt'), 'skip', 'utf8')
    await writeSkill(join(user, '.disabled'), 'broken-parked', 'not a skill')
    const blocked = join(user, 'unreadable')
    await mkdir(blocked, { recursive: true })
    await mkdir(join(blocked, 'SKILL.md'), { recursive: true })

    const result = await scan(input)
    expect(result.missingRoots.length).toBeGreaterThan(0)
    expect(result.skills.map(skill => skill.name).sort()).toEqual(['bom-skill', 'closed', 'demo-skill', 'flat-file'])
    expect(result.disabled.map(skill => skill.name)).toEqual(['also-parked', 'parked'])
    expect(result.problems.map(problem => problem.reason).sort()).toEqual([
      'invalid-name', 'missing-description', 'missing-name', 'missing-name', 'no-frontmatter', 'read-error', 'yaml-error',
    ])
    const yaml = result.problems.find(problem => problem.reason === 'yaml-error')
    expect(yaml?.fix).toMatch(/>-/)
    expect(summarize(result)).toMatch(/可加载 skill/)
    expect(summarize(result)).toMatch(/被忽略/)
  })

  it('accepts quoted values and the other folded scalars', async () => {
    const input = await home()
    const user = join(input.dshHome, 'skills')
    await writeSkill(user, 'quoted', `---
name: quoted
description: "ok: still quoted"
---
`)
    await writeSkill(user, 'pipe', `---
name: pipe
description: |
  line one
  line two
---
`)
    await writeSkill(user, 'gt', `---
name: gt
description: >
  one

  two
---
`)
    await writeSkill(user, 'dash', `---
name: dash
description: |-
  keep
  newlines
---
`)
    const result = await scan(input)
    expect(result.skills.map(skill => skill.name).sort()).toEqual(['dash', 'gt', 'pipe', 'quoted'])
    expect(result.problems).toEqual([])
  })

  it('rejects a file that never opens a frontmatter fence', async () => {
    const input = await home()
    const user = join(input.dshHome, 'skills')
    await mkdir(user, { recursive: true })
    await writeFile(join(user, 'plain.md'), 'no fence', 'utf8')
    const result = await scan(input)
    expect(result.problems[0]?.reason).toBe('no-frontmatter')
  })

  it('summarizes a clean inventory without a skipped section', async () => {
    const input = await home()
    const user = join(input.dshHome, 'skills')
    await writeSkill(user, 'only', GOOD.replace('demo-skill', 'only'))
    const text = summarize(await scan(input))
    expect(text).toMatch(/only/)
    expect(text).not.toMatch(/被忽略/)
  })
})
