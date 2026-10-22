/** Skills settings section: inventory, diagnostics, and lifecycle actions. */

import { useCallback, useEffect, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SkillsLocaleKey } from './locales.ts'
import type { BrowseResult, CreateDraft, ScanResult, SkillFile, SkillsSectionInjected, TrashEntry } from './types.ts'
import css from './SkillsSection.module.css'

export type { SkillsSectionInjected } from './types.ts'

/** Props the renderer binds for this settings section. */
export type SkillsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'skills.manager'>
  & InjectFace<SkillsSectionInjected>

/** Root new skills and imports land in; the user's own skills by default. */
const TARGET_ROOT = 'user-dsh'

const EMPTY_DRAFT: CreateDraft = { source: TARGET_ROOT, name: '', description: '', body: '' }

/**
 * Render the skills surface.
 *
 * The project roots resolve server-side from the process working directory,
 * because a settings section receives only `close` from the shell — it has no
 * workspace binding to pass down.
 */
export function SkillsSection({
  t, scan, readFile, browse, toggle, create, remove, importZip,
  listTrash, restoreTrash, purgeTrash,
}: SkillsSectionProps) {
  const [result, setResult] = useState<ScanResult>()
  const [trash, setTrash] = useState<TrashEntry[]>([])
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [panel, setPanel] = useState<'none' | 'create' | 'browse' | 'detail'>('none')
  const [detail, setDetail] = useState<SkillFile>()
  const [listing, setListing] = useState<BrowseResult>()
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  const refresh = useCallback(async () => {
    setBusy(true)
    setError(undefined)
    try {
      const [next, entries] = await Promise.all([scan(), listTrash()])
      setResult(next)
      setTrash(entries)
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }, [scan, listTrash])

  useEffect(() => { void refresh() }, [refresh])

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    setError(undefined)
    try {
      await action()
      const [next, entries] = await Promise.all([scan(), listTrash()])
      setResult(next)
      setTrash(entries)
      return true
    } catch (cause) {
      setError((cause as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }, [scan, listTrash])

  const closeDetail = useCallback(() => {
    setPanel('none')
    setDetail(undefined)
  }, [])

  const openDetail = useCallback(async (path: string) => {
    setBusy(true)
    setError(undefined)
    setDetail(undefined)
    setPanel('detail')
    try {
      setDetail(await readFile(path))
    } catch (cause) {
      setError((cause as Error).message)
      setPanel('none')
    } finally {
      setBusy(false)
    }
  }, [readFile])

  const openBrowse = useCallback(async (path?: string) => {
    setBusy(true)
    try {
      setListing(await browse(path))
      setPanel('browse')
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }, [browse])

  return (
    <div className={css.section}>
      <header className={css.header}>
        <div>
          <h2 className={css.heading}>{t('title')}</h2>
          <p className={css.intro}>{t('intro')}</p>
        </div>
        <div className={css.actions}>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
            {t('refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPanel(panel === 'create' ? 'none' : 'create')}
          >
            {t('create')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void openBrowse()}>
            {t('browse')}
          </Button>
        </div>
      </header>

      {error !== undefined && (
        <p className={css.error} role="alert">
          {t('failed')}: {error}
          {' '}
          <button type="button" className={css.link} onClick={() => void refresh()}>{t('retry')}</button>
        </p>
      )}
      {busy && result === undefined && <p className={css.muted}>{t('loading')}</p>}

      {panel === 'create' && (
        <form
          className={css.form}
          onSubmit={async (event) => {
            event.preventDefault()
            const ok = await run(() => create(draft))
            if (ok) {
              setDraft(EMPTY_DRAFT)
              setPanel('none')
            }
          }}
        >
          <label className={css.field}>
            <span>{t('createName')}</span>
            <input
              className={css.input}
              value={draft.name}
              onChange={event => setDraft({ ...draft, name: event.target.value })}
              placeholder="my-skill"
              required
            />
          </label>
          <label className={css.field}>
            <span>{t('createDescription')}</span>
            <input
              className={css.input}
              value={draft.description}
              onChange={event => setDraft({ ...draft, description: event.target.value })}
              required
            />
          </label>
          <label className={css.field}>
            <span>{t('createBody')}</span>
            <textarea
              className={css.textarea}
              rows={6}
              value={draft.body}
              onChange={event => setDraft({ ...draft, body: event.target.value })}
            />
          </label>
          <div className={css.actions}>
            <Button variant="primary" size="sm" type="submit" disabled={busy}>{t('createSubmit')}</Button>
            <Button variant="outline" size="sm" type="button" onClick={() => setPanel('none')}>
              {t('createCancel')}
            </Button>
          </div>
        </form>
      )}

      {panel === 'browse' && listing !== undefined && (
        <div className={css.panel}>
          <div className={css.panelHead}>
            <strong>{t('browseTitle')}</strong>
            <Button variant="outline" size="sm" onClick={() => setPanel('none')}>{t('detailClose')}</Button>
          </div>
          <p className={css.muted}>{listing.path === '' ? '/' : listing.path}</p>
          <ul className={css.list}>
            {listing.parent !== undefined && (
              <li>
                <button type="button" className={css.link} onClick={() => void openBrowse(listing.parent)}>
                  ..
                </button>
              </li>
            )}
            {listing.entries.length === 0 && <li className={css.muted}>{t('browseEmpty')}</li>}
            {listing.entries.map(entry => (
              <li key={entry.path} className={css.browseRow}>
                {entry.kind === 'directory' ? (
                  <button type="button" className={css.link} onClick={() => void openBrowse(entry.path)}>
                    {entry.name}/
                  </button>
                ) : (
                  <span>{entry.name}</span>
                )}
                {entry.isSkill === true && <span className={css.tag}>{t('loadable')}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={panel === 'detail'}
        onClose={closeDetail}
        title={t('detail')}
        closeLabel={t('detailClose')}
        className={css.detailDialog as string}
      >
        {detail !== undefined && (
          <div className={css.detailBody}>
            <p className={css.mutedSmall}>{detail.path}</p>
            <pre className={css.pre}>{detail.text}</pre>
          </div>
        )}
      </Modal>

      {result !== undefined && (
        <>
          <section>
            <h3 className={css.subheading}>{t('roots')}</h3>
            <ul className={css.list}>
              {result.roots.map(root => (
                <li key={root.source} className={css.rootRow}>
                  <span className={css.rank}>{root.rank}</span>
                  <span className={css.mono}>{root.source}</span>
                  <span className={root.present ? css.ok : css.warn}>
                    {root.present ? `${root.entries} ${t('rootPresent')}` : t('rootMissing')}
                  </span>
                  <span className={css.mutedSmall}>{root.path}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className={css.subheading}>{t('loadable')} ({result.skills.length})</h3>
            {result.skills.length === 0 && <p className={css.muted}>{t('empty')}</p>}
            <ul className={css.list}>
              {result.skills.map(skill => (
                <li key={`${skill.root}:${skill.bundle}`} className={css.skillRow}>
                  <div className={css.skillMain}>
                    <span className={css.skillName}>{skill.name}</span>
                    <span className={css.tag}>{skill.root}</span>
                    <p className={css.skillDesc}>{skill.description}</p>
                  </div>
                  <div className={css.skillActions}>
                    <button type="button" className={css.link} onClick={() => void openDetail(skill.path)}>
                      {t('detail')}
                    </button>
                    <button
                      type="button"
                      className={css.link}
                      disabled={busy}
                      onClick={() => void run(() => toggle(skill.root, skill.bundle, false))}
                    >
                      {t('disable')}
                    </button>
                    <button
                      type="button"
                      className={css.linkDanger}
                      disabled={busy}
                      onClick={() => {
                        if (confirm(t('confirmRemove'))) {
                          void run(() => remove(skill.root, skill.bundle))
                        }
                      }}
                    >
                      {t('remove')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className={css.subheading}>{t('trash')} ({trash.length})</h3>
            {trash.length === 0 && <p className={css.muted}>{t('trashEmpty')}</p>}
            <ul className={css.list}>
              {trash.map(entry => (
                <li key={entry.id} className={css.skillRow}>
                  <div className={css.skillMain}>
                    <span className={css.skillNameMuted}>{entry.name}</span>
                    <span className={css.tag}>{entry.source}</span>
                  </div>
                  <div className={css.skillActions}>
                    <button
                      type="button"
                      className={css.link}
                      disabled={busy}
                      onClick={() => void run(() => restoreTrash(entry.id))}
                    >
                      {t('restore')}
                    </button>
                    <button
                      type="button"
                      className={css.linkDanger}
                      disabled={busy}
                      onClick={() => {
                        if (confirm(t('confirmPurge'))) {
                          void run(() => purgeTrash(entry.id))
                        }
                      }}
                    >
                      {t('purge')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {result.disabled.length > 0 && (
            <section>
              <h3 className={css.subheading}>{t('disabled')} ({result.disabled.length})</h3>
              <ul className={css.list}>
                {result.disabled.map(skill => (
                  <li key={`d:${skill.root}:${skill.bundle}`} className={css.skillRow}>
                    <div className={css.skillMain}>
                      <span className={css.skillNameMuted}>{skill.name}</span>
                      <span className={css.tag}>{skill.root}</span>
                    </div>
                    <div className={css.skillActions}>
                      <button
                        type="button"
                        className={css.link}
                        disabled={busy}
                        onClick={() => void run(() => toggle(skill.root, skill.bundle, true))}
                      >
                        {t('enable')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.problems.length > 0 && (
            <section>
              <h3 className={css.subheading}>{t('problems')} ({result.problems.length})</h3>
              <ul className={css.list}>
                {result.problems.map(problem => (
                  <li key={`p:${problem.root}:${problem.name}`} className={css.problemRow}>
                    <div className={css.problemHead}>
                      <span className={css.problemName}>{problem.name}</span>
                      <span className={css.tagWarn}>{problem.reason}</span>
                    </div>
                    <p className={css.problemDetail}>{problem.detail}</p>
                    {problem.fix !== undefined && (
                      <p className={css.problemFix}><strong>{t('problemFix')}:</strong> {problem.fix}</p>
                    )}
                    <p className={css.mutedSmall}>{problem.path}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className={css.subheading}>{t('import')}</h3>
            <p className={css.muted}>{t('importHint')}</p>
            <input
              type="file"
              accept=".zip"
              className={css.file}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file !== undefined) {
                  void file.arrayBuffer().then(buffer => run(() =>
                    importZip(TARGET_ROOT, file.name.replace(/\.zip$/i, ''), new Uint8Array(buffer)),
                  ))
                }
                event.target.value = ''
              }}
            />
          </section>
        </>
      )}
    </div>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Skills settings surface copy. */
    'skills.manager': SkillsLocaleKey
  }
}
