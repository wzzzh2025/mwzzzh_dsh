---
description: "记忆协议提示词段落的通用设置开关。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-memory-protocol

[English](README.md) | 中文

## 摘要

通用设置里的一行，写入宿主 `memory-protocol` 命名空间的 `enabled`。关掉会拿掉 `local:memory-protocol` 提示词段落；磁盘上的 `memory/` 文件不会被改。只有宿主提供该命名空间时才注册这一行。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

打开设置 → 通用设置。这一行是 `settings.general.item` 贡献（`id: memory-protocol`，`order: 18`）。写入路径和其他通用开关一样，走 `configForms`。

## 模型体验

**开**时，之后每次请求都带 `local:memory-protocol` 段落（order 400），告诉 Agent 若存在 `memory/` 就先读再动手。**关**时没有这一段。

#### KV 缓存影响

开关会改组装后的系统提示词，下一次请求不能复用包含或省略该段落的前缀。

## 已知限制与延后工作

- **在宿主层，不是按预设。** 命名空间挂在 web-app 宿主上，这样没开会话也能在设置里看到开关。没组合这一行的 headless 和其他 profile 既没有段落也没有开关。
- **替换正文和顺序仍只能改补丁。** 宿主 schema 仍接受 `text` 和 `order`；这一行不改它们。
