/** Queue textarea parsing used by the Settings row. */

import { expect, it } from 'vitest'
import { formatQueueText, parseQueue, parseQueueText } from '../src/client/queue.ts'

it('drops empty rows and round-trips provider/model lines', () => {
  expect(parseQueue([{ provider: ' a ', model: 'b' }, { provider: '', model: 'b' }]))
    .toEqual([{ provider: 'a', model: 'b' }])
  expect(parseQueueText('openai/gpt-4\nfoo/bar/baz\nbad\n')).toEqual([
    { provider: 'openai', model: 'gpt-4' },
    { provider: 'foo', model: 'bar/baz' },
  ])
  expect(formatQueueText([{ provider: 'openai', model: 'gpt-4' }])).toBe('openai/gpt-4')
})
