import { toApiRequestError, type ApiRequestError } from '@/shared/api/client'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error' | 'conflict'

export interface SaveState {
  status: SaveStatus
  lastSavedAt: Date | null
  error: ApiRequestError | null
}

/** What a save returns: the stored document with its new revision (a CV or a cover letter). */
interface SavedRecord<TDocument> {
  revision: number
  document: TDocument
  updatedAt: string
}

interface AutosaveOptions<TDocument, TRecord extends SavedRecord<TDocument>> {
  save: (document: TDocument, revision: number) => Promise<TRecord>
  onState: (state: SaveState) => void
  onSaved?: (record: TRecord) => void
  /** Quiet time after the last change before saving. */
  delayMs?: number
  /** Waits between retries after a network or server error. */
  retryDelaysMs?: number[]
}

/**
 * Saves a document (CV or cover letter) in the background. Changes are debounced, at most one save is
 * in flight, every save carries the revision it is based on, failed saves are
 * retried with backoff, and a conflict (another tab saved first) stops saving
 * until the user decides what to do.
 */
export class AutosaveController<TDocument, TRecord extends SavedRecord<TDocument>> {
  private revision = 0
  private savedDocument: TDocument | null = null
  private latestDocument: TDocument | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private inFlight: Promise<void> | null = null
  private attempt = 0
  private state: SaveState = { status: 'saved', lastSavedAt: null, error: null }
  private disposed = false

  constructor(private readonly options: AutosaveOptions<TDocument, TRecord>) {}

  /** (Re)start from a record loaded from the server. */
  start(record: TRecord) {
    this.clearTimer()
    this.revision = record.revision
    this.savedDocument = record.document
    this.latestDocument = record.document
    this.attempt = 0
    this.setState({ status: 'saved', lastSavedAt: new Date(record.updatedAt), error: null })
  }

  /** Call with the editor's document whenever it changes. */
  change(document: TDocument) {
    this.latestDocument = document
    if (this.state.status === 'conflict') return
    if (document === this.savedDocument && !this.inFlight) {
      this.clearTimer()
      this.setState({ ...this.state, status: 'saved', error: null })
      return
    }
    this.setState({ ...this.state, status: this.inFlight ? 'saving' : 'pending' })
    this.schedule(this.options.delayMs ?? 1000)
  }

  hasUnsavedChanges(): boolean {
    return this.latestDocument !== this.savedDocument
  }

  /** Saves now and resolves once everything is saved (false if it could not be). */
  async flush(): Promise<boolean> {
    this.clearTimer()
    while (!this.disposed) {
      if (this.inFlight) {
        await this.inFlight
        continue
      }
      if (!this.hasUnsavedChanges()) return true
      if (this.state.status === 'conflict') return false
      const before = this.attempt
      await this.run()
      if (this.state.status === 'error' && this.attempt > before) return false
    }
    return !this.hasUnsavedChanges()
  }

  /** After a conflict: overwrite the server copy with this editor's document. */
  overwrite(serverRevision: number) {
    this.revision = serverRevision
    this.attempt = 0
    this.setState({ ...this.state, status: 'pending', error: null })
    this.schedule(0)
  }

  /** Stops timers; a save already running finishes. */
  dispose() {
    this.disposed = true
    this.clearTimer()
  }

  private schedule(delay: number) {
    this.clearTimer()
    if (this.disposed) return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.run()
    }, delay)
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private setState(state: SaveState) {
    this.state = state
    this.options.onState(state)
  }

  private run(): Promise<void> {
    if (this.inFlight) return this.inFlight
    const document = this.latestDocument
    if (!document || document === this.savedDocument || this.state.status === 'conflict') {
      return Promise.resolve()
    }

    this.setState({ ...this.state, status: 'saving' })
    this.inFlight = this.options
      .save(document, this.revision)
      .then((record) => {
        this.revision = record.revision
        this.savedDocument = document
        this.attempt = 0
        this.options.onSaved?.(record)
        if (this.hasUnsavedChanges()) {
          this.setState({ status: 'pending', lastSavedAt: new Date(), error: null })
          this.schedule(this.options.delayMs ?? 1000)
        } else {
          this.setState({ status: 'saved', lastSavedAt: new Date(), error: null })
        }
      })
      .catch((cause: unknown) => {
        const error = toApiRequestError(cause)
        this.attempt += 1
        if (error.code === 'conflict') {
          this.setState({ ...this.state, status: 'conflict', error })
        } else {
          this.setState({ ...this.state, status: 'error', error })
          const delays = this.options.retryDelaysMs ?? [2000, 5000, 10000, 30000]
          // Only retry what can succeed later (offline, server errors).
          if (error.retryable) this.schedule(delays[Math.min(this.attempt - 1, delays.length - 1)]!)
        }
      })
      .finally(() => {
        this.inFlight = null
      })
    return this.inFlight
  }
}
