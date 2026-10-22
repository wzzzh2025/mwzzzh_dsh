// @vitest-environment jsdom
/** Occupancy math, token grouping, and tab clicking. */

import { afterEach, expect, it } from 'vitest'
import { clickConversationView, formatTokens, occupancyPercent } from '../src/client/format.ts'

afterEach(() => {
  document.body.replaceChildren()
})

it('groups token counts', () => {
  expect(formatTokens(128000)).toBe('128,000')
})

it('returns a capped occupancy percentage only when both sides exist', () => {
  expect(occupancyPercent(undefined, 1000)).toBeUndefined()
  expect(occupancyPercent(10, undefined)).toBeUndefined()
  expect(occupancyPercent(10, 0)).toBeUndefined()
  expect(occupancyPercent(250, 1000)).toBe(25)
  expect(occupancyPercent(5000, 1000)).toBe(100)
})

it('clicks the conversation tab whose label matches', () => {
  const strip = document.createElement('div')
  strip.setAttribute('data-conversation-tabs', '')
  const chat = document.createElement('button')
  chat.setAttribute('role', 'tab')
  chat.textContent = 'Chat'
  const context = document.createElement('button')
  context.setAttribute('role', 'tab')
  context.textContent = 'Context'
  let clicked = ''
  context.addEventListener('click', () => { clicked = 'Context' })
  strip.append(chat, context)
  document.body.append(strip)
  expect(clickConversationView('Context')).toBe(true)
  expect(clicked).toBe('Context')
  expect(clickConversationView('Missing')).toBe(false)
})
