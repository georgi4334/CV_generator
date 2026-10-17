import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// The DOM build of RouterProvider: navigations can flush synchronously (needed for view transitions).
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { initI18n } from '@/i18n'
import { startLocaleSync } from '@/features/auth/localeSync'
import { initMonitoring } from '@/shared/lib/monitoring'
import { queryClient } from '@/shared/api/queryClient'
import { router } from './router'
import { initTheme } from '@/shared/stores/theme'
import { hideSplash } from '@/shared/lib/splash'

initMonitoring()
initTheme()
await initI18n()
startLocaleSync(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
hideSplash()
