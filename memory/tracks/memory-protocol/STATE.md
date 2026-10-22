# track: memory-protocol(记忆协议注入 + 可开关)

> 目标:让「开工先读 memory/」成为会话默认行为,且**可以按需关掉**。
> 待办 `[memory-protocol]` 在 `../../BACKLOG.md`。

## 现状
- [实测] host:`packages/preset/memory-protocol/`,`ctx.systemPrompt.section()` 名 `local:memory-protocol`,order=400,`interpolate: false`。
- [实测] **已从 standard preset 挪到 web-app host**(`cordis.patch.yml`),这样 `settings.describe` 才有 `memory-protocol` 命名空间。preset 插件要等会话加入才挂载,浏览器没开会话时 Settings 永远看不到开关。
- [实测] client:`packages/client/ui-memory-protocol/`,General 行 `id=memory-protocol` order=18,`configForms.set('enabled', …)`。`autoGenerate: false`,替换正文/顺序仍只能改补丁。
- [实测] host 4 测 + client 6 测过;`tsc -b` + 两边 tsdown 已打出 `lib/`。`dump-config` 可见 host 层一行,preset 里不再有。
- 3099 已重启加载。请打开设置 → 通用设置点一次开关。

## 焦点
用户点开关确认后,剩 pre-commit `mem.py lint`。

## 关键文件
- host:`packages/preset/memory-protocol/src/index.ts`
- client:`packages/client/ui-memory-protocol/src/client/{index,MemoryProtocolRow}.ts`
- 挂载:`packages/bundle/web-app/cordis.patch.yml`(host + `ui-memory-protocol`)
- 路径别名:`tsconfig.base.json`(手写 client 包 + 生成 `dsh-memory-protocol`)
