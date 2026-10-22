/** One selectable context-window gear. `tokens` omitted means inherit the catalog. */
export interface ContextGear {
  /** Stable menu id. */
  readonly id: string
  /** Token capacity written to `contextWindow`, or inherit when omitted. */
  readonly tokens: number | undefined
}

/**
 * Compact capacities offered beside the model chip. Counts use decimal
 * thousands, matching Settings → Models (`256K` is 256,000, `1M` is 1,000,000).
 */
export const CONTEXT_GEARS: readonly ContextGear[] = [
  { id: 'default', tokens: undefined },
  { id: '64k', tokens: 64_000 },
  { id: '128k', tokens: 128_000 },
  { id: '256k', tokens: 256_000 },
  { id: '512k', tokens: 512_000 },
  { id: '1m', tokens: 1_000_000 },
]

/**
 * Format a token capacity the way Settings spells K/M counts.
 * @param tokens - positive token count.
 * @returns `1M` / `256K` when the count is a whole thousand or million, otherwise the decimal.
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000 && tokens % 1_000_000 === 0) return `${String(tokens / 1_000_000)}M`
  if (tokens >= 1_000 && tokens % 1_000 === 0) return `${String(tokens / 1_000)}K`
  return String(tokens)
}

/**
 * Find the shipped gear for a stored count.
 * @param tokens - resolved or overridden window; `undefined` is the inherit gear.
 * @returns the matching gear, or `undefined` when the count is not one of the shipped steps.
 */
export function gearFor(tokens: number | undefined): ContextGear | undefined {
  return CONTEXT_GEARS.find(gear => gear.tokens === tokens)
}
