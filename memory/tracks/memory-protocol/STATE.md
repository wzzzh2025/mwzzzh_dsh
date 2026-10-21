# track: memory-protocol(记忆协议注入 + 可开关)

> 目标:让「开工先读 memory/」成为会话默认行为,且**可以按需关掉**。
> 待办 `[memory-protocol]` 在 `../../BACKLOG.md`。

## 现状
- [实测] 包已建成:`packages/preset/memory-protocol/`(`@deepseek-ai/dsh-memory-protocol`),走 `ctx.systemPrompt.section()` 注入。
  - 段落名 `local:memory-protocol`,order=400(在 persona 0 之后、plan policy 500 之前),`interpolate: false`。
  - `Config { enabled?: boolean; text?: string; order?: number }`,`enabled: false` 直接不注册。
- [实测] 已挂进 `packages/bundle/web-app/presets/standard.patch.yml`(persona 之后),`dump-config` 可见。
- [实测] **端到端验证**:`enabled: true` → 段落 4 个且含 `local:memory-protocol`;`enabled: false` → 段落 3 个且不含。开关真实生效。
- [实测] 新包必须在 `tsconfig.host.json` **显式加 reference**,否则 tsc 不编译它 → tsdown 报 `Cannot find entry: lib/types/{index,startup}.js`。
- [实测] `AGENTS.md` 由 `dsh-agent-instructions` 自动注入;`CLAUDE.md` 是 `AGENTS.md` 的**符号链接**,只改后者。本地协议已追加在文件尾(`LOCAL-ONLY SECTION` 注释)。
- [实测] 0.1.5 的 `~/.dsh/.agent-presets/<id>/agent.cordis.yml` 目录式 preset **在 0.2.1 不兼容**;0.2.1 用 `presets/*.patch.yml` + `@deepseek-ai/dsh-agent-preset` 声明。

## 焦点
P0 完成。剩余:把开关暴露到 Settings UI(现在只能改 `standard.patch.yml` 或 profile patch),以及 pre-commit lint 的开关。

## 关键文件
- `packages/preset/memory-protocol/src/index.ts`(实现)
- `packages/bundle/web-app/presets/standard.patch.yml`(挂载点)
- `tsconfig.host.json`(reference 注册,漏了会编译失败)
- `AGENTS.md`(尾部本地追加节)
