# track: skill-manager(技能管理 + 解析诊断)

> 目标:在 Web UI 里看清所有 skill 的真实状态(含**为什么没加载**),并做启停/创建/导入。
> 自研独立包,不改 DSH 核心。待办 `[skill-manager]` 在 `../../BACKLOG.md`。

## 现状
- 参考实现:`LunFengChen/dsh-skills-manager`,源码已 clone 到 `D:\anzhuonixiang\tools\dsh-port\skills-manager-src`(6 文件 ~230KB)。
- [实测] 它 host 端只耦合 5 个 service:`webServer`/`skills`/`tools`/`sessions`/`webRuntime`。前四个在 0.2.1 全在且签名一致;**`webRuntime` 在 0.2.1 已不存在**(拆进 `client-connection` 的 `trustedHosts`),该插件只用它一次(取 trustedHosts),改传空数组即可。
- [实测] `core.js` 不 import 任何 `@deepseek-ai/*`,纯 Node + `fflate`,可安全移植。
- [实测] 解析失败只走 `logger.warn`,UI 无感知 → **诊断面板是本 track 的核心价值**。

## 焦点
先做 P0 三件:技能列表 / **解析诊断(文件:行:原因:修法)** / 各根目录状态。再 P1:启停、详情、目录浏览、ZIP 导入(防 zip-slip)。

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
