/**
 * The splash screen in index.html stays at least this long, so a fast load
 * shows a calm entrance instead of a flash.
 */
const SPLASH_MIN_MS = 700
/** Longest the fade-out may take before the splash is removed anyway. */
const SPLASH_FADE_MAX_MS = 1000

/** Fades the splash screen out once the app has painted, then removes it. */
export function hideSplash() {
  const splash = document.getElementById('splash')
  if (!splash) return
  const wait = Math.max(0, SPLASH_MIN_MS - performance.now())
  setTimeout(() => {
    // Two frames: the app's first paint is on screen before the splash leaves.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        splash.classList.add('splash-hide')
        const remove = () => splash.remove()
        splash.addEventListener('transitionend', remove, { once: true })
        setTimeout(remove, SPLASH_FADE_MAX_MS)
      }),
    )
  }, wait)
}
