# track: xfdsh-port(只读时间轴 / 上下文仪表盘 / failover / 侧栏 Git)

> 目标:把 xfdsh 里值得要、且不改 DSH 核心的能力做成独立包。不搬 plugin-updater、不整包搬 better-sidebar。
> 待办 `[xfdsh-port]` 在 `../../BACKLOG.md`。

## 现状
- [实测] **时间轴** `ui-session-timeline`:会话页签 `id=timeline` order=15。点一行 `loadThrough(seq)` 后切回 Chat 滚到 `[data-chat-turn]`。不回退、不重生成。
- [实测] **上下文仪表盘** `ui-context-dashboard`:页签 `id=context` order=20 + `/context`。读官方 `contextPressure` / `contextBreakdown` / `tokenUsage`。不是 Composer 长度芯片。
- [实测] **故障转移** `failover-queue` + `ui-failover-queue`:host 挂载,Settings 通用行,默认关。503/超时/限流/传输失败时 prepend `retry` 切下一档。空队列零行为。
- [实测] **侧栏 Git** `git-sidebar` + `ui-sidebar-git`:`/_git` status/diff/commit;`kind: git` `priority: extension`。不抢文件/终端槽。不写 `user.name`/`user.email`。
- [实测] 相关包 vitest 100 测、覆盖 100%;已进 `web-app` 依赖和 `cordis.patch.yml`。

## 焦点
3099 重启后把上面四条各点一次。

## 关键文件
- `packages/client/ui-session-timeline/`
- `packages/client/ui-context-dashboard/`
- `packages/preset/failover-queue/` + `packages/client/ui-failover-queue/`
- `packages/preset/git-sidebar/` + `packages/client/ui-sidebar-git/`
- 挂载:`packages/bundle/web-app/cordis.patch.yml` + `package.json`
