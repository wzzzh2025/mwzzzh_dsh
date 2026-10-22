/** General Settings control for the memory-protocol prompt section. */
import { useState } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MemoryProtocolSettings } from './types.ts'
import css from './MemoryProtocolRow.module.css'

/** Accepted setting and ordered mutation supplied by the settings owner. */
export interface MemoryProtocolRowInjected {
  hooks: { memoryProtocol: ObservableSnapshot<ConfigFormSnapshot<MemoryProtocolSettings>> }
  setEnabled(enabled: boolean): Promise<void>
}

/** Full component props. */
export type MemoryProtocolRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'settings.memoryProtocol'>
  & InjectFace<MemoryProtocolRowInjected>

/**
 * Render the memory-protocol toggle.
 * @param props - accepted preference, writer and localized copy.
 * @returns the General Settings row.
 */
export function MemoryProtocolRow({ useMemoryProtocol, setEnabled, t }: MemoryProtocolRowProps) {
  const snapshot = useMemoryProtocol(value => value)
  const enabled = snapshot.value?.enabled !== false
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const locked = busy || snapshot.status !== 'ready' || !snapshot.writable
  return <div className={css.row}>
    <div>
      <div className={css.title}>{t('title')}</div>
      <div className={css.description}>{t('description')}</div>
      {failed && <div role="alert">{t('error')}</div>}
    </div>
    <Switch checked={enabled} disabled={locked} label={t('title')}
      onChange={(next) => {
        setFailed(false)
        setBusy(true)
        void setEnabled(next).catch(() => { setFailed(true) }).finally(() => { setBusy(false) })
      }} />
  </div>
}
