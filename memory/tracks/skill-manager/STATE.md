# track: skill-manager(技能管理 + 解析诊断)

> 目标:在 Web UI 里看清所有 skill 的真实状态(含**为什么没加载**),并做启停/创建/导入。
> 自研独立包,不改 DSH 核心。待办 `[skill-manager]` 在 `../../BACKLOG.md`。

## 现状
- [实测] **P0 host 端已跑通**:`packages/preset/skill-manager/`,端点 `GET /_skill-manager/scan?cwd=<path>` → `{roots, skills, problems, missingRoots}`。实测返回 `roots=4 skills=19 problems=1`,并准确抓到官方自带的 `agent-experience` 缺 frontmatter。
- [实测] 诊断能给出**行号 + 原因 + 修法**:造一个 `description: ... trap: unquoted colon ...` 的坏 skill,返回 `第 2 行的 description 值里含未转义的冒号 → Nested mappings...`,修法 `改用 >- 折叠块或加引号`。
- [实测] 参考实现 `LunFengChen/dsh-skills-manager`(源码在 `D:\anzhuonixiang\tools\dsh-port\skills-manager-src`,6 文件 ~230KB)耦合 `webRuntime`,0.2.1 已无此服务;`core.js` 不 import 任何 `@deepseek-ai/*`,可安全移植。我们没照搬,自写 core(纯 Node 标准库,无依赖)。
- [实测] 解析失败只走 `logger.warn`,UI 无感知 → **诊断是本 track 的核心价值**。

## 焦点
P0 host 端完成。剩余:①client UI(设置页展示);②P1 启停/详情/目录浏览/ZIP 导入(防 zip-slip)。

## 关键文件
- 参考源码:`D:\anzhuonixiang\tools\dsh-port\skills-manager-src`
- DSH 侧:`packages/skill/skill-filesystem/src/index.ts`(`roots()` L244 / `parseSkillFile` L804)
- 目标包(待建):`packages/client/ui-skill-manager/`

## 设计
```
packages/client/ui-skill-manager/
├── src/index.ts        host:注册 webServer 路由 /api/skill-manager/*
├── src/core.ts         扫描 + 解析诊断(核心)
└── src/client/         client 插件 + Panel
```
**剔除**:`plugin-updater`(自更新)。
