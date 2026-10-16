import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { initI18n } from './i18n'
import { initMonitoring } from './lib/monitoring'
import { queryClient } from './lib/queryClient'
import { router } from './router'
import { initTheme } from './stores/theme'

initMonitoring()
initTheme()
await initI18n()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
