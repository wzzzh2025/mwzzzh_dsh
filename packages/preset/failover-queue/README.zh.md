---
description: "503/超时时，按配置队列切到下一档供应商/模型再试。"
kind: "package-reference"
---

# @deepseek-ai/dsh-failover-queue

[English](README.md) | 中文

## 摘要

宿主插件。打开后，在 `RATE_LIMIT`、`SERVER`、`TIMEOUT` 或 `TRANSPORT` 时按队列里的下一档 `provider/model` 重试。第一次仍用用户选的模型。关掉或队列为空时是空操作，`llm-retry` 继续做同路由恢复。错误监听带 `prepend`，故障转移优先于同模型退避。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

把该行挂在宿主平面。打开设置 → 通用设置，打开**模型故障转移**，再按行填写 `provider/model` 后备路由。

## 模型体验

同一轮里的后续尝试可能用和用户所选不同的供应商和模型。会话日志仍记录每次尝试的路由。

#### KV 缓存影响

换供应商或模型会开始新的请求前缀；上一档的缓存用不上。

## 已知限制与延后工作

- **按轮，不按会话。** 新的一轮又从用户选的模型开始。
- **只有队列顺序。** 没有健康探测，也没有粘滞路由。
