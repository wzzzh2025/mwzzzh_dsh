# mwzzzh dsh — DECISIONS(durable 决策 + 坑)

> **只进已验证结论**(猜测留在 STATE 的 🔍[待验] 区,不进这里)。追加,每条一行:`日期 [实测/结论] 结论 | 为什么/证据`。被推翻的不留裸错句——删或改写成"曾试 X→失败因 Y"。

- 2026-10-21 [实测] **skill 静默失败的真因是 SKILL.md 的 YAML 语法,不是发现机制。** `description: ... Keywords: 记忆体系...` 里的冒号让 YAML 解析成嵌套映射,报 `Nested mappings are not allowed in compact mappings`,DSH 只 `logger.warn` 后丢弃该 skill,UI 无任何提示。修法:`description: >-` 折叠块或加引号。 | 证据:`packages/skill/skill-filesystem/src/index.ts:804 parseSkillFile` + `dsh-port/diagnose-logs.mjs` 捕获的 warn 原文;修复后 `list()` 18→19 候选。
- 2026-10-21 [实测] **官方仓库自带 19 个 skill**,在 `<repo>/.agents/skills/`;其中 `agent-experience` 自己缺 frontmatter 被跳过(官方也踩同坑)。项目根优先级:`.dsh/skills`(rank 100)> `.agents/skills`(200);用户根 `$DSH_HOME/skills`(400)、`~/.agents/skills`(500)。`roots()` 在 `cwd===undefined` 时**不扫项目根**,但用户根始终扫。
- 2026-10-21 [结论] **自研一律走独立包 + preset,不改 `packages/` 核心行为。** 理由:保持 `git pull upstream` 零冲突;官方 0.2.1 的 plugin 装配层(preset/patch)已足够表达增强。
- 2026-10-21 [结论] **剔除 xfdsh 的 `plugin-updater`。** 它从网络拉新版本替换自身:供应链风险 + 会覆盖本地修改。其余 xfdsh 功能(目录浏览、ZIP 导入等)保留——单用户本机 harness 下,模型本就有全盘读写能力,不构成提权;只需在实现上防 zip-slip 与体积炸弹。
- 2026-10-21 [实测] **源码编译远快于预期**:`pnpm install` 1.5 分 + `pnpm run build` 251s(9 gates)。原生模块用**预编译二进制**(`PASS native addon 1.70s`),不在 Windows 本地编 C++。
- 2026-10-21 [实测] **`DSH_SESSION_HOME` 是 xfdsh fork 自加的变量,官方 0.2.1 没有。** 要让源码实例与官方实例共用会话历史,用 **junction**(`cmd /c mklink /J`)把 `~/.dsh-src/{sessions,storages}` 指向 `~/.dsh`,profile 保持独立。符号链接需管理员,junction 不需要。
- 2026-10-21 [实测] **`D:\exe\node\node_global` 对当前用户只读**(ACL: Users 仅 ReadAndExecute),`npm i -g` 必 EPERM。一律 `npx pnpm@<ver>` 或用户级 `--prefix`。同理 `registry.npmmirror.com` 有元数据但 tarball 可能 404,失败时换官方源。
- 2026-10-21 [实测] **新增 workspace 包必须同时注册两处**,否则构建失败:①`pnpm-workspace.yaml` 的 `packages/*/*` 自动覆盖(无需改);②**`tsconfig.host.json` 的 `references` 必须显式加** —— 漏了 tsc 不编译该包,tsdown 报 `Cannot find entry: ["lib/types/{index,startup}.js"]`。
- 2026-10-21 [结论] **记忆协议用 `ctx.systemPrompt.section()` 注入,不用改 persona。** 段落名 `local:memory-protocol`、order=400、`interpolate:false`;`enabled:false` 时干脆不注册(`apply` 里提前 return),因此开关零副作用、`memory/` 数据不受影响。
