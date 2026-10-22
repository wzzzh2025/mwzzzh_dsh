/** Git tab body: status list, one-file diff, and a selected-path commit. */

import { useCallback, useEffect, useState } from 'react'
import { Button, PluginArtworkDefault } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { GitStatusEntry, GitTabInjected } from './types.ts'
import css from './GitBody.module.css'

/** Props the renderer binds for this tab body. */
export type GitBodyProps =
  PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<'sidebarGit'>
  & InjectFace<GitTabInjected>

/**
 * Render status, diff, and commit controls for the session workspace.
 * @param props - session cwd, host operations, and copy.
 * @returns the tab body.
 */
export function GitBody({ sessionId, useSessions, status, diff, commit, t }: GitBodyProps) {
  const cwd = useSessions(sessions => sessions.byId[sessionId]?.cwd)
  const [entries, setEntries] = useState<GitStatusEntry[]>()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [active, setActive] = useState<string>()
  const [patch, setPatch] = useState<string>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (cwd === undefined) return
    setBusy(true)
    setError(undefined)
    try {
      setEntries(await status(cwd))
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }, [cwd, status])

  useEffect(() => { void refresh() }, [refresh])

  if (cwd === undefined) {
    return <div className={css.status}>{t('noWorkspace')}</div>
  }

  return (
    <div className={css.root}>
      <div className={css.header}>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
          {t('refresh')}
        </Button>
      </div>
      {error !== undefined && (
        <p className={css.error} role="alert">
          {t('failed')}: {error}
          {' '}
          <button type="button" className={css.link} onClick={() => void refresh()}>{t('retry')}</button>
        </p>
      )}
      <div className={css.body}>
        {entries !== undefined && entries.length === 0 && <p className={css.status}>{t('empty')}</p>}
        <ul className={css.list}>
          {(entries ?? []).map(entry => (
            <li key={entry.path} className={css.row}>
              <input
                type="checkbox"
                checked={selected.has(entry.path)}
                onChange={() => {
                  setSelected((current) => {
                    const next = new Set(current)
                    if (next.has(entry.path)) next.delete(entry.path)
                    else next.add(entry.path)
                    return next
                  })
                }}
              />
              <span className={css.code}>{entry.untracked ? '??' : `${entry.index}${entry.worktree}`}</span>
              <button
                type="button"
                className={css.path}
                onClick={() => {
                  setActive(entry.path)
                  void diff(cwd, entry.path).then(setPatch).catch((cause: unknown) => {
                    setError((cause as Error).message)
                  })
                }}
              >
                {entry.path}
              </button>
            </li>
          ))}
        </ul>
        {active !== undefined && (
          <pre className={css.diff}>{patch === undefined || patch.length === 0 ? t('diffEmpty') : patch}</pre>
        )}
      </div>
      <form
        className={css.form}
        onSubmit={(event) => {
          event.preventDefault()
          if (selected.size === 0 || message.trim().length === 0) return
          setBusy(true)
          setError(undefined)
          void commit(cwd, message.trim(), [...selected])
            .then(async () => {
              setMessage('')
              setSelected(new Set())
              setPatch(undefined)
              setActive(undefined)
              setEntries(await status(cwd))
            })
            .catch((cause: unknown) => { setError((cause as Error).message) })
            .finally(() => { setBusy(false) })
        }}
      >
        <input
          className={css.input}
          value={message}
          onChange={event => setMessage(event.target.value)}
          placeholder={t('message')}
          aria-label={t('message')}
        />
        <Button variant="primary" size="sm" type="submit" disabled={busy || selected.size === 0}>
          {t('commit')}
        </Button>
      </form>
    </div>
  )
}

/**
 * Chip title for the Git tab.
 * @param props - tab information hook.
 * @returns the default plugin artwork and the tab title.
 */
export function GitTitle({ useTabInfo }: PropsRuntime<'sidebar.right.pane.tab.title'>) {
  const { tab } = useTabInfo()
  return (
    <>
      <PluginArtworkDefault size={16} className={css.titleIcon} />
      {tab.title}
    </>
  )
}
