/** Locate and patch one model's contextWindow inside an LLM settings profile. */

import { expect, it } from 'vitest'
import { formatTokens, gearFor } from '../src/client/gears.ts'
import {
  getPath, modelRow, patchModelWindow, readWindow, resolveCap,
} from '../src/client/settings.ts'
import type { LlmConfigurableProvider, SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'

const akali: LlmConfigurableProvider = {
  provider: 'akali',
  displayName: 'akali',
  settingsNs: 'llm-pi-ai',
  settingsPath: ['providers', 'akali'],
}

function view(value: unknown, user?: unknown): SettingsNamespaceView {
  return {
    autoGenerate: true,
    ns: 'llm-pi-ai',
    schema: {},
    value: value as SettingsNamespaceView['value'],
    ...user === undefined ? {} : { user: user as SettingsNamespaceView['user'] },
    applies: 'live',
    secrets: [],
    revision: 3,
  } as SettingsNamespaceView
}

it('formats decimal thousand and million counts the way Settings does', () => {
  expect(formatTokens(64_000)).toBe('64K')
  expect(formatTokens(1_000_000)).toBe('1M')
  expect(formatTokens(131_072)).toBe('131072')
  expect(gearFor(128_000)?.id).toBe('128k')
  expect(gearFor(undefined)?.id).toBe('default')
  expect(gearFor(7)).toBeUndefined()
})

it('reads a listed model window and a catalog override', () => {
  const listed = {
    models: [{ id: 'deepseek-v4.1-flash', contextWindow: 1_000_000, name: 'flash' }],
  }
  expect(readWindow(modelRow(listed, 'deepseek-v4.1-flash'))).toBe(1_000_000)
  expect(modelRow(listed, 'missing')).toBeUndefined()
  const catalog = { modelOverrides: { 'gpt-4': { contextWindow: 128_000 } } }
  expect(readWindow(modelRow(catalog, 'gpt-4'))).toBe(128_000)
})

it('patches a models[] row without dropping sibling fields', () => {
  const profile = {
    models: [{ id: 'flash', contextWindow: 1_000_000, reasoningEfforts: { high: 'high' } }],
  }
  expect(patchModelWindow(profile, ['providers', 'akali'], 'flash', 128_000)).toEqual([{
    op: 'set',
    path: ['providers', 'akali', 'models'],
    value: [{ id: 'flash', contextWindow: 128_000, reasoningEfforts: { high: 'high' } }],
  }])
  expect(patchModelWindow(profile, ['providers', 'akali'], 'flash', undefined)).toEqual([{
    op: 'set',
    path: ['providers', 'akali', 'models'],
    value: [{ id: 'flash', reasoningEfforts: { high: 'high' } }],
  }])
  expect(patchModelWindow(profile, ['providers', 'akali'], 'missing', 64_000)).toBeUndefined()
})

it('pins a catalog model through modelOverrides and unsets an empty override', () => {
  const empty = patchModelWindow({}, ['providers', 'openai'], 'gpt-4', 256_000)
  expect(empty).toEqual([{
    op: 'set',
    path: ['providers', 'openai', 'modelOverrides', 'gpt-4'],
    value: { contextWindow: 256_000 },
  }])
  const existing = {
    modelOverrides: { 'gpt-4': { contextWindow: 64_000, maxTokens: 8_000 } },
  }
  expect(patchModelWindow(existing, ['providers', 'openai'], 'gpt-4', undefined)).toEqual([{
    op: 'set',
    path: ['providers', 'openai', 'modelOverrides', 'gpt-4'],
    value: { maxTokens: 8_000 },
  }])
  expect(patchModelWindow(
    { modelOverrides: { 'gpt-4': { contextWindow: 64_000 } } },
    ['providers', 'openai'],
    'gpt-4',
    undefined,
  )).toEqual([{ op: 'unset', path: ['providers', 'openai', 'modelOverrides', 'gpt-4'] }])
})

it('treats a composition default as Default until the user layer names a window', () => {
  const namespaces = new Map([['llm-pi-ai', view({
    providers: { akali: { models: [{ id: 'flash', contextWindow: 1_000_000 }] } },
  })]])
  const inherited = resolveCap([akali], namespaces, true, 'akali', 'flash')
  expect(inherited).toMatchObject({
    settingsNs: 'llm-pi-ai', effective: 1_000_000, overridden: false, writable: true, revision: 3,
  })
  const user = new Map([['llm-pi-ai', view(
    { providers: { akali: { models: [{ id: 'flash', contextWindow: 128_000 }] } } },
    { providers: { akali: { models: [{ id: 'flash', contextWindow: 128_000 }] } } },
  )]])
  expect(resolveCap([akali], user, true, 'akali', 'flash')?.overridden).toBe(true)
  expect(resolveCap([akali], namespaces, true, 'missing', 'flash')).toBeUndefined()
  expect(getPath({ providers: { akali: { models: [] } } }, ['providers', 'akali', 'models'])).toEqual([])
})
