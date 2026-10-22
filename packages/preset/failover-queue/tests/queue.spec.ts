/** Queue parsing and failover codes. */

import { describe, expect, it } from 'vitest'
import {
  FAILOVER_CODES, formatQueueText, isFailoverCode, parseQueue, parseQueueText,
} from '../src/queue.ts'

describe('parseQueue', () => {
  it('drops empty provider or model rows', () => {
    expect(parseQueue([
      { provider: ' a ', model: 'b' },
      { provider: '', model: 'b' },
      { provider: 'a', model: '  ' },
    ])).toEqual([{ provider: 'a', model: 'b' }])
  })
})

describe('parseQueueText / formatQueueText', () => {
  it('reads provider/model lines and round-trips', () => {
    expect(parseQueueText('openai/gpt-4\n\nfoo/bar/baz\nbad\n/nope\nnoslash\n')).toEqual([
      { provider: 'openai', model: 'gpt-4' },
      { provider: 'foo', model: 'bar/baz' },
    ])
    expect(formatQueueText([{ provider: 'openai', model: 'gpt-4' }])).toBe('openai/gpt-4')
  })
})

describe('isFailoverCode', () => {
  it('accepts the transient codes and rejects others', () => {
    for (const code of FAILOVER_CODES) expect(isFailoverCode(code)).toBe(true)
    expect(isFailoverCode('AUTH')).toBe(false)
  })
})
