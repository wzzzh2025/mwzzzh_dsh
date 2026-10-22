# track: skill-manager(技能管理 + 解析诊断)

> 目标:在 Web UI 里看清所有 skill 的真实状态(含**为什么没加载**),并做启停/创建/导入/回收。
> 自研独立包,不改 DSH 核心。待办 `[skill-manager]` 在 `../../BACKLOG.md`。

## 现状
- [实测] host:`packages/preset/skill-manager/`,`GET/POST /_skill-manager/*`,每条路由先 `connection.requestRejection`。
- [实测] client:`packages/client/ui-skill-manager/`,Settings 导航「技能」(`settings.section` id=`skills` order=16)。
- [实测] 「查看 SKILL.md」用官方 `Modal`(body portal)。
- [实测] **删除进回收站**:`$DSH_HOME/skills-manager/trash/<id>/`(bundle + metadata.json);Settings 可恢复或永久删除。`POST /delete` 不再 `rm`。host+client 测已过,覆盖 100%。

## 焦点
3099 重启后打开设置 →「技能」删一条、恢复、再永久删除,确认磁盘路径。

## 关键文件
- host:`packages/preset/skill-manager/src/{index,core,operations,trash}.ts`
- client:`packages/client/ui-skill-manager/src/client/{index,SkillsSection,api}.ts`
- 挂载:`packages/bundle/web-app/cordis.patch.yml`(host + `ui-skill-manager` 两行)
