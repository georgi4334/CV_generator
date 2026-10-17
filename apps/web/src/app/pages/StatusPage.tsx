import type { ReactNode } from 'react'
import { Logo } from '@/shared/ui/Logo'

/**
 * A full-screen message on a glass card (not found, something went wrong):
 * the logo, an illustration, a title, a short text and actions.
 */
export function StatusPage({
  illustration,
  title,
  text,
  children,
}: {
  illustration: ReactNode
  title: string
  text: string
  children: ReactNode
}) {
  return (
    <div className="app-backdrop flex min-h-dvh flex-col items-center justify-center gap-section px-gutter py-section text-fg">
      {/* A plain link: it works even when the app itself is what failed. */}
      <a href="/">
        <Logo />
      </a>
      <main className="glass w-full max-w-reading space-y-4 p-card sm:p-10 text-center">
        <div className="mx-auto w-full max-w-72">{illustration}</div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-fg-muted">{text}</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">{children}</div>
      </main>
    </div>
  )
}
