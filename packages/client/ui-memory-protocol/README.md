---
description: "General Settings switch for the memory-protocol prompt section."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-memory-protocol

English | [中文](README.zh.md)

## Summary

A General Settings row that writes `enabled` on the Host `memory-protocol` namespace. Turning the switch off drops the `local:memory-protocol` prompt section; the `memory/` files on disk are never touched. The row registers only while the Host serves that namespace.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

Open Settings → General. The row is a `settings.general.item` contribution (`id: memory-protocol`, `order: 18`). It uses the same `configForms` write path as other General switches.

## Model Experience

When **on**, every later request includes the `local:memory-protocol` section (order 400) telling the agent to read `memory/` before acting, if that directory exists. When **off**, the section is absent.

#### KV Cache effect

Toggling changes the assembled system prompt, so the next request cannot reuse a prefix that included or omitted this section.

## Known Limitations and Deferred Work

- **Host-level, not per preset.** The namespace lives on the web-app Host so Settings can expose it without an open session. Headless and other profiles that do not compose this row do not get the section or the switch.
- **Replacement text and order stay patch-only.** The Host schema still accepts `text` and `order`; this row does not edit them.
