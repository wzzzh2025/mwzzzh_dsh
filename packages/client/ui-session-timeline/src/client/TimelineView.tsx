/** Read-only turn list: click loads that turn and switches back to Chat. */

import type { SessionSeq } from '@deepseek-ai/dsh-session/types'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { TimelineLocaleKey } from './locales.ts'
import css from './TimelineView.module.css'

/** Jump loader supplied by the session binding. */
export interface TimelineViewInjected {
  /**
   * Page history back through `seq` so the Chat view can paint that turn.
   * @param seq - `turn/start` sequence to cover.
   */
  jump(seq: SessionSeq): Promise<void>
}

/** Props the renderer binds for this conversation view. */
export type TimelineViewProps =
  PropsRuntime<'conversation.view'>
  & PropsLocale<'session.timeline'>
  & InjectFace<TimelineViewInjected>

/**
 * Scroll the Chat transcript to one turn once that view is showing.
 * @param turn - host-assigned turn number.
 */
export function scrollToChatTurn(turn: number): void {
  const row = document.querySelector<HTMLElement>(`[data-chat-turn="${String(turn)}"]`)
  row?.scrollIntoView({ block: 'start' })
}

/**
 * Render the whole-log turn outline as a jump list.
 * @param props - outline projection, jump loader, view switch, and copy.
 * @returns the timeline view.
 */
export function TimelineView({
  useProjection, jump, openView, t,
}: TimelineViewProps) {
  const turns = useProjection('turnOutline') ?? []
  return (
    <div className={css.view}>
      <h2 className={css.heading}>{t('view')}</h2>
      {turns.length === 0 && <p className={css.empty}>{t('empty')}</p>}
      <ul className={css.list}>
        {turns.map(entry => (
          <li key={entry.seq}>
            <button
              type="button"
              className={css.row}
              onClick={() => {
                void jump(entry.seq).then(() => {
                  openView('chat', `turn:${entry.turn}`)
                  requestAnimationFrame(() => { scrollToChatTurn(entry.turn) })
                })
              }}
            >
              <span className={css.turn}>{t('turn', { turn: entry.turn })}</span>
              {entry.prompt.length > 0 && <span className={css.prompt}>{entry.prompt}</span>}
              {entry.response.length > 0 && <span className={css.response}>{entry.response}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Read-only session timeline copy. */
    'session.timeline': TimelineLocaleKey
  }
}
