---
description: "右侧栏 Git 页：status、diff、commit，不替换文件或终端槽。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-git

[English](README.md) | 中文

## 摘要

右侧栏的一种页签（`kind: git`），列出 `git status`，显示单文件 diff，并通过 `@deepseek-ai/dsh-git-sidebar` 的宿主路由提交勾选的路径。注册为 `extension`，不抢官方文件或终端槽。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

打开右侧栏指南并选择 **Git**，或打开一个 `git` 页签。会话的工作区目录就是 cwd。

## 模型体验

无；本包是浏览器 Git 面。

#### KV 缓存影响

无；本包既不组装也不发送供应商请求。

## 已知限制与延后工作

- **没有 amend、stash、分支或 push。** 那些仍走终端。
