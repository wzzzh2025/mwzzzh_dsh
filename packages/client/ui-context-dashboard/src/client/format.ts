/**
 * Format helpers for occupancy percentages and token counts.
 */

/**
 * Format a token count with grouping separators.
 * @param value - token count.
 * @returns a grouped decimal string.
 */
export function formatTokens(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

/**
 * Occupancy of projected tokens against a context window.
 * @param projected - next-request pressure, if any.
 * @param window - advertised capacity, if any.
 * @returns a 0–100 percentage, or undefined when either side is missing.
 */
export function occupancyPercent(projected: number | undefined, window: number | undefined): number | undefined {
  if (projected === undefined || window === undefined || window <= 0) return undefined
  return Math.min(100, Math.round((projected / window) * 100))
}

/**
 * Open the conversation view whose tab label matches `label`.
 * @param label - localized tab text.
 * @returns whether a tab was clicked.
 */
export function clickConversationView(label: string): boolean {
  const tabs = document.querySelectorAll<HTMLButtonElement>('[data-conversation-tabs] [role="tab"]')
  for (const tab of tabs) {
    if (tab.textContent === label) {
      tab.click()
      return true
    }
  }
  return false
}
