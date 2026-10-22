---
description: "Right-sidebar Git tab: status, diff, and commit without replacing files or terminal."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-git

English | [中文](README.zh.md)

## Summary

A right-sidebar tab type (`kind: git`) that lists `git status`, shows one-file diffs, and commits selected paths through `@deepseek-ai/dsh-git-sidebar` host routes. It registers as an `extension` so it does not take the official files or terminal slot.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

Open the right sidebar guide and pick **Git**, or open a `git` tab. The session's workspace directory is the cwd.

## Model Experience

None; this package is a browser Git surface.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No amend, stash, branch, or push.** Those stay in the terminal.
