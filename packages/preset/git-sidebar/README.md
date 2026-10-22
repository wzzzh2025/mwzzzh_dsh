---
description: "Host git status/diff/commit routes for a right-sidebar Git tab."
kind: "package-reference"
---

# @deepseek-ai/dsh-git-sidebar

English | [中文](README.zh.md)

## Summary

Host routes under `/_git` for `git status`, `git diff`, and `git commit`. Each handler asks `connection.requestRejection` first. Commands never set `user.name` or `user.email`. The cwd must be a directory inside a git repository.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

Mount the row on the host plane. The browser tab in `@deepseek-ai/dsh-client-ui-sidebar-git` calls `GET /_git/status?cwd=`.

## Model Experience

None; this package is a host inventory and does not register model-facing tools or prompts.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No amend, stash, branch, or push.** Status, diff, and a selected-path commit are the whole surface.
- **Identity is the repository's.** A missing `user.name` / `user.email` is returned as git's error.
