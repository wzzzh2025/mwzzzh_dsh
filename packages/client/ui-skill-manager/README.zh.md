---
description: "Web 设置页上的技能清单：可加载技能、被跳过的解析诊断，以及生命周期操作。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-skill-manager

[English](README.md) | 中文

## 摘要

**技能**设置页列出宿主扫描会加载的全部技能、停在 `.disabled` 下的技能，以及运行时跳过的候选，并带上解析原因和修法。它也通过 `@deepseek-ai/dsh-skill-manager` 的宿主路由创建、导入、启用、停用，以及把技能包放进可恢复的回收站。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

打开设置并选择**技能**。该页注册一条 `settings.section` 贡献（`id: skills`，`order: 16`），并用浏览器登录 cookie 请求 `/_skill-manager/scan`。**查看 SKILL.md** 打开挂到 `document.body` 的对话框，文件不会被设置页的滚动列表挡住。

## 模型体验

无；本包是浏览器设置页投影，不注册面向模型的内容。

#### KV 缓存影响

无；本包既不组装也不发送供应商请求。

## 已知限制与延后工作

- **设置页没有工作区 cwd** — 除非配置了 `projectRoot`，宿主按进程工作目录解析项目根。
