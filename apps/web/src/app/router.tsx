import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { AppLayout } from './layouts/AppLayout'
import { RootLayout } from './layouts/RootLayout'
import {
  DashboardPage,
  DocumentsPage,
  EditorPage,
  JobsPage,
  NewCvPage,
  NewLetterPage,
  NewResignationPage,
  PreviewPage,
  PrivacyPage,
  SharedDocumentPage,
  TermsPage,
  WelcomePage,
} from './lazyPages'
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
              { path: 'resignations/new', element: <NewResignationPage /> },
              // Account settings live in the account drawer; old links open it there.
              { path: 'account', element: <Navigate to="/?menu=account" replace /> },
            ],
          },
          // Old address of "Create new CV".
          { path: 'cvs/new/edit', element: <Navigate to="/cvs/new" replace /> },
          { path: 'cover-letters/new/edit', element: <Navigate to="/cover-letters/new" replace /> },
          { path: 'cvs/:id/edit', element: <EditorPage type="cv" /> },
          { path: 'cvs/:id/preview', element: <PreviewPage type="cv" /> },
          { path: 'cover-letters/:id/edit', element: <EditorPage type="coverLetter" /> },
          { path: 'cover-letters/:id/preview', element: <PreviewPage type="coverLetter" /> },
          { path: 'resignations/new/edit', element: <Navigate to="/resignations/new" replace /> },
          { path: 'resignations/:id/edit', element: <EditorPage type="resignation" /> },
          { path: 'resignations/:id/preview', element: <PreviewPage type="resignation" /> },
        ],
      },
      // Public pages.
      { path: 'welcome', element: <WelcomePage /> },
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
