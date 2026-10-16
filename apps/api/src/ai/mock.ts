import { containsTerm, type AiField, type AssistInput, type TailorInput } from '@cv/shared'
import type { AiProvider, AiRequest } from './provider'

/**
 * A stand-in for a real model, for development without an API key and for
 * end-to-end tests. It answers in the same JSON format with simple rules,
 * so every screen can be tried out. Never used unless AI_PROVIDER=mock.
 */
const TYPOS: [RegExp, string, string][] = [
  [/\bteh\b/, 'teh', 'the'],
  [/\brecieve/, 'recieve', 'receive'],
  [/\bmanagment\b/, 'managment', 'management'],
  [/\bresponsable\b/, 'responsable', 'responsible'],
  [/\bexperiance\b/, 'experiance', 'experience'],
  [/\bsucessful/, 'sucessful', 'successful'],
  [/\bdevelopped\b/, 'developped', 'developed'],
  [/ {2,}/, '  ', ' '],
  [/\bi\b(?= )/, 'i', 'I'],
]

const VOCABULARY = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'SQL',
  'PostgreSQL',
  'Python',
  'Java',
  'AWS',
  'Docker',
  'Kubernetes',
  'GraphQL',
  'REST',
  'CI/CD',
  'Agile',
  'Scrum',
  'Figma',
  'UX',
  'leadership',
  'communication',
  'stakeholder management',
  'testing',
  'accessibility',
  'English',
]

const ids = (fields: AiField[]) => fields.map((field, i) => ({ id: `f${i + 1}`, field }))

function fix(fields: AiField[]) {
  const suggestions = ids(fields).flatMap(({ id, field }) =>
    TYPOS.filter(([pattern]) => pattern.test(field.text)).map(([, original, replacement]) => ({
      id,
      original,
      replacement,
      reason: original.trim() ? 'Spelling' : 'Extra space',
    })),
  )
  return { suggestions }
}

function tailor({ fields, jobDescription }: TailorInput) {
  const found = VOCABULARY.filter((term) => containsTerm(jobDescription, term))
  const keywords = found.map((term, i) => ({ term, importance: i < 4 ? 'high' : 'medium' }))
  const cvText = fields.map((f) => f.text).join('\n')
  const missing = found.filter((term) => !containsTerm(cvText, term))
  const summary = ids(fields).find(({ field }) => field.path.endsWith('.text'))
  return {
    keywords,
    advice: [
      missing.length
        ? `The posting asks for ${missing.slice(0, 3).join(', ')}; mention them where your experience supports it.`
        : 'Your CV already covers the posting’s main keywords.',
      'Put the most relevant experience first and quantify results where you can.',
    ],
    rewrites:
      summary && missing.length
        ? [
            {
              id: summary.id,
              replacement: `${summary.field.text.trim()} Familiar with ${missing.slice(0, 2).join(' and ')}.`,
              reason: `Adds ${missing.slice(0, 2).join(', ')} from the posting`,
            },
          ]
        : [],
  }
}

function assist(input: AssistInput & { target: AiField[] }) {
  const headline = input.fields.find((f) => f.path === 'header.headline')?.text ?? 'Professional'
  if (input.task === 'summary') {
    return {
      texts: [
        `${headline} with hands-on experience delivering reliable results. Known for clear communication and steady ownership of work from idea to release.`,
      ],
    }
  }
  if (input.task === 'bullets') {
    const existing = input.target.filter((f) => /\.bullets\.\d+$/.test(f.path)).map((f) => f.text)
    return {
      texts: existing.length
        ? existing.map((b) => `Delivered: ${b.replace(/^[A-Z]/, (c) => c.toLowerCase())}`)
        : [
            'Delivered features from planning to release',
            'Worked closely with the team to improve quality',
          ],
    }
  }
  const at = input.company ? ` at ${input.company}` : ''
  return {
    texts: [
      `I am writing to apply for the ${input.position || 'open'} position${at}.`,
      `As a ${headline}, I bring experience that matches what you are looking for.`,
      'I would welcome the chance to discuss how I can contribute to your team.',
    ],
  }
}

export function createMockProvider(): AiProvider {
  return {
    label: 'Mock AI (development)',
    async complete(request: AiRequest) {
      const input = request.input as never
      const answer =
        request.task === 'fix'
          ? fix((input as { fields: AiField[] }).fields)
          : request.task === 'tailor'
            ? tailor(input)
            : assist(input)
      return JSON.stringify(answer)
    },
  }
}
