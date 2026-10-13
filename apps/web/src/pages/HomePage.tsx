import { ApiStatus } from '../components/ApiStatus'
import { useHealth } from '../lib/useHealth'

export function HomePage() {
  const health = useHealth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900">
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">CV Generator</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Project setup complete. The app shell comes in Step 3.
      </p>
      <ApiStatus isLoading={health.isLoading} isError={health.isError} data={health.data} />
    </main>
  )
}
