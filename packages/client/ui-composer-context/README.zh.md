---
description: "输入框旁的档位控件，通过设置写入当前模型的上下文窗口。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-composer-context

[English](README.md) | 中文

## 摘要

输入工具行上、紧挨模型芯片的紧凑控件。它通过设置文档写入当前模型的 `contextWindow`——和**设置 → 模型**里那个字段是同一份——压缩和占用环从下一轮请求起按新容量计算。这次写入对使用该模型的所有会话生效，不是单场会话覆盖。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

该芯片注册一条 `conversation.input.right` 贡献（`id: context-cap`）。**默认**清掉用户层覆盖，让模型目录（或 composition 补丁）生效。**64K / 128K / 256K / 512K / 1M** 钉死明确窗口。计数用十进制千位，和模型页一致（`1M` 是 1,000,000）。

## 模型体验

无；本包不注册面向模型的内容。改窗口会通过适配器公布的 `contextWindow` 影响之后的提示词组装。

#### KV 缓存影响

无；本包既不组装也不发送供应商请求。

## 已知限制与延后工作

- **不是按会话的上限。** `ModelSelection` 没有窗口字段；压缩读的是适配器目录。钉一档会改这个模型上的每一场对话。
- **路由不可配置时隐藏** — 设置命名空间为空的提供商没有可写位置。
