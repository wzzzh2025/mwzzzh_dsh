# mwzzzh dsh — STATE(主索引 + 调度看板)

> 读我第一(体系/派发协议见 `README.md`)。**覆盖重写不追加**,~80 行上限。

## 目标 + 判据
- **最高目标:把官方 DSH 变成自己可控、可长期演进的 harness**——保留官方最新能力,叠加自研增强。
- 仓库=`D:\anzhuonixiang\tools\dsh`(fork 自 `deepseek-ai/deepseek-harness`,推送 `wzzzh2025/mwzzzh_dsh`)。
- 基线=`0.2.1-rc.2`(commit `687f282e`)。`origin`=自己 fork,`upstream`=官方。
- 工具链:Node 22 + `npx pnpm@11.28.5`(全局 pnpm 装不进 `D:\exe\node\node_global`,ACL 只读)。构建 `pnpm run build`,启动 `node --import tsx/esm apps/cli/src/bin.ts web --port <p>`。

## NOW(此刻)
- [实测] 源码已跑通:`pnpm install` 1.5 分、`pnpm run build` 9 gates 全过(251s,原生模块用预编译二进制,1.7s)。
- [实测] 源码实例跑在 **3099**,独立 `DSH_HOME=~/.dsh-src`,`sessions`/`storages` 用 **junction** 指向 `~/.dsh`(符号链接需管理员,junction 不需要)→ 会话历史共用,profile 互不干扰。
- [实测] 品牌文案已改:`packages/client/locale/src/locales/{zh,en}.ts` 的 `brand.localBuild` → `mwzzzh dsh`(原为「DSH 本地构建」,因构建 profile 非 `official`)。
- [实测] **skill 加载根因**:`SKILL.md` frontmatter 的 `description` 内含 `Keywords: ` 冒号 → YAML `Nested mappings are not allowed in compact mappings` → DSH 仅 `logger.warn` 后**静默跳过**。改 `>-` 折叠块即修好。
- [实测] **`dsh-memory-protocol` 已建成并验证**:`enabled:true` → 系统提示词多出 `local:memory-protocol` 段;`enabled:false` → 不出现。挂在 `standard.patch.yml` 的 persona 之后。
- [实测] **`dsh-skill-manager` host 端已跑通**:`GET /_skill-manager/scan?cwd=<path>` → `roots=4 skills=19 problems=1`,诊断带行号+原因+修法。挂在 **host 层**(`web-app/cordis.patch.yml`)。
- 下一步:`skill-manager` 的 client UI(设置页展示)。

## 调度看板(track 注册表)
| Track | 阶段 | 状态 | 优先级 | Owner | 依赖 | 摘要 | 指针 |
|---|---|---|---|---|---|---|---|
| skill-manager | M1 | active | P0 | — | — | 技能列表+解析诊断+开关+创建+导入 | `tracks/skill-manager` |
| memory-protocol | M1 | active | P1 | — | — | 记忆协议注入做成可开关插件 | `tracks/memory-protocol` |
| upstream-sync | M0 | paused | P2 | — | — | 跟随 upstream 合并策略 | `tracks/upstream-sync` |

> 全部待办 → `BACKLOG.md`;阶段验收 → `ROADMAP.md`;派发新 track/sub-track → `README.md` 调度协议。

## 边界 / 已知不可做
- **不改 DSH 核心行为**:自研一律走独立包 + preset,避免 `git pull upstream` 冲突。
- **剔除 `plugin-updater`**(自更新会从网络拉代码替换自身,且会覆盖我们的修改)。其余 xfdsh 功能可搬。
- `packages/` 下官方代码改动要最小化,优先用 patch/preset 层。
- 全局 npm 安装受 ACL 限制,一律用 `npx` 或用户级 prefix。
