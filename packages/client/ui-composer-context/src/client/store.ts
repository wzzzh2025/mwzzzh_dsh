/**
 * Process-wide snapshot of configurable providers and Settings namespaces
 * used to read and write one model's `contextWindow`.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { LlmConfigurableProvider, SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsDescribeFace } from '@deepseek-ai/dsh-client-ui-settings/client'
import { getPath, patchModelWindow, resolveCap } from './settings.ts'

/** Snapshot the composer chip reads. */
export interface ComposerContextState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  /** Latest load or write refusal; cleared by the next success. */
  error: string | null
  writable: boolean
  providers: readonly LlmConfigurableProvider[]
  namespaces: ReadonlyMap<string, SettingsNamespaceView>
}

/** Outcome of one window write. */
export type SetWindowResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string }

/**
 * Load the provider directory and follow the shared Settings mirror.
 */
export class ComposerContextStore {
  /** Chip snapshot consumed through a bound selector hook. */
  readonly store: SnapshotStore<ComposerContextState> = createSnapshotStore({
    status: 'idle',
    error: null,
    writable: false,
    providers: [],
    namespaces: new Map(),
  })

  private following: (() => void) | undefined
  private disposed = false
  private generation = 0

  /**
   * @param ctx - plugin context declaring `remote.llm` and `remote.settings`.
   * @param describeFace - shared Settings describe mirror.
   */
  constructor(
    private readonly ctx: ClientContext,
    private readonly describeFace: SettingsDescribeFace,
  ) {}

  /**
   * Begin following the mirror and refresh the provider directory.
   * @returns settlement once the snapshot reflects the latest reads.
   */
  async load(): Promise<void> {
    if (this.disposed) return
    this.following ??= this.describeFace.subscribe(() => { this.derive() })
    this.store.update((state) => {
      if (state.status === 'idle') state.status = 'loading'
      state.error = null
    })
    const generation = ++this.generation
    await this.describeFace.ensure()
    const listed = await this.ctx.remote.llm.listConfigurableProviders()
    if (this.disposed || generation !== this.generation) return
    if (!listed.ok) {
      this.store.update((state) => {
        state.status = 'error'
        state.error = listed.error.message
      })
      return
    }
    this.store.update((state) => { state.providers = listed.value })
    this.derive()
  }

  /**
   * Pin or inherit `contextWindow` for one model.
   * @param provider - selected provider route.
   * @param model - selected model id.
   * @param tokens - explicit window, or `undefined` to inherit the catalog.
   * @returns whether the Host accepted the write.
   */
  async setWindow(provider: string, model: string, tokens: number | undefined): Promise<SetWindowResult> {
    const state = this.store.getSnapshot()
    const cap = resolveCap(state.providers, state.namespaces, state.writable, provider, model)
    if (cap === undefined) return { ok: false, message: 'unavailable' }
    if (!cap.writable) return { ok: false, message: 'read-only' }
    const view = state.namespaces.get(cap.settingsNs)
    if (view === undefined) return { ok: false, message: 'unavailable' }
    const profile = cap.settingsPath.length === 0 ? view.value : getPath(view.value, cap.settingsPath)
    const ops = patchModelWindow(profile, cap.settingsPath, model, tokens)
    if (ops === undefined) return { ok: false, message: 'missing-model' }
    if (ops.length === 0) return { ok: true }
    const response = await this.ctx.remote.settings.mutate(cap.settingsNs, ops, cap.revision)
    if (this.disposed) return { ok: false, message: 'unavailable' }
    if (!response.ok) return { ok: false, message: response.error.message }
    this.describeFace.acceptView(response.value)
    return { ok: true }
  }

  /** Stop following the mirror. */
  dispose(): void {
    this.disposed = true
    this.following?.()
    this.following = undefined
  }

  /** Publish namespaces from the held mirror answer. */
  private derive(): void {
    if (this.disposed) return
    const snapshot = this.describeFace.getSnapshot()
    const view = snapshot.view
    if (view === undefined) {
      if (snapshot.error !== null) {
        this.store.update((state) => {
          state.status = 'error'
          state.error = snapshot.error
        })
      }
      return
    }
    this.store.update((state) => {
      state.status = 'ready'
      state.error = null
      state.writable = view.writable
      state.namespaces = new Map(view.namespaces.map(entry => [entry.ns, entry]))
    })
  }
}
