/**
 * Runs `action` and returns the promise rejections nobody handled while it ran. Vitest fails a
 * run on an unhandled rejection, so a test that wants to observe one (to document a bug) has to
 * take the listeners away for a moment.
 */
export async function collectUnhandledRejections(action: () => Promise<void>): Promise<unknown[]> {
  const caught: unknown[] = []
  const saved = process.listeners('unhandledRejection')
  process.removeAllListeners('unhandledRejection')
  const record = (reason: unknown) => void caught.push(reason)
  process.on('unhandledRejection', record)
  try {
    await action()
    // Node reports unhandled rejections after the microtask queue drained.
    await new Promise((resolve) => setTimeout(resolve, 20))
  } finally {
    process.removeListener('unhandledRejection', record)
    for (const listener of saved) process.on('unhandledRejection', listener)
  }
  return caught
}
