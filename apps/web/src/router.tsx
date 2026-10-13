import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { EditorPage } from './features/editor/EditorPage'
import { PreviewPage } from './features/editor/PreviewPage'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { JobsPage } from './pages/JobsPage'
import { NotFoundPage } from './pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'documents', element: <Navigate to="/documents/all" replace /> },
      { path: 'documents/:subtab', element: <DocumentsPage /> },
      { path: 'jobs', element: <JobsPage /> },
    ],
  },
  { path: 'cvs/:id/edit', element: <EditorPage type="cv" /> },
  { path: 'cvs/:id/preview', element: <PreviewPage type="cv" /> },
  { path: 'cover-letters/:id/edit', element: <EditorPage type="coverLetter" /> },
  { path: 'cover-letters/:id/preview', element: <PreviewPage type="coverLetter" /> },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
