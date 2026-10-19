import { AI_MODELS, DEFAULT_AI_MODEL, type AiModel } from '@cv/shared'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FormError } from '@/features/auth/components/AuthShell'
import { field } from '@/features/auth/components/authStyles'
import { useAiStatus, useRemoveAiKey, useSaveAiKey } from '@/features/ai/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { primaryButton, secondaryButton } from '@/shared/ui/PageHeader'

const GET_KEY_URL = 'https://aistudio.google.com/apikey'

const MODEL_LABELS: Record<AiModel, 'ai.key.modelFlash' | 'ai.key.modelFlashLite'> = {
  'gemini-flash-latest': 'ai.key.modelFlash',
  'gemini-flash-lite-latest': 'ai.key.modelFlashLite',
}

/**
 * The account drawer's "AI key" view: each person adds their own free Google Gemini key, so the
 * AI features run on their quota. The server checks the key with Google, stores it encrypted and
 * never sends it back; the page only ever shows its last characters.
 */
export function AiKeySettings() {
  const { t } = useTranslation()
  const status = useAiStatus()
  const save = useSaveAiKey()
  const remove = useRemoveAiKey()
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<AiModel | null>(null)
  const [done, setDone] = useState<'saved' | 'removed' | null>(null)

  const own = status.data?.keySource === 'own'
  const chosen = model ?? (own ? status.data!.model : DEFAULT_AI_MODEL)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setDone(null)
    save.mutate(
      { apiKey, model: chosen },
      {
        onSuccess: () => {
          setApiKey('')
          setModel(null)
          setDone('saved')
        },
      },
    )
  }

  let summary: string | null = null
  if (status.data) {
    summary = own
      ? t('ai.key.current', { hint: status.data.keyHint })
      : status.data.keySource === 'server'
        ? t('ai.key.server')
        : t('ai.key.none')
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-fg-soft">{t('ai.key.intro')}</p>
      <p className="text-sm">
        <a href={GET_KEY_URL} target="_blank" rel="noreferrer noopener" className="link">
          {t('ai.key.getKey')}
        </a>
      </p>

      {summary && (
        <p role="status" className="rounded-control border border-line p-3 text-sm">
          {summary}
        </p>
      )}

      <form onSubmit={submit} className="space-y-4" aria-label={t('ai.key.title')}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('ai.key.field')}</span>
          <input
            type="password"
            name="gemini-api-key"
            autoComplete="off"
            spellCheck={false}
            required
            minLength={20}
            maxLength={200}
            placeholder="AIza…"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={field}
          />
          {own && <span className="text-xs text-fg-muted">{t('ai.key.replaceHint')}</span>}
        </label>

        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">{t('ai.key.model')}</legend>
          {AI_MODELS.map((option) => (
            <label key={option} className="flex items-center gap-2 py-1 text-sm">
              <input
                type="radio"
                name="gemini-model"
                value={option}
                checked={option === chosen}
                onChange={() => setModel(option)}
              />
              {t(MODEL_LABELS[option])}
            </label>
          ))}
        </fieldset>

        <FormError
          message={
            save.isError
              ? errorMessage(save.error)
              : remove.isError
                ? errorMessage(remove.error)
                : null
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={save.isPending} className={primaryButton}>
            {save.isPending ? t('ai.key.checking') : t('ai.key.save')}
          </button>
          {own && (
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => {
                setDone(null)
                remove.mutate(undefined, { onSuccess: () => setDone('removed') })
              }}
              className={secondaryButton}
            >
              {t('ai.key.remove')}
            </button>
          )}
          {done && (
            <span role="status" className="text-sm text-fg-muted">
              {done === 'saved' ? t('ai.key.saved') : t('ai.key.removed')}
            </span>
          )}
        </div>
      </form>

      <p className="text-xs text-fg-muted">{t('ai.key.privacy')}</p>
    </div>
  )
}
