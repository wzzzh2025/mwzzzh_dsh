---
description: "Composer chip that sets the current model's context window through Settings."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-composer-context

English | [中文](README.zh.md)

## Summary

A compact control on the composer tool row, immediately before the model chip. It writes the selected model's `contextWindow` through the Settings document — the same field **Settings → Models** edits — so compaction and the occupancy ring use the new capacity from the next request. The write applies to every session that uses that model; it is not a per-session override.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

The chip registers a `conversation.input.right` contribution (`id: context-cap`). **Default** clears a user-layer override so the model catalog (or the composition patch) wins. **64K / 128K / 256K / 512K / 1M** pin an explicit window. Counts use decimal thousands, matching the Models page (`1M` is 1,000,000).

## Model Experience

None; the package does not register model-facing content. Changing the window affects later prompt assembly through the adapter's published `contextWindow`.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Not a per-session cap.** `ModelSelection` has no window field; compaction reads the adapter catalog. Pinning a gear changes every conversation on that model.
- **Hidden when the route is not configurable** — a provider with an empty settings namespace has nowhere to write.
