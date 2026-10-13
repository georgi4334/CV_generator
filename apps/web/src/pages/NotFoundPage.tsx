import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="text-teal-700 hover:underline dark:text-teal-300">
        Back to the dashboard
      </Link>
    </div>
  )
}
