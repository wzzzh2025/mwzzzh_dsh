/** General Settings control for the model failover queue. */

import { useState } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { FailoverQueueSettings } from './types.ts'
import { formatQueueText } from './queue.ts'
import css from './FailoverQueueRow.module.css'

/** Accepted setting and ordered mutations supplied by the settings owner. */
export interface FailoverQueueRowInjected {
  hooks: { failoverQueue: ObservableSnapshot<ConfigFormSnapshot<FailoverQueueSettings>> }
  setEnabled(enabled: boolean): Promise<void>
  setQueue(text: string): Promise<void>
}

/** Full component props. */
export type FailoverQueueRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'settings.failoverQueue'>
  & InjectFace<FailoverQueueRowInjected>

/**
 * Render the failover toggle and queue editor.
 * @param props - accepted preference, writers and localized copy.
 * @returns the General Settings row.
 */
export function FailoverQueueRow({ useFailoverQueue, setEnabled, setQueue, t }: FailoverQueueRowProps) {
  const snapshot = useFailoverQueue(value => value)
  const enabled = snapshot.value?.enabled === true
  const queueText = formatQueueText(snapshot.value?.queue ?? [])
  const [draft, setDraft] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const locked = busy || snapshot.status !== 'ready' || !snapshot.writable
  const text = draft ?? queueText
  return <div className={css.row}>
    <div className={css.copy}>
      <div className={css.title}>{t('title')}</div>
      <div className={css.description}>{t('description')}</div>
      {failed && <div role="alert">{t('error')}</div>}
      {enabled && (
        <label className={css.field}>
          <span>{t('queue')}</span>
          <textarea
            className={css.textarea}
            rows={4}
            value={text}
            disabled={locked}
            onChange={(event) => { setDraft(event.target.value) }}
            onBlur={() => {
              if (draft === undefined) return
              setFailed(false)
              setBusy(true)
              void setQueue(draft).catch(() => { setFailed(true) }).finally(() => { setBusy(false); setDraft(undefined) })
            }}
          />
        </label>
      )}
    </div>
    <Switch checked={enabled} disabled={locked} label={t('title')}
      onChange={(next) => {
        setFailed(false)
        setBusy(true)
        void setEnabled(next).catch(() => { setFailed(true) }).finally(() => { setBusy(false) })
      }} />
  </div>
}
