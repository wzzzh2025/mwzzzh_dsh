// @vitest-environment jsdom
/** Dashboard: empty occupancy versus a filled meter and composition rows. */

import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { ContextDashboard } from '../src/client/ContextDashboard.tsx'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

it('shows empty occupancy and usage when projections are absent', () => {
  const props = {
    sessionId: 's1',
    inspectCall: undefined,
    viewRequest: null,
    openView: () => undefined,
    completeViewRequest: () => undefined,
    useProjection: () => undefined,
    t: (key: keyof typeof en) => en[key],
  } as ComponentProps<typeof ContextDashboard>
  render(<ContextDashboard {...props} />)
  expect(screen.getAllByText(en.occupancyEmpty).length).toBeGreaterThan(0)
  expect(screen.getByText(en.usageEmpty)).toBeTruthy()
})

it('renders occupancy, composition, and cumulative usage', () => {
  const props = {
    sessionId: 's1',
    inspectCall: undefined,
    viewRequest: null,
    openView: () => undefined,
    completeViewRequest: () => undefined,
    useProjection: (key: string) => {
      if (key === 'contextPressure') return { projectedTokens: 250, contextWindow: 1000, pressureTokens: 200 }
      if (key === 'contextBreakdown') return { systemTokens: 10, toolsTokens: 20, messageTokens: 30 }
      if (key === 'tokenUsage') {
        return { uncachedInputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 }
      }
      return undefined
    },
    t: (key: keyof typeof en) => en[key],
  } as ComponentProps<typeof ContextDashboard>
  render(<ContextDashboard {...props} />)
  expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('25')
  expect(screen.getByText(en.system)).toBeTruthy()
  expect(screen.getByText(en.uncached)).toBeTruthy()
})
