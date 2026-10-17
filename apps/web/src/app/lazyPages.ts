import { lazyPage } from '@/shared/lib/lazyPage'

// Pages behind sign-in and the public shared page; split from the main bundle.
export const DashboardPage = lazyPage(() =>
  import('@/features/dashboard/DashboardPage').then((m) => m.DashboardPage),
)
export const DocumentsPage = lazyPage(() =>
  import('@/features/documents/DocumentsPage').then((m) => m.DocumentsPage),
)
export const JobsPage = lazyPage(() => import('@/features/jobs/JobsPage').then((m) => m.JobsPage))
export const NewCvPage = lazyPage(() =>
  import('@/features/new-cv/NewCvPage').then((m) => m.NewCvPage),
)
export const NewLetterPage = lazyPage(() =>
  import('@/features/cover-letters/pages/NewLetterPage').then((m) => m.NewLetterPage),
)
export const EditorPage = lazyPage(() =>
  import('@/features/cv-editor/pages/EditorPage').then((m) => m.EditorPage),
)
export const PreviewPage = lazyPage(() =>
  import('@/features/cv-editor/pages/PreviewPage').then((m) => m.PreviewPage),
)
export const SharedDocumentPage = lazyPage(() =>
  import('@/features/share/SharedDocumentPage').then((m) => m.SharedDocumentPage),
)
export const WelcomePage = lazyPage(() =>
  import('@/features/welcome/WelcomePage').then((m) => m.WelcomePage),
)
export const PrintHost = lazyPage(() =>
  import('@/features/print/PrintHost').then((m) => m.PrintHost),
)
export const PrivacyPage = lazyPage(() =>
  import('@/features/legal/PrivacyPage').then((m) => m.PrivacyPage),
)
export const TermsPage = lazyPage(() =>
  import('@/features/legal/TermsPage').then((m) => m.TermsPage),
)
