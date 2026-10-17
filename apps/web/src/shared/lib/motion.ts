const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Whether an exit animation can play before something is removed: not in
 * tests (no Web Animations), not for people who prefer reduced motion.
 */
export const canAnimate = () =>
  typeof Element.prototype.getAnimations === 'function' && !reducedMotion()
