# track: upstream-sync(跟随官方上游)

> 目标:建立可持续的 upstream 合并流程,能稳定吃掉官方后续版本,且自研包不用改。
> 待办 `[upstream-sync]` 在 `../../BACKLOG.md`。

## 现状
- [实测] remote:`origin`=`wzzzh2025/mwzzzh_dsh`(自己 fork),`upstream`=`deepseek-ai/deepseek-harness`。
- [实测] 基线 `0.2.1-rc.2`(commit `687f282e` = tag `dsh-v0.2.1-rc.2`)。fork 与官方 master 起点一致。
- [实测] 本地已改:`packages/client/locale/src/locales/{zh,en}.ts`(品牌文案)、`AGENTS.md`(追加本地节)、新增 `memory/`。

## 焦点
本地改动要**尽量收敛到可合并冲突最小的位置**:
- 品牌文案:2 个字符串,冲突时保留本地值
- `AGENTS.md`:只在文件尾追加,官方改动多在上半部分
- `memory/` + 自研包:纯新增文件,不冲突

## 关键文件
- `AGENTS.md`(尾部 LOCAL-ONLY SECTION)
- `packages/client/locale/src/locales/zh.ts` / `en.ts`
- `memory/`
