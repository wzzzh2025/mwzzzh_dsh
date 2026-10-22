# mwzzzh dsh — ROADMAP(阶段目标)

> 只定"到哪算这阶段完成"+ 挂哪些 track。track 现状看 `tracks/<t>/STATE.md`,待办看 `BACKLOG.md`。

## M1 可控基座 — 进行
- 目标:官方 0.2.1 源码能在本机编译、运行、独立于官方安装(不互相破坏),并把 xfdsh 的有用能力以自研包形式叠加。
- track:`skill-manager`、`memory-protocol`
- 验收:
  1. 源码实例(3099)稳定运行,会话历史与官方实例(3080)共用,profile 互不干扰
  2. `ui-skill-manager` 能在 UI 里看到全部 skill、显示解析诊断、启停、创建、导入 ZIP
  3. 记忆协议注入可通过 Settings 开关
  4. 所有自研改动都在独立包内,`git pull upstream` 不产生 `packages/` 冲突

## M2 上游跟随 — 排队
- 目标:建立可持续的 upstream 合并流程,能稳定吃掉官方后续版本。
- 验收:一次完整的 upstream 合并演练通过,自研包无需改动即可继续工作。

## M3 能力补齐 — 进行
- 目标:按需搬 xfdsh 其余能力(session timeline、上下文面板、故障转移队列、侧栏 Git)。不整包搬 better-sidebar。
- track:`xfdsh-port`
- 验收:每个能力独立可开关,剔除自更新;3099 上能点到时间轴、`/context`、failover 开关、Git 页。
