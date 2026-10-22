---
description: "Host skill inventory with parse diagnostics and lifecycle routes for the Web Settings page."
kind: "package-reference"
---

# @deepseek-ai/dsh-skill-manager

English | [中文](README.zh.md)

## Summary

This host plugin scans the same skill roots the runtime provider uses and reports every candidate that would load, every candidate that would be skipped, and why. It also parks, restores, creates, imports, and moves skill bundles into a recoverable trash under `$DSH_HOME/skills-manager/trash`. Routes live under `/_skill-manager` so they do not collide with `client-connection`'s `/api` fence; each handler still asks that fence to reject an unauthenticated or cross-site caller first.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

Mount the row on the host plane (`web-app/cordis.patch.yml`). The Settings page in `@deepseek-ai/dsh-client-ui-skill-manager` reads `GET /_skill-manager/scan`. `POST /delete` moves a bundle into trash; `GET /trash`, `POST /trash-restore`, and `POST /trash-delete` recover or purge it. Mutating routes take a root `source` label, never an arbitrary path.

## Model Experience

None; this package is a host inventory and does not register model-facing tools or prompts.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Project roots follow the process working directory** when the Settings page has no workspace binding; pass `?cwd=` or set `projectRoot` to pin them.
