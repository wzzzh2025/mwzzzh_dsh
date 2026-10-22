---
description: "只读会话时间轴：跳到某一轮，不改写会话日志。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-session-timeline

[English](README.md) | 中文

## 摘要

一个会话视图，用宿主 `turnOutline` 投影列出每一轮。点击一行会把历史翻到该轮 `turn/start` 的 seq，切回对话，并滚到 `[data-chat-turn]`。它不回退、不重生成：那些操作会写会话事件。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

打开会话，选择**时间轴**页签（`id: timeline`，`order: 15`）。在第一条 `turn/start` 落地前列表是空的。

## 模型体验

无；本包是浏览器导航面。

#### KV 缓存影响

无；本包既不组装也不发送供应商请求。

## 已知限制与延后工作

- **没有回退或重生成。** 那些操作会写会话事件；本视图只跳转。
