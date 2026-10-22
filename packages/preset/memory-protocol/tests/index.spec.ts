import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { describe, expect, it } from 'vitest'
import * as MemoryProtocol from '@deepseek-ai/dsh-memory-protocol'
import { MEMORY_PROTOCOL_SECTION } from '@deepseek-ai/dsh-memory-protocol'

async function harness(config?: MemoryProtocol.Config): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(MemoryProtocol, config)
  return ctx
}

describe('memory-protocol', () => {
  it('registers the protocol section by default', async () => {
    const ctx = await harness()
    try {
      const assembly = await ctx.systemPrompt.assemble()
      expect(assembly.sections.find(section => section.name === MEMORY_PROTOCOL_SECTION)?.text)
        .toContain('memory/README.md')
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('drops the section when enabled is false', async () => {
    const ctx = await harness({ enabled: false })
    try {
      const assembly = await ctx.systemPrompt.assemble()
      expect(assembly.sections.find(section => section.name === MEMORY_PROTOCOL_SECTION)).toBeUndefined()
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('drops the section when replacement text is empty', async () => {
    const ctx = await harness({ text: '   ' })
    try {
      const assembly = await ctx.systemPrompt.assemble()
      expect(assembly.sections.find(section => section.name === MEMORY_PROTOCOL_SECTION)).toBeUndefined()
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('uses replacement text when provided', async () => {
    const ctx = await harness({ text: 'Read memory/ first.' })
    try {
      const assembly = await ctx.systemPrompt.assemble()
      expect(assembly.sections.find(section => section.name === MEMORY_PROTOCOL_SECTION)?.text)
        .toBe('Read memory/ first.')
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
