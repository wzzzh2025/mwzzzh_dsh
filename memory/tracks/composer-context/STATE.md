# track: composer-context(Composer 旁上下文上限档)

> 目标:输入框旁能选 64K/128K/256K/512K/1M/默认,写入当前模型全局 `contextWindow`。
> 自研独立包,不改 DSH 核心。待办 `[composer-context]` 在 `../../BACKLOG.md`。

## 现状
- [实测] client:`packages/client/ui-composer-context/`,挂 `conversation.input.right` `id=context-cap` order=100。
- [实测] 写入走 `remote.settings.mutate`(models[] 或 `modelOverrides`),和设置 → 模型同一字段。不是会话级。
- [实测] 14 测过;`lib/client.js` 已打出。3099 已重启,`dump-config` 可见该行。请点一次芯片确认档位。

## 焦点
用户点芯片确认后本 track 可收工。

## 关键文件
- client:`packages/client/ui-composer-context/src/client/{index,ContextCapSelect,store,settings}.ts`
- 挂载:`packages/bundle/web-app/cordis.patch.yml` + `package.json`
