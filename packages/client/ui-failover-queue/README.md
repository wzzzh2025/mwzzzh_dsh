---
description: "General Settings row for the model failover queue."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-failover-queue

English | [中文](README.zh.md)

## Summary

A General Settings row that writes `enabled` and `queue` on the Host `failover-queue` namespace. Turning the switch on reveals a `provider/model` textarea. The row registers only while the Host serves that namespace.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

Open Settings → General. The row is a `settings.general.item` contribution (`id: failover-queue`, `order: 19`).

## Model Experience

When **on** with a nonempty queue, a 503, timeout, or rate limit retries the next listed route. When **off**, request routing is unchanged.

#### KV Cache effect

A failover starts a new request prefix on the next route.

## Known Limitations and Deferred Work

- **Host-level, not per preset.** The namespace lives on the web-app Host so Settings can expose it without an open session.
