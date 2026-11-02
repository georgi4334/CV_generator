import type { AiField } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { createMockProvider } from './mock'
import type { AiRequest, AiTask } from './provider'

const provider = createMockProvider()
const ask = async (task: AiTask, input: unknown) =>
  JSON.parse(await provider.complete({ task, system: '', prompt: '', temperature: 0, input }))

const field = (path: string, text: string): AiField => ({ path, label: path, text })

describe('mock AI provider', () => {
  it('has a label that says it is not real', () => {
    expect(provider.label).toMatch(/mock/i)
  })

  describe('fix', () => {
    it('answers an empty suggestion list for no fields', async () => {
      expect(await ask('fix', { fields: [] })).toEqual({ suggestions: [] })
    })

    it('answers an empty suggestion list for text without mistakes (also empty text)', async () => {
      expect(await ask('fix', { fields: [field('a', 'Perfect text.'), field('b', '')] })).toEqual({
        suggestions: [],
      })
    })

    it.each([
      ['Led teh team', 'teh', 'the'],
      ['Will recieve it', 'recieve', 'receive'],
      ['Project managment', 'managment', 'management'],
      ['I was responsable', 'responsable', 'responsible'],
      ['Years of experiance', 'experiance', 'experience'],
      ['A sucessful launch', 'sucessful', 'successful'],
      ['Developped an app', 'developped', 'developed'],
      ['i built it', 'i', 'I'],
    ])('finds the typo in %j', async (text, original, replacement) => {
      const { suggestions } = await ask('fix', { fields: [field('a', text.replace(/^D/, 'd'))] })
      expect(suggestions).toContainEqual(
        expect.objectContaining({ id: 'f1', original, replacement, reason: 'Spelling' }),
      )
    })

    it('reports double spaces as an extra space', async () => {
      const { suggestions } = await ask('fix', { fields: [field('a', 'Two  spaces')] })
      expect(suggestions).toEqual([
        { id: 'f1', original: '  ', replacement: ' ', reason: 'Extra space' },
      ])
    })

    it('numbers the fields f1, f2, ... in order and reports several typos in one field', async () => {
      const { suggestions } = await ask('fix', {
        fields: [field('a', 'fine'), field('b', 'teh recieve')],
      })
      expect(suggestions.map((s: { id: string; original: string }) => [s.id, s.original])).toEqual([
        ['f2', 'teh'],
        ['f2', 'recieve'],
      ])
    })

    it('does not touch words that only contain a typo as part of another word', async () => {
      const { suggestions } = await ask('fix', { fields: [field('a', 'tehran irrecieved')] })
      expect(suggestions).toEqual([])
    })

    it('handles emoji, NUL bytes and very long text', async () => {
      const text = `🙂\u0000 teh ${'x'.repeat(100_000)}`
      const { suggestions } = await ask('fix', { fields: [field('a', text)] })
      expect(suggestions).toHaveLength(1)
    })
  })

  describe('tailor', () => {
    const cv = [
      field('header.headline', 'Developer'),
      field('sections.s1.text', 'I like to build things.'),
    ]

    it('finds keywords from the posting; the first four are high, the rest medium', async () => {
      const result = await ask('tailor', {
        fields: cv,
        jobDescription:
          'We need JavaScript, TypeScript, React, Node.js, Docker and Kubernetes experience.',
      })
      expect(result.keywords.map((k: { term: string }) => k.term)).toEqual([
        'JavaScript',
        'TypeScript',
        'React',
        'Node.js',
        'Docker',
        'Kubernetes',
      ])
      expect(result.keywords.map((k: { importance: string }) => k.importance)).toEqual([
        'high',
        'high',
        'high',
        'high',
        'medium',
        'medium',
      ])
    })

    it('adds the missing keywords to the summary field as a rewrite', async () => {
      const result = await ask('tailor', {
        fields: cv,
        jobDescription: 'Looking for someone who knows React and Docker and Kubernetes.',
      })
      expect(result.rewrites).toEqual([
        {
          id: 'f2',
          replacement: 'I like to build things. Familiar with React and Docker.',
          reason: 'Adds React, Docker from the posting',
        },
      ])
      expect(result.advice[0]).toContain('React, Docker, Kubernetes')
    })

    it('says the CV already covers the posting when nothing is missing, and rewrites nothing', async () => {
      const result = await ask('tailor', {
        fields: [field('sections.s1.text', 'I know React well.')],
        jobDescription: 'We use React every day.',
      })
      expect(result.keywords).toEqual([{ term: 'React', importance: 'high' }])
      expect(result.rewrites).toEqual([])
      expect(result.advice[0]).toMatch(/already covers/)
    })

    it('gives no keywords and no rewrite for a posting without known terms', async () => {
      const result = await ask('tailor', {
        fields: cv,
        jobDescription: 'Zxqv blorp wibble wobble.',
      })
      expect(result.keywords).toEqual([])
      expect(result.rewrites).toEqual([])
      expect(result.advice).toHaveLength(2)
    })

    it('has nothing to rewrite when no field ends with .text, and survives no fields at all', async () => {
      const noSummary = await ask('tailor', {
        fields: [field('header.headline', 'Dev')],
        jobDescription: 'Needs React.',
      })
      expect(noSummary.rewrites).toEqual([])
      const none = await ask('tailor', { fields: [], jobDescription: '' })
      expect(none.keywords).toEqual([])
    })
  })

  describe('assist', () => {
    const fields = [field('header.headline', 'Frontend Developer')]

    it('writes one summary paragraph that uses the headline', async () => {
      const { texts } = await ask('assist', { task: 'summary', fields, target: [] })
      expect(texts).toHaveLength(1)
      expect(texts[0]).toContain('Frontend Developer')
    })

    it('falls back to "Professional" when there is no headline', async () => {
      const { texts } = await ask('assist', { task: 'summary', fields: [], target: [] })
      expect(texts[0]).toMatch(/^Professional /)
    })

    it('rewrites existing bullets, lowercasing the first capital', async () => {
      const target = [
        field('sections.s2.items.i1.bullets.0', 'Built the thing'),
        field('sections.s2.items.i1.bullets.1', 'Led a team'),
        field('sections.s2.items.i1.title', 'Not a bullet'),
      ]
      const { texts } = await ask('assist', { task: 'bullets', fields, target })
      expect(texts).toEqual(['Delivered: built the thing', 'Delivered: led a team'])
    })

    it('suggests two generic bullets when the entry has none', async () => {
      const { texts } = await ask('assist', { task: 'bullets', fields, target: [] })
      expect(texts).toHaveLength(2)
    })

    it('writes a three-paragraph letter with the position and company', async () => {
      const { texts } = await ask('assist', {
        task: 'letter',
        fields,
        target: [],
        position: 'Engineer',
        company: 'Acme',
      })
      expect(texts).toHaveLength(3)
      expect(texts[0]).toBe('I am writing to apply for the Engineer position at Acme.')
    })

    it('uses "open" and no company when they are empty', async () => {
      const { texts } = await ask('assist', { task: 'letter', fields, target: [] })
      expect(texts[0]).toBe('I am writing to apply for the open position.')
    })
  })

  it('always answers valid JSON text', async () => {
    for (const task of ['fix', 'tailor', 'assist'] as const) {
      const input =
        task === 'fix'
          ? { fields: [] }
          : task === 'tailor'
            ? { fields: [], jobDescription: '' }
            : { task: 'summary', fields: [], target: [] }
      const text = await provider.complete({
        task,
        system: '',
        prompt: '',
        temperature: 0,
        input,
      } as AiRequest)
      expect(() => JSON.parse(text)).not.toThrow()
    }
  })

  it('throws (does not answer garbage) when the input is missing entirely', async () => {
    await expect(ask('fix', undefined)).rejects.toThrow()
  })
})
