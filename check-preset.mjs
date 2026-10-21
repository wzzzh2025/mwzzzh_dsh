// 验证 preset 里每一行是否都能从 web-app bundle 解析（复现 "never started" 的根因）
// 用正则提取包名，避开 !!js 自定义标签。
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const webApp = 'D:/anzhuonixiang/tools/dsh/packages/bundle/web-app'
const presetFile = `${webApp}/presets/standard.patch.yml`

const text = await readFile(presetFile, 'utf8')
const rows = [...text.matchAll(/-\s+id:\s*(\S+)\s*\n\s+name:\s*'([^']+)'/g)]
  .map((m) => ({ id: m[1], name: m[2] }))

console.log(`standard preset 提取到 ${rows.length} 个插件行\n`)

const req = createRequire(`${webApp}/package.json`)
let bad = 0
for (const row of rows) {
  if (row.name.startsWith('cordis:')) {
    console.log(`  ${row.id.padEnd(28)} ${row.name}  [内置]`)
    continue
  }
  try {
    req.resolve(`${row.name}/package.json`)
    console.log(`  ${row.id.padEnd(28)} ${row.name}  OK`)
  } catch (error) {
    bad += 1
    console.log(`  ${row.id.padEnd(28)} ${row.name}  ✗ ${error.code}`)
  }
}
console.log(`\n无法解析的行: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
