---
description: "给右侧栏 Git 页用的宿主 status/diff/commit 路由。"
kind: "package-reference"
---

# @deepseek-ai/dsh-git-sidebar

[English](README.md) | 中文

## 摘要

`/_git` 下的宿主路由，对应 `git status`、`git diff` 和 `git commit`。每个处理器先问 `connection.requestRejection`。命令从不设置 `user.name` 或 `user.email`。cwd 必须是 git 仓库里的目录。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

把该行挂在宿主平面。`@deepseek-ai/dsh-client-ui-sidebar-git` 的浏览器页签请求 `GET /_git/status?cwd=`。

## 模型体验

无；本包是宿主清单，不注册面向模型的工具或提示词。

#### KV 缓存影响

无；本包既不组装也不发送供应商请求。

## 已知限制与延后工作

- **没有 amend、stash、分支或 push。** 整个面就是 status、diff，以及勾选路径后提交。
- **身份用仓库里已有的。** 缺少 `user.name` / `user.email` 时返回 git 自己的错误。
