---
description: "On 503/timeout, retry the next provider/model in a configured queue."
kind: "package-reference"
---

# @deepseek-ai/dsh-failover-queue

English | [中文](README.zh.md)

## Summary

A host plugin that, when enabled, retries the next `provider/model` in its queue after `RATE_LIMIT`, `SERVER`, `TIMEOUT`, or `TRANSPORT`. The first attempt still uses the user's selected model. Disabled or an empty queue is a no-op, so `llm-retry` keeps same-route recovery. The error listener prepends so a failover beats same-model backoff.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

Mount the row on the host plane. Open Settings → General and turn **Model failover** on, then list fallback routes as `provider/model` lines.

## Model Experience

A later attempt in the same turn may use a different provider and model than the one the user picked. The session log still records each attempt's route.

#### KV Cache effect

Switching provider or model starts a new request prefix; the previous route's cache does not apply.

## Known Limitations and Deferred Work

- **Per turn, not per session.** A new turn starts again from the user's selected model.
- **Queue order is the only policy.** There is no health probe or sticky routing.
