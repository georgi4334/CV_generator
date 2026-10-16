import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { VerifyEmailPage } from './features/auth/VerifyEmailPage'
import { AppLayout } from './layouts/AppLayout'
import { RootLayout } from './layouts/RootLayout'
import {
  AccountPage,
  DashboardPage,
  DocumentsPage,
  EditorPage,
  JobsPage,
  NewCvPage,
  NewLetterPage,
  PreviewPage,
  PrivacyPage,
  SharedDocumentPage,
  TermsPage,
} from './pages/lazyPages'
import { ErrorPage } from './pages/ErrorPage'
import { NotFoundPage } from './pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
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
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      // Public, read-only: a CV or cover letter someone shared.
      { path: 's/:slug', element: <SharedDocumentPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
