import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { AccountPage } from './features/auth/AccountPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { VerifyEmailPage } from './features/auth/VerifyEmailPage'
import { EditorPage } from './features/editor/EditorPage'
import { PreviewPage } from './features/editor/PreviewPage'
import { NewLetterPage } from './features/letter/NewLetterPage'
import { NewCvPage } from './features/new-cv/NewCvPage'
import { SharedDocumentPage } from './features/share/SharedDocumentPage'
import { AppLayout } from './layouts/AppLayout'
import { RootLayout } from './layouts/RootLayout'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { JobsPage } from './pages/JobsPage'
import { NotFoundPage } from './pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      // Everything that needs an account.
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'documents', element: <Navigate to="/documents/all" replace /> },
              { path: 'documents/:subtab', element: <DocumentsPage /> },
              { path: 'jobs', element: <JobsPage /> },
              { path: 'cvs/new', element: <NewCvPage /> },
              { path: 'cover-letters/new', element: <NewLetterPage /> },
              { path: 'account', element: <AccountPage /> },
            ],
          },
          // Old address of "Create new CV".
          { path: 'cvs/new/edit', element: <Navigate to="/cvs/new" replace /> },
          { path: 'cover-letters/new/edit', element: <Navigate to="/cover-letters/new" replace /> },
          { path: 'cvs/:id/edit', element: <EditorPage type="cv" /> },
          { path: 'cvs/:id/preview', element: <PreviewPage type="cv" /> },
          { path: 'cover-letters/:id/edit', element: <EditorPage type="coverLetter" /> },
          { path: 'cover-letters/:id/preview', element: <PreviewPage type="coverLetter" /> },
        ],
      },
      // Public pages.
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      // Public, read-only: a CV or cover letter someone shared.
      { path: 's/:slug', element: <SharedDocumentPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
