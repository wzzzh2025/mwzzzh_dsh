# mwzzzh dsh — BACKLOG(全部待办 · 按优先级)

> 唯一待办聚合。每条标 `[track]`。做完的**删**(durable 结论移 DECISIONS,否则消失)。一屏为限。

## P0
- `[skill-manager]` **解析诊断**:skill 被忽略时把「文件:行:原因:修法」显示出来(当前只进 logger.warn)
- `[skill-manager]` 技能列表:名称 / provider / source / rank / 路径 / 可调用性
- `[skill-manager]` 各 skill 根状态:存在与否、扫到几个、被忽略几个

## P1
- `[memory-protocol]` 把 `enabled` 开关暴露到 Settings UI(现只能改 patch 文件)
- `[skill-manager]` 启用/禁用开关
- `[skill-manager]` 技能详情(frontmatter 全文 + 正文预览)
- `[skill-manager]` 目录浏览(限定 skills 相关根)
- `[skill-manager]` ZIP 导入(防 zip-slip、体积上限)
- `[memory-protocol]` pre-commit `mem.py lint` 开关

## P2
- `[skill-manager]` 创建技能模板
- `[upstream-sync]` 建立 upstream 合并流程与演练
- `[skill-manager]` 搬 session timeline / 上下文面板 / 故障转移队列 / better sidebar
