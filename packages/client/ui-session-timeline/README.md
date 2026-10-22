---
description: "Read-only conversation timeline: jump to a turn without rewriting the session log."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-session-timeline

English | [中文](README.zh.md)

## Summary

A conversation view that lists every started turn from the host `turnOutline` projection. Clicking a row pages history through that turn's `turn/start` seq, switches back to Chat, and scrolls to `[data-chat-turn]`. It does not rewind or regenerate: those writes belong to the session log.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

Open a session and select the **Timeline** tab (`id: timeline`, `order: 15`). The list is empty until the first `turn/start` lands.

## Model Experience

None; this package is a browser navigation surface.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No rollback or regenerate.** Those operations write session events; this view only jumps.
