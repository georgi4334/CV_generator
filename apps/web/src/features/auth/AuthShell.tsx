import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { card } from '../../components/PageHeader'

/** The centered card around sign-in, sign-up and password pages. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
        <FileText className="size-6 text-teal-600 dark:text-teal-400" /> CV Generator
      </Link>
      <main className={`${card} w-full max-w-sm p-6`}>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
        <div className="mt-5">{children}</div>
      </main>
      {footer && <p className="text-sm text-slate-600 dark:text-slate-300">{footer}</p>}
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  )
}
