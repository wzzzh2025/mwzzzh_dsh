# mwzzzh dsh — memory/ 记忆体系(读我最先)

本目录是本项目唯一进度真相。历史冻结在 `snapshots/<date>/`。

## 读序(开工前)
1. `STATE.md` — 主索引 + 调度看板:此刻在做什么、有哪些 track、谁 active/blocked。**先读它定位**。
2. 命中某 track → 读 `tracks/<track>/STATE.md`(该目标详细现状 + 焦点)。
3. 按需:`ROADMAP.md`(阶段目标)· `BACKLOG.md`(全部待办)· `DECISIONS.md`(为什么/坑)· `ENV.md`(怎么编/测/部署)。
4. (可选)领域矩阵如 `COVERAGE.md`:项目有跨切面覆盖视图时才建。

## 文件角色(各司其职,不重复)
| 文件 | 是什么 | 何时改 |
|---|---|---|
| STATE.md | 主索引 + 调度看板(track 注册表 + 全局 NOW) | 每里程碑 |
| ROADMAP.md | 阶段目标 M1..Mn + 验收 | 阶段切换 |
| BACKLOG.md | 全部待办聚合(P0/P1/P2,每条标 [track]) | 随时 |
| DECISIONS.md | durable 决策/坑(跨 track,追加) | 出决策/踩坑 |
| ENV.md | 环境 + 构建/测试/部署手册 | 环境变化 |
| tracks/<t>/STATE.md | 单个目标的详细现状 + 焦点 + 证据指针 | 该 track owner |
| snapshots/<date>/ | 冻结历史,只读 | 里程碑冻结 |

**去重铁律**:待办只在 BACKLOG、跨 track 决策只在 DECISIONS、(可选)覆盖矩阵只在 COVERAGE;track STATE 只放"本目标当前状态 + 焦点 + 指针",不抄。

## 按需长大(别过度结构化)
- 最小可用:`AGENTS.md + memory/{README, STATE}`。
- 有阶段目标 → 加 ROADMAP;待办多了 → 加 BACKLOG;开始积累决策/坑 → 加 DECISIONS;要记环境命令 → 加 ENV。
- 出现 ≥2 个可独立推进的目标域 → 开 `tracks/`。**小项目不切 track**。

## 标签
`[实测]`=有证据(带指针) · `[结论]`=durable 决策 · `[待验]`=未验证猜测(**勿当事实**;只能待在 STATE/track 的待验区,禁进 DECISIONS/COVERAGE)。

## ★ 调度 / 派发协议(track & sub-track)
项目按"目标"切成 **track**;大 track 里一块有分量、可独立推进的活切成 **sub-track**。主 `STATE.md` 的看板是唯一调度入口。

看板字段:`Track | 阶段 | 状态 | 优先级 | Owner | 依赖 | 摘要 | 指针`
- 状态:`active` 在做 / `paused` 挂起 / `blocked` 被依赖卡 / `done`(即从看板移走,结论已归档)。
- Owner:认领的会话/子代理标识(并行防撞);空=未认领。

### 派发一个 track / sub-track(随时)
1. 复制 `tracks/_TEMPLATE/` → `tracks/<name>/`(子 track 放 `tracks/<parent>/sub/<name>/`)。
2. 填该目录 `STATE.md`(目标一行 + 现状 + 焦点 + 指针)。
3. 主 `STATE.md` 看板**加一行**(状态/优先级/owner/依赖/指针);跨阶段则 `ROADMAP.md` 也挂。
4. 大块待办进 `BACKLOG.md`,每条标 `[<track>]`。

### 何时才切 track(右尺寸护栏)
切 track/子 track 仅当:**有分量 + 可独立/并行推进 + 多步**。琐碎活只写一条 BACKLOG。宁可少切,别把小项目切碎。

### 认领 / 并行(多会话 / 多子代理)
- 认领:看板该行 Owner 写自己标识。
- **隔离铁律**:一个 track 只改自己 `tracks/<name>/` 内文件 + 主看板自己那一行;全局文件(BACKLOG/DECISIONS/ROADMAP)由 owner 收尾时统一并入 → 零编辑冲突。
- 子代理映射:一个 Task 子代理 = 一个 track/sub-track,交给它 `tracks/<name>/` 范围 + 只更新自己 track STATE,回收时汇总。

### 回收(done)
结论落 DECISIONS(为什么)→ 看板删该行、删子 track 目录(完成即删)。里程碑冻结 `snapshots/<date>/`(拷当时 memory/ 全套)。

## BOOTSTRAP(新项目初始化,AI 执行)
1. 把全仓 `mwzzzh dsh` 换成项目名。
2. 读用户目标 → `ROADMAP.md` 写第一阶段 M1(目标 + 验收判据)。
3. 每个"可独立推进的大目标域"建一个 track(复制 `_TEMPLATE`),登记进 `STATE.md` 看板;只有单一目标就先不切,直接写 STATE。
4. `ENV.md` 填该项目 构建/测试/部署 命令与坑(不知道留 TODO 占位)。
5. 其余文档起步留空,有内容再长。
