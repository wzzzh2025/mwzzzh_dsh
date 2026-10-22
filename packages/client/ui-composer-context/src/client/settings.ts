/** Locate and patch one model's `contextWindow` inside an LLM settings profile. */

import type { LlmConfigurableProvider, SettingsNamespaceView, SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'

/** A JSON object; settings profiles and model rows are records at runtime. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Walk a JSON record along a string path.
 * @param value - object to walk.
 * @param path - successive keys.
 * @returns the nested value, or `undefined` when a step is missing.
 */
export function getPath(value: unknown, path: readonly string[]): unknown {
  let current = value
  for (const key of path) {
    if (!isRecord(current)) return undefined
    current = current[key]
  }
  return current
}

/**
 * Read a positive integer `contextWindow` off a model row.
 * @param row - one models[] entry or modelOverrides value.
 * @returns the stored window, or `undefined` when the field is absent or not a positive integer.
 */
export function readWindow(row: unknown): number | undefined {
  if (!isRecord(row)) return undefined
  const tokens = row['contextWindow']
  return typeof tokens === 'number' && Number.isInteger(tokens) && tokens > 0 ? tokens : undefined
}

/**
 * Find the model row that carries `contextWindow` for one id.
 * @param profile - provider profile (or the namespace root when `settingsPath` is empty).
 * @param modelId - adapter model id.
 * @returns the models[] row, else the `modelOverrides` record, else `undefined`.
 */
export function modelRow(profile: unknown, modelId: string): unknown {
  if (!isRecord(profile)) return undefined
  const models = profile['models']
  if (Array.isArray(models)) {
    const listed = models.find(entry => isRecord(entry) && entry['id'] === modelId)
    if (listed !== undefined) return listed
    return undefined
  }
  return getPath(profile, ['modelOverrides', modelId])
}

/** How one provider+model currently stores its window. */
export interface ResolvedContextCap {
  /** Settings namespace that owns this provider. */
  readonly settingsNs: string
  /** Path from the namespace root to the provider profile. */
  readonly settingsPath: readonly string[]
  /** Revision fencing the next write. */
  readonly revision: number
  /** Whether the document accepts writes. */
  readonly writable: boolean
  /** Window on the resolved profile, including composition defaults. */
  readonly effective: number | undefined
  /** Whether the user layer itself names `contextWindow`. */
  readonly overridden: boolean
}

/**
 * Resolve the current model's context-window fields from the Settings mirror.
 * @param providers - configurable provider directory.
 * @param namespaces - namespace views keyed by ns.
 * @param writable - whether the document accepts writes.
 * @param provider - selected provider route.
 * @param model - selected model id.
 * @returns the cap, or `undefined` when this route has no settings profile.
 */
export function resolveCap(
  providers: readonly LlmConfigurableProvider[],
  namespaces: ReadonlyMap<string, SettingsNamespaceView>,
  writable: boolean,
  provider: string,
  model: string,
): ResolvedContextCap | undefined {
  const entry = providers.find(item => item.provider === provider)
  if (entry === undefined || entry.settingsNs === '') return undefined
  const view = namespaces.get(entry.settingsNs)
  if (view === undefined) return undefined
  const profile = entry.settingsPath.length === 0 ? view.value : getPath(view.value, entry.settingsPath)
  if (profile === undefined) return undefined
  const userRoot = view.user
  const userProfile = userRoot === undefined
    ? undefined
    : entry.settingsPath.length === 0 ? userRoot : getPath(userRoot, entry.settingsPath)
  const listed = modelRow(profile, model)
  const fallback = isRecord(profile) ? readWindow({ contextWindow: profile['defaultContextWindow'] }) : undefined
  return {
    settingsNs: entry.settingsNs,
    settingsPath: entry.settingsPath,
    revision: view.revision,
    writable,
    effective: readWindow(listed) ?? fallback,
    overridden: readWindow(modelRow(userProfile, model)) !== undefined,
  }
}

/**
 * Build the Settings path operations that pin or inherit one model's window.
 * @param profile - resolved provider profile (the object at `settingsPath`).
 * @param settingsPath - path prefix for the ops.
 * @param modelId - adapter model id.
 * @param tokens - explicit window, or `undefined` to inherit the catalog.
 * @returns the mutation, or `undefined` when the model is not in a declared `models` list.
 */
export function patchModelWindow(
  profile: unknown,
  settingsPath: readonly string[],
  modelId: string,
  tokens: number | undefined,
): SettingsPathOpView[] | undefined {
  if (!isRecord(profile)) return undefined
  const models = profile['models']
  if (Array.isArray(models)) {
    const index = models.findIndex(entry => isRecord(entry) && entry['id'] === modelId)
    if (index < 0) return undefined
    const current = models[index]
    if (!isRecord(current)) return undefined
    const nextRow: Record<string, unknown> = { ...current }
    if (tokens === undefined) delete nextRow['contextWindow']
    else nextRow['contextWindow'] = tokens
    const nextModels = models.map((entry, at) => at === index ? nextRow : entry)
    return [{ op: 'set', path: [...settingsPath, 'models'], value: jsonClone(nextModels) }]
  }
  const overridePath = [...settingsPath, 'modelOverrides', modelId]
  const existing = getPath(profile, ['modelOverrides', modelId])
  if (tokens === undefined) {
    if (!isRecord(existing) || !('contextWindow' in existing)) return []
    const rest = { ...existing }
    delete rest['contextWindow']
    return Object.keys(rest).length === 0
      ? [{ op: 'unset', path: overridePath }]
      : [{ op: 'set', path: overridePath, value: jsonClone(rest) }]
  }
  const next = isRecord(existing) ? { ...existing, contextWindow: tokens } : { contextWindow: tokens }
  return [{ op: 'set', path: overridePath, value: jsonClone(next) }]
}

/**
 * Clone a settings payload so the wire carries plain JSON.
 * @param value - structured value built from the current profile.
 * @returns JSON cloned through stringify, which drops `undefined` keys.
 */
function jsonClone(value: unknown): SettingsPathOpView extends { value: infer V } ? V : never {
  return JSON.parse(JSON.stringify(value)) as SettingsPathOpView extends { value: infer V } ? V : never
}
