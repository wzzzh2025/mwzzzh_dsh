---
description: "宿主技能清单：解析诊断，以及给 Web 设置页用的生命周期路由。"
kind: "package-reference"
---

# @deepseek-ai/dsh-skill-manager

[English](README.md) | 中文

## 摘要

这个宿主插件按运行时 provider 同一套技能根扫描，报告会加载的候选、会被跳过的候选，以及原因。它也负责停用、恢复、创建、导入，以及把技能包移进 `$DSH_HOME/skills-manager/trash` 下可恢复的回收站。路由挂在 `/_skill-manager` 下，避免撞上 `client-connection` 的 `/api` 栅栏；每个处理器仍先让该栅栏拒绝未认证或跨站调用。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

把该行挂在宿主平面（`web-app/cordis.patch.yml`）。`@deepseek-ai/dsh-client-ui-skill-manager` 的设置页读取 `GET /_skill-manager/scan`。`POST /delete` 把技能包移进回收站；`GET /trash`、`POST /trash-restore`、`POST /trash-delete` 负责列出、恢复和永久删除。写操作只接受根的 `source` 标签，不接受任意路径。

## 模型体验

无；本包是宿主清单，不注册面向模型的工具或提示词。

#### KV 缓存影响

无；本包既不组装也不发送供应商请求。

## 已知限制与延后工作

- **项目根跟随进程工作目录**，因为设置页没有工作区绑定；用 `?cwd=` 或设置 `projectRoot` 可钉死。
