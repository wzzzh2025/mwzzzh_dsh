/** Occupancy, next-request composition, and cumulative usage. */

import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ContextDashboardLocaleKey } from './locales.ts'
import { formatTokens, occupancyPercent } from './format.ts'
import css from './ContextDashboard.module.css'

/** Props the renderer binds for this conversation view. */
export type ContextDashboardProps =
  PropsRuntime<'conversation.view'>
  & PropsLocale<'context.dashboard'>

/**
 * Render one labeled token row.
 * @param label - localized name.
 * @param value - token count.
 * @returns the row.
 */
function TokenRow({ label, value }: { label: string; value: number }) {
  return (
    <div className={css.row}>
      <span className={css.label}>{label}</span>
      <span className={css.value}>{formatTokens(value)}</span>
    </div>
  )
}

/**
 * Render occupancy, composition, and cumulative usage from session projections.
 * @param props - projection hooks and copy.
 * @returns the dashboard view.
 */
export function ContextDashboard({ useProjection, t }: ContextDashboardProps) {
  const pressure = useProjection('contextPressure')
  const breakdown = useProjection('contextBreakdown')
  const usage = useProjection('tokenUsage')
  const percent = occupancyPercent(pressure?.projectedTokens, pressure?.contextWindow)
  return (
    <div className={css.view}>
      <h2 className={css.heading}>{t('view')}</h2>

      <section className={css.section}>
        <h3 className={css.subheading}>{t('occupancy')}</h3>
        {percent === undefined || pressure?.projectedTokens === undefined || pressure.contextWindow === undefined
          ? <p className={css.muted}>{t('occupancyEmpty')}</p>
          : (
            <>
              <div className={css.row}>
                <span className={css.label}>{formatTokens(pressure.projectedTokens)} / {formatTokens(pressure.contextWindow)}</span>
                <span className={css.value}>{percent}%</span>
              </div>
              <div className={css.meter} role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className={css.fill} style={{ width: `${percent}%` }} />
              </div>
            </>
          )}
      </section>

      <section className={css.section}>
        <h3 className={css.subheading}>{t('composition')}</h3>
        {breakdown === undefined
          ? <p className={css.muted}>{t('occupancyEmpty')}</p>
          : (
            <>
              <TokenRow label={t('system')} value={breakdown.systemTokens} />
              <TokenRow label={t('tools')} value={breakdown.toolsTokens} />
              <TokenRow label={t('messages')} value={breakdown.messageTokens} />
            </>
          )}
      </section>

      <section className={css.section}>
        <h3 className={css.subheading}>{t('usage')}</h3>
        {usage === undefined
          ? <p className={css.muted}>{t('usageEmpty')}</p>
          : (
            <>
              <TokenRow label={t('uncached')} value={usage.uncachedInputTokens} />
              <TokenRow label={t('output')} value={usage.outputTokens} />
              <TokenRow label={t('cacheRead')} value={usage.cacheReadTokens} />
              <TokenRow label={t('cacheWrite')} value={usage.cacheWriteTokens} />
            </>
          )}
      </section>

      <p className={css.note}>{t('note')}</p>
    </div>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Context occupancy dashboard copy. */
    'context.dashboard': ContextDashboardLocaleKey
  }
}
