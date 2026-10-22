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
- 2026-10-21 [实测] **preset 里的 `plugins` 只在会话加入该 preset 时才挂载**,所以 web 路由不能写在 preset 里(浏览器没开会话时路由永不注册)。要注册 HTTP 路由必须挂 **host 层**(`packages/bundle/web-app/cordis.patch.yml`)。
- 2026-10-21 [实测] **`/api` 前缀归 `client-connection` 所有**,它装浏览器信任栅栏,非它自己注册的 `/api` 路径返回 404(不是 401,容易误判成"路由没注册")。自建 web 路由要用非 `/api` 前缀(我们用 `/_skill-manager`)。
- 2026-10-21 [实测] **新包要能用,除了 `tsconfig.host.json` 加 reference,还必须加进 `packages/bundle/web-app/package.json` 的 `dependencies`**。否则 profile 解析不到,运行时日志报 `failed to import: Cannot find package '@deepseek-ai/dsh-xxx' imported from <DSH_HOME>/profiles/web/`。
- 2026-10-21 [实测] `packages/client/connection` 是 **client-face 项目,不是 composite**,host 侧 tsconfig **不能** reference 它(报 TS6306);需要它的类型时用结构化声明。
- 2026-10-21 [结论] **`/_skill-manager` 不走 `/api`,但仍必须自己调 `connection.requestRejection`。** 否则未带 cookie 的本机调用也能扫盘、改技能。open-in-app 是同一模式;host 用 `Reflect.get(ctx, 'connection')` 取类型,不 reference client-face 包。
- 2026-10-21 [实测] **Settings 页没有工作区 cwd**,技能扫描的项目根跟随宿主进程 cwd(或 config.`projectRoot`)。section 只从 shell 拿到 `close`。
- 2026-10-21 [实测] **「查看 SKILL.md」必须用 body-portal 的官方 `Modal`**,不能插在 Settings `.options` 滚动区顶部。设置页 `overflow-y: auto`,详情挂在标题下时,用户在长列表里点「查看」看不见任何变化。xfdsh `dssm-mask` 是同一原因;官方已有 `Modal`,不复制那套 CSS。
- 2026-10-21 [结论] **不搬 xfdsh 的 `dsh-reasoning-effort`。** 官方 0.2.1 `ModelSelect` 在 `model.reasoning` 存在时已经露出「推理等级」。
- 2026-10-22 [结论] **Composer 上下文上限档写的是当前模型全局 `contextWindow`,不是会话字段。** 独立包 `ui-composer-context` 挂 `conversation.input.right`;`ModelSelection` 没有窗口字段,compaction 只信 adapter 目录。档位 64K/128K/256K/512K/1M 用十进制千位(与设置页一致);默认 = 清用户层覆盖。xfdsh `dsh-context` 仍是仪表盘,排 M3。
- 2026-10-22 [结论] **记忆协议开关必须挂 host,不能留在 preset。** preset `plugins` 要等会话加入才加载,`settings.describe` 看不到命名空间,Settings 行会永远不出现。从 `standard.patch.yml` 挪到 `web-app/cordis.patch.yml`;独立包 `ui-memory-protocol` 写 `enabled`。关掉只拿掉 `local:memory-protocol` 段落,不改 `memory/` 文件。headless 等没组合这一行的 profile 既没有段落也没有开关。
- 2026-10-21 [实测] **client 插件必须同时具备三件套才会进浏览器花名册**:`dsh.client` + `tsconfig.client.json` reference + `web-app/cordis.patch.yml` 一行 + `web-app/package.json` dependency。只加 dependency 不够,modules 扫描的是 composition 里的 `dsh.client` 行。
- 2026-10-22 [结论] **技能删除进 `$DSH_HOME/skills-manager/trash/<id>/`,不再直接 `rm`。** 恢复走原 `rootPath`;永久删除才是 purge。Windows EXDEV 用 copy+unlink。
- 2026-10-22 [结论] **会话时间轴只跳转,不回退/重生成。** 用官方 `turnOutline` + `session.loadThrough` + `openView('chat')` + `[data-chat-turn]`。不改 `ui-chat`,不搬 0.1 旧实现。
- 2026-10-22 [结论] **`/context` 是占用/拼装/累计用量仪表盘,不是长度选择器。** 读官方 `contextPressure`/`contextBreakdown`/`tokenUsage`;Composer 芯片仍只写 `contextWindow`。
- 2026-10-22 [结论] **故障转移挂 host,默认关。** 空队列零行为,不改 `llm-retry`;`agent/request-error` prepend `{ kind:'retry' }` 抢在同模型退避之前。每轮从用户选的模型开始。
- 2026-10-22 [结论] **侧栏 Git 只加一种 `kind: git` `priority: extension`。** 路由 `/_git`,不抢官方文件/终端槽,不写 `user.name`/`user.email`。
