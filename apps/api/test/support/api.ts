import { randomUUID } from 'node:crypto'
import type { useTestApp } from './context'

type Ctx = ReturnType<typeof useTestApp>
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** `call(method, url, payload?, cookie?)`: a request to /api as the default user (or `cookie`). */
export function apiCaller(ctx: Pick<Ctx, 'app' | 'cookie'>) {
  return (method: Method, url: string, payload?: object | null, cookie?: string | null) =>
    ctx.app.inject({
      method,
      url: `/api${url}`,
      payload: payload === null ? undefined : payload,
      headers: cookie === null ? {} : { cookie: cookie ?? ctx.cookie },
    })
}

/** A request with a hand-made body and content type (broken JSON, wrong types...). */
export function rawCaller(ctx: Pick<Ctx, 'app' | 'cookie'>) {
  return (
    method: Method,
    url: string,
    payload: string | Buffer | undefined,
    contentType?: string,
    cookie: string | null = ctx.cookie,
  ) =>
    ctx.app.inject({
      method,
      url: `/api${url}`,
      payload,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(contentType ? { 'content-type': contentType } : {}),
      },
    })
}

/** A well-formed id that belongs to nothing. */
export const unknownId = () => randomUUID()

/** Runs `count` async tasks at the same time. */
export const inParallel = <T>(count: number, task: (index: number) => Promise<T>) =>
  Promise.all(Array.from({ length: count }, (_, i) => task(i)))

export const countBy = <T>(items: T[], key: (item: T) => string | number) => {
  const counts: Record<string, number> = {}
  for (const item of items) counts[String(key(item))] = (counts[String(key(item))] ?? 0) + 1
  return counts
}
