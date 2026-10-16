import { lazy, type ComponentType } from 'react'

type Loader<P> = () => Promise<ComponentType<P>>

const preloaders: (() => Promise<unknown>)[] = []

/**
 * A page that is downloaded on first use, so the sign-in page stays small.
 * Once preloaded (see `preloadPages`) it renders without a loading flash: the
 * module is handed to React as an already-settled thenable.
 */
export function lazyPage<P extends object>(load: Loader<P>): ComponentType<P> {
  let loaded: { default: ComponentType<P> } | null = null
  const fetch = () => load().then((component) => (loaded = { default: component }))
  preloaders.push(fetch)
  return lazy(() =>
    loaded
      ? // A synchronous thenable: React reads it right away instead of suspending.
        ({ then: (resolve: (m: typeof loaded) => void) => resolve(loaded) } as unknown as Promise<{
          default: ComponentType<P>
        }>)
      : fetch().then(() => loaded!),
  )
}

/** Downloads every lazy page, e.g. once the signed-in app is idle (and in tests). */
export function preloadPages() {
  return Promise.all(preloaders.map((load) => load()))
}
