---
description: "Web Settings page for the skill inventory: loadable skills, skipped parse diagnostics, and lifecycle actions."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-skill-manager

English | [中文](README.zh.md)

## Summary

The **Skills** Settings section lists every skill the host scan would load, every skill parked under `.disabled`, and every candidate the runtime skipped, with the parse reason and a suggested fix. It also creates, imports, enables, disables, and moves bundles into a recoverable trash by calling `@deepseek-ai/dsh-skill-manager` host routes.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## Use this package

Open Settings and select **Skills**. The page registers a `settings.section` contribution (`id: skills`, `order: 16`) and fetches `/_skill-manager/scan` with the browser login cookie. **View SKILL.md** opens a body-portaled dialog so the file stays visible above the scrolling Settings list.

## Model Experience

None, as the package is a browser Settings projection that registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No workspace cwd on the Settings page** — the host resolves project roots from its process working directory unless `projectRoot` is configured.
