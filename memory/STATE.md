# mwzzzh dsh — STATE(主索引 + 调度看板)

> 读我第一(体系/派发协议见 `README.md`)。**覆盖重写不追加**,~80 行上限。

## 目标 + 判据
- **最高目标:把官方 DSH 变成自己可控、可长期演进的 harness**——保留官方最新能力,叠加自研增强。
- 仓库=`D:\anzhuonixiang\tools\dsh`(fork 自 `deepseek-ai/deepseek-harness`,推送 `wzzzh2025/mwzzzh_dsh`)。
- 基线=`0.2.1-rc.2`(commit `687f282e`)。`origin`=自己 fork,`upstream`=官方。
- 工具链:Node 22 + `npx pnpm@11.28.5`(全局 pnpm 装不进 `D:\exe\node\node_global`,ACL 只读)。构建 `pnpm run build`,启动 `node --import tsx/esm apps/cli/src/bin.ts web --port <p>`。

## NOW(此刻)
- [实测] P2 五项已挂进 3099:`__DSH_BOOT__` 含时间轴/仪表盘/failover/Git/技能管理;`/_git/status` 与 `/_skill-manager/trash` 已挂(未带 cookie 为 401)。
- [待验] 打开 http://127.0.0.1:3099/?token=xLwe15AGeg5QNrNsW7-5nsBXU4FCYR_TunMpjSMuUHE 点一次:技能回收站、时间轴跳转、`/context`、故障转移开关、右侧栏 Git。
- 下一步:你点一次确认 UI;P0 仍是芯片/记忆开关;然后 pre-commit `mem.py lint`。

## 调度看板(track 注册表)
| Track | 阶段 | 状态 | 优先级 | Owner | 依赖 | 摘要 | 指针 |
|---|---|---|---|---|---|---|---|
| skill-manager | M1 | active | P1 | — | — | 回收站已接,待 3099 点一次 | `tracks/skill-manager` |
| composer-context | M1 | active | P0 | — | — | 芯片已加载,待点一次 | `tracks/composer-context` |
| memory-protocol | M1 | active | P1 | — | — | Settings 开关已接线,待点一次 | `tracks/memory-protocol` |
| xfdsh-port | M3 | active | P2 | — | — | 时间轴/仪表盘/failover/Git 已挂载 | `tracks/xfdsh-port` |
| upstream-sync | M0 | paused | P2 | — | — | 跟随 upstream 合并策略 | `tracks/upstream-sync` |

> 全部待办 → `BACKLOG.md`;阶段验收 → `ROADMAP.md`;派发新 track/sub-track → `README.md` 调度协议。

## 边界 / 已知不可做
- **不改 DSH 核心行为**:自研一律走独立包 + preset,避免 `git pull upstream` 冲突。
- **剔除 `plugin-updater`**(自更新会从网络拉代码替换自身,且会覆盖我们的修改)。其余 xfdsh 功能可搬。
- `packages/` 下官方代码改动要最小化,优先用 patch/preset 层。
- 全局 npm 安装受 ACL 限制,一律用 `npx` 或用户级 prefix。
