---
description: "模型故障转移队列的通用设置行。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-failover-queue

[English](README.md) | 中文

## 摘要

通用设置里的一行，向宿主 `failover-queue` 命名空间写 `enabled` 和 `queue`。打开开关后出现 `provider/model` 文本框。只有宿主在提供该命名空间时这一行才会注册。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

打开设置 → 通用设置。这一行是 `settings.general.item` 贡献（`id: failover-queue`，`order: 19`）。

## 模型体验

**打开**且队列非空时，503、超时或限流会按下一档路由重试。**关掉**时请求路由不变。

#### KV 缓存影响

故障转移会在下一档路由上开始新的请求前缀。

## 已知限制与延后工作

- **挂在宿主，不按 preset。** 命名空间在 web-app 宿主上，这样设置页不用开会话也能看到。
