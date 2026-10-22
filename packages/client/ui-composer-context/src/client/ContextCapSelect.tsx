/** Composer chip that pins the current model's context window in Settings. */

import { useRef, useState } from 'react'
import clsx from 'clsx'
import {
  IconChevronDownOutlineRegular, IconDatabaseOutlineRegular, IconWarningOutlineRegular, Menu, Toast, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { CONTEXT_GEARS, formatTokens, gearFor } from './gears.ts'
import type { ComposerContextLocaleKey } from './locales.ts'
import { resolveCap } from './settings.ts'
import type { ComposerContextState, SetWindowResult } from './store.ts'
import css from './ContextCapSelect.module.css'

/** Business face injected by the composer-context slot registration. */
export interface ContextCapSelectInjected {
  hooks: {
    /** Process-wide provider directory and Settings namespaces. */
    contextCap: HostObservable<ComposerContextState>
  }
  /**
   * Pin or inherit `contextWindow` for one model.
   * @param provider - selected provider route.
   * @param model - selected model id.
   * @param tokens - explicit window, or `undefined` to inherit the catalog.
   */
  setWindow: (provider: string, model: string, tokens: number | undefined) => Promise<SetWindowResult>
}

/** Complete props derived from the conversation slot, injected hooks, and locale. */
export type ContextCapSelectProps =
  PropsRuntime<'conversation.input.right'>
  & InjectFace<ContextCapSelectInjected>
  & PropsLocale<'composer.context'>

const GEAR_LABEL: Record<string, ComposerContextLocaleKey> = {
  default: 'gear.default',
  '64k': 'gear.64k',
  '128k': 'gear.128k',
  '256k': 'gear.256k',
  '512k': 'gear.512k',
  '1m': 'gear.1m',
}

/**
 * Render the composer context-window chip.
 * @param props - session projections, the shared Settings snapshot, and locale.
 * @returns the chip, or null when this model has no Settings profile.
 */
export function ContextCapSelect({
  useProjection, useContextCap, setWindow, t,
}: ContextCapSelectProps) {
  const selection = useProjection('modelSelection')
  const snapshot = useContextCap(state => state)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ seq: number; text: string } | null>(null)
  const toastSeq = useRef(0)
  const rootRef = useRef<HTMLSpanElement>(null)

  const current = selection?.next ?? selection?.lastUsed
  if (current === null || current === undefined || snapshot.status !== 'ready') return null
  const cap = resolveCap(
    snapshot.providers, snapshot.namespaces, snapshot.writable, current.provider, current.model,
  )
  if (cap === undefined) return null

  const selected = cap.overridden ? (gearFor(cap.effective)?.id ?? 'custom') : 'default'
  const triggerLabel = triggerText(cap.effective, t)

  const items: MenuEntry[] = CONTEXT_GEARS.map(gear => ({
    id: gear.id,
    label: t(GEAR_LABEL[gear.id] ?? 'gear.default'),
  }))
  if (selected === 'custom' && cap.effective !== undefined) {
    items.push({ id: 'custom', label: formatTokens(cap.effective) })
  }

  const choose = (id: string): void => {
    setOpen(false)
    if (id === 'custom' || id === selected) return
    const gear = CONTEXT_GEARS.find(item => item.id === id)
    if (gear === undefined) return
    setBusy(true)
    void setWindow(current.provider, current.model, gear.tokens).then((result) => {
      setBusy(false)
      if (result.ok) return
      toastSeq.current += 1
      setToast({ seq: toastSeq.current, text: t('error.write', { message: result.message }) })
    })
  }

  return (
    <span ref={rootRef}>
      <Menu
        open={open}
        items={items}
        selectedId={selected}
        onSelect={choose}
        onClose={() => { setOpen(false) }}
        side="top"
        portal
        anchor={
          <Tooltip label={t('hint')} side="top" delayMs={500}>
            <button
              type="button"
              className={css.trigger}
              aria-label={t('trigger.aria', { window: triggerLabel })}
              title={t('hint')}
              disabled={!cap.writable || busy}
              onClick={() => { setOpen(!open) }}
            >
              <span className={css.triggerIcon} aria-hidden>
                <IconDatabaseOutlineRegular />
              </span>
              <span className={css.triggerLabel}>{triggerLabel}</span>
              <span className={clsx(css.chevron, open && css.chevronOpen)} aria-hidden>
                <IconChevronDownOutlineRegular />
              </span>
            </button>
          </Tooltip>
        }
      />
      {toast !== null && (
        <Toast
          key={toast.seq}
          text={toast.text}
          icon={<IconWarningOutlineRegular />}
          anchor={rootRef.current?.closest<HTMLElement>('[data-composer-card]') ?? null}
          onDone={() => { setToast(null) }}
        />
      )}
    </span>
  )
}

/**
 * Label the chip with the resolved window, falling back to Default.
 * @param effective - resolved window, when one is present.
 * @param t - locale seat.
 * @returns the chip text.
 */
function triggerText(
  effective: number | undefined,
  t: ContextCapSelectProps['t'],
): string {
  if (effective !== undefined) {
    const gear = gearFor(effective)
    const key = gear === undefined || gear.id === 'default' ? undefined : GEAR_LABEL[gear.id]
    if (key !== undefined) return t(key)
    return formatTokens(effective)
  }
  return t('trigger.default')
}
