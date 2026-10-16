import { lazyPage } from '../lib/lazyPage'

// Pages behind sign-in and the public shared page; split from the main bundle.
export const DashboardPage = lazyPage(() => import('./DashboardPage').then((m) => m.DashboardPage))
export const DocumentsPage = lazyPage(() => import('./DocumentsPage').then((m) => m.DocumentsPage))
export const JobsPage = lazyPage(() => import('./JobsPage').then((m) => m.JobsPage))
export const NewCvPage = lazyPage(() =>
  import('../features/new-cv/NewCvPage').then((m) => m.NewCvPage),
)
export const NewLetterPage = lazyPage(() =>
  import('../features/letter/NewLetterPage').then((m) => m.NewLetterPage),
)
export const AccountPage = lazyPage(() =>
  import('../features/auth/AccountPage').then((m) => m.AccountPage),
)
export const EditorPage = lazyPage(() =>
  import('../features/editor/EditorPage').then((m) => m.EditorPage),
)
export const PreviewPage = lazyPage(() =>
  import('../features/editor/PreviewPage').then((m) => m.PreviewPage),
)
export const SharedDocumentPage = lazyPage(() =>
  import('../features/share/SharedDocumentPage').then((m) => m.SharedDocumentPage),
)
export const PrintHost = lazyPage(() =>
  import('../features/print/PrintHost').then((m) => m.PrintHost),
)
export const PrivacyPage = lazyPage(() => import('./legal/PrivacyPage').then((m) => m.PrivacyPage))
export const TermsPage = lazyPage(() => import('./legal/TermsPage').then((m) => m.TermsPage))
