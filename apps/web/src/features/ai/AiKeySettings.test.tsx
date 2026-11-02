import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
import type { FakeAiApi } from '@/test/fakeAiApi'
import { AiKeySettings } from './AiKeySettings'

const ai = vi.hoisted(() => ({ current: null as unknown as FakeAiApi }))

vi.mock('./api', async () => {
  const { createFakeAiApi } = await import('@/test/fakeAiApi')
  ai.current ??= createFakeAiApi()
  return { aiApi: ai.current.api }
})

const KEY = 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q'

// Tests replace single methods of the shared fake; put them back before each test.
let originalApi: FakeAiApi['api']
beforeEach(() => {
  originalApi ??= { ...ai.current.api }
  Object.assign(ai.current.api, originalApi)
  ai.current.reset()
})

function renderSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AiKeySettings />
    </QueryClientProvider>,
  )
}
const keyField = () => screen.getByLabelText('API key') as HTMLInputElement
const saveButton = () => screen.getByRole('button', { name: /Check and save key|Checking/ })
const type = (value: string) => fireEvent.change(keyField(), { target: { value } })
const savedRequests = () =>
  ai.current.state.requests.filter((r) => typeof r === 'object' && r !== null && 'apiKey' in r)

describe('AiKeySettings', () => {
  it('asks for the key in a field the browser will not remember or spell-check', async () => {
    renderSettings()
    await screen.findByRole('status')
    const field = keyField()
    expect(field.type).toBe('password')
    expect(field.getAttribute('autocomplete')).toBe('off')
    expect(field.getAttribute('spellcheck')).toBe('false')
    expect(field.required).toBe(true)
    expect(field.minLength).toBe(20)
    expect(field.maxLength).toBe(200)
  })

  it('links to Google AI Studio without leaking the referrer', async () => {
    renderSettings()
    await screen.findByRole('status')
    const link = screen.getByRole('link', { name: /key/i })
    expect(link.getAttribute('href')).toBe('https://aistudio.google.com/apikey')
    expect(link.getAttribute('rel')).toContain('noreferrer')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it.each([
    ['surrounding spaces', `  ${KEY}  `],
    ['a tab in front', `\t${KEY}`],
  ])(
    'sends a key pasted with %s unchanged (the server trims it) and clears the field',
    async (_, pasted) => {
      renderSettings()
      await screen.findByRole('status')
      type(pasted)
      fireEvent.click(saveButton())
      await screen.findByText('Key saved')
      expect(savedRequests()).toEqual([{ apiKey: pasted, model: 'gemini-flash-latest' }])
      expect(keyField().value).toBe('')
    },
  )

  it("accepts a 10 000 character paste into the field and shows the server's answer", async () => {
    ai.current.state.saveError = new ApiRequestError(400, 'validation_error', 'Too long')
    renderSettings()
    await screen.findByRole('status')
    type('K'.repeat(10_000))
    expect(keyField().value).toHaveLength(10_000)
    fireEvent.click(saveButton())
    expect((await screen.findByRole('alert')).textContent?.length).toBeGreaterThan(0)
  })

  it('does not send a second request when the button is clicked twice while checking', async () => {
    let finish!: () => void
    const original = ai.current.api.saveKey
    ai.current.api.saveKey = vi.fn(
      (input: Parameters<typeof original>[0]) =>
        new Promise<Awaited<ReturnType<typeof original>>>(
          (resolve) => (finish = () => resolve(original(input))),
        ),
    )
    renderSettings()
    await screen.findByRole('status')
    type(KEY)
    fireEvent.click(saveButton())
    await screen.findByRole('button', { name: 'Checking…' })
    fireEvent.click(saveButton())
    fireEvent.click(saveButton())
    expect(ai.current.api.saveKey).toHaveBeenCalledTimes(1)
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    await act(async () => finish())
    await screen.findByText('Key saved')
  })

  it('keeps what was typed when the server refuses, so it can be corrected and retried', async () => {
    ai.current.state.saveError = new ApiRequestError(400, 'invalid_ai_key', 'bad')
    renderSettings()
    await screen.findByRole('status')
    type(KEY)
    fireEvent.click(saveButton())
    await screen.findByRole('alert')
    expect(keyField().value).toBe(KEY)
    ai.current.state.saveError = null
    fireEvent.click(saveButton())
    await screen.findByText('Key saved')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each([
    ['a network error', new ApiRequestError(null, 'network_error', 'offline')],
    ['a server error', new ApiRequestError(500, 'internal_error', 'boom')],
    ['a rate limit', new ApiRequestError(429, 'rate_limited', 'slow down')],
    [
      'an HTML error page',
      new ApiRequestError(502, 'http_error', 'The server answered with status 502'),
    ],
    ['an unknown error code', new ApiRequestError(418, 'teapot', 'I am a teapot')],
  ])('shows a message for %s and stays usable', async (_, error) => {
    ai.current.state.saveError = error
    renderSettings()
    await screen.findByRole('status')
    type(KEY)
    fireEvent.click(saveButton())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent!.length).toBeGreaterThan(3)
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows an error when removing the key fails, and keeps the key listed', async () => {
    ai.current.state.ownKey = { hint: '…5p6Q', model: 'gemini-flash-latest' }
    ai.current.api.removeKey = async () => {
      throw new ApiRequestError(null, 'network_error', 'offline')
    }
    renderSettings()
    await screen.findByText(/Your key …5p6Q is saved/)
    fireEvent.click(screen.getByRole('button', { name: 'Remove key' }))
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
    expect(screen.getByText(/Your key …5p6Q is saved/)).toBeDefined()
    expect((screen.getByRole('button', { name: 'Remove key' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
    expect(screen.queryByText('Key removed')).toBeNull()
  })

  it('disables "Remove key" while it is being removed (no double delete)', async () => {
    ai.current.state.ownKey = { hint: '…5p6Q', model: 'gemini-flash-latest' }
    let finish!: () => void
    const original = ai.current.api.removeKey
    ai.current.api.removeKey = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<typeof original>>>(
          (resolve) => (finish = () => resolve(original())),
        ),
    )
    renderSettings()
    await screen.findByText(/Your key …5p6Q is saved/)
    const remove = screen.getByRole('button', { name: 'Remove key' }) as HTMLButtonElement
    fireEvent.click(remove)
    await waitFor(() => expect(remove.disabled).toBe(true))
    fireEvent.click(remove)
    expect(ai.current.api.removeKey).toHaveBeenCalledTimes(1)
    await act(async () => finish())
    await screen.findByText('Key removed')
  })

  it('clears the "saved" note when the next attempt starts', async () => {
    renderSettings()
    await screen.findByRole('status')
    type(KEY)
    fireEvent.click(saveButton())
    await screen.findByText('Key saved')
    ai.current.state.saveError = new ApiRequestError(400, 'invalid_ai_key', 'bad')
    type(KEY)
    fireEvent.click(saveButton())
    await screen.findByRole('alert')
    expect(screen.queryByText('Key saved')).toBeNull()
  })

  it('shows the model of the saved key and sends the model that is chosen', async () => {
    ai.current.state.ownKey = { hint: '…5p6Q', model: 'gemini-flash-lite-latest' }
    renderSettings()
    await screen.findByText(/Your key …5p6Q is saved/)
    expect((screen.getByRole('radio', { name: /Flash-Lite/ }) as HTMLInputElement).checked).toBe(
      true,
    )
    fireEvent.click(screen.getByRole('radio', { name: /^Flash \(recommended\)/ }))
    type(KEY)
    fireEvent.click(saveButton())
    await screen.findByText('Key saved')
    expect(savedRequests().at(-1)).toMatchObject({ model: 'gemini-flash-latest' })
  })

  it('never puts the key back into the page after saving, only its last characters', async () => {
    renderSettings()
    await screen.findByRole('status')
    type(KEY)
    fireEvent.click(saveButton())
    await screen.findByText('Key saved')
    expect(document.body.textContent).not.toContain(KEY)
    expect(screen.queryByDisplayValue(KEY)).toBeNull()
    expect(screen.getByText(/…5p6Q/)).toBeDefined()
  })

  it('mentions the shared server key, or no key, depending on the account', async () => {
    ai.current.state.enabled = false
    renderSettings()
    expect((await screen.findByRole('status')).textContent).toMatch(/no key|not set|add/i)
  })

  it('still shows the form when the status cannot be loaded', async () => {
    ai.current.api.status = async () => {
      throw new ApiRequestError(null, 'network_error', 'offline')
    }
    renderSettings()
    await waitFor(() => expect(keyField()).toBeDefined())
    expect(screen.queryByText(/is saved and used/)).toBeNull()
    type(KEY)
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false)
  })
})
