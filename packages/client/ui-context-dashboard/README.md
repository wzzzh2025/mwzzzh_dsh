---
description: "Conversation dashboard for context occupancy, composition, and cumulative usage."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-context-dashboard

English | [中文](README.zh.md)

## Summary

A conversation view that reads the official `contextPressure`, `contextBreakdown`, and `tokenUsage` projections. Occupancy pairs provider-reported pressure with the context window. Composition is the heuristic system/tools/messages split of the next request. `/context` opens this tab. This is not the composer length chip.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

Open a session and select the **Context** tab (`id: context`, `order: 20`), or run `/context`.

## Model Experience

None; this package is a browser inspection surface.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No per-request history.** `tokenUsage` is cumulative; composition is a next-request heuristic, not a reconstruction of a past header.
