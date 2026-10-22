---
description: "上下文占用、拼装和累计用量的会话仪表盘。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-context-dashboard

[English](README.md) | 中文

## 摘要

一个会话视图，读取官方 `contextPressure`、`contextBreakdown`、`tokenUsage` 投影。占用是供应商上报的压力对上窗口。拼装是下次请求的系统/工具/消息启发式拆分。`/context` 打开这个页签。这不是输入框旁的长度芯片。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

打开会话，选择**上下文**页签（`id: context`，`order: 20`），或运行 `/context`。

## 模型体验

无；本包是浏览器检查面。

#### KV 缓存影响

无；本包既不组装也不发送供应商请求。

## 已知限制与延后工作

- **没有按次请求的历史。** `tokenUsage` 是累计值；拼装是下次请求的启发式，不是某次 header 的还原。
