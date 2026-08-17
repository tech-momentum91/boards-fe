import React from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/route-protection/protected-route';
import RootRedirect from '@/route-protection/root-redirect';

const Login = React.lazy(() => import('@/pages/auth/login'));
const ResetPassword = React.lazy(() => import('@/pages/auth/reset-password'));
const CreatePassword = React.lazy(() => import('@/pages/auth/create-password'));
const PasswordSuccess = React.lazy(() => import('@/pages/auth/password-success'));
const EmailSent = React.lazy(() => import('@/pages/auth/email-sent'));
const BoardsPage = React.lazy(() => import('@/pages/boards'));
const BoardNoAccessPage = React.lazy(() => import('@/pages/boards/BoardNoAccessPage'));
const PublicTaskPage = React.lazy(() => import('@/pages/public/public-task-page'));

const protectedBoardsRoute = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

const routes = [
  { path: '/', element: <RootRedirect /> },
  {
    path: '/login',
    element: (
      <ProtectedRoute requireAuth={false}>
        <Login />
      </ProtectedRoute>
    ),
  },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/update-password', element: <CreatePassword /> },
  { path: '/password-success', element: <PasswordSuccess /> },
  { path: '/email-sent', element: <EmailSent /> },
  { path: '/public/task/:taskId', element: <PublicTaskPage /> },
  { path: '/boards', element: protectedBoardsRoute(<BoardsPage />) },
  { path: '/boards/no-access', element: protectedBoardsRoute(<BoardNoAccessPage />) },
  {
    path: '/boards/space/:spaceId/list/:listId',
    element: protectedBoardsRoute(<BoardsPage />),
  },
  {
    path: '/boards/space/:spaceId/folder/:folderId/list/:listId',
    element: protectedBoardsRoute(<BoardsPage />),
  },
  {
    path: '/boards/space/:spaceId/folder/:folderId',
    element: protectedBoardsRoute(<BoardsPage />),
  },
  { path: '/boards/space/:spaceId', element: protectedBoardsRoute(<BoardsPage />) },
  { path: '/boards/list/:listId', element: protectedBoardsRoute(<BoardsPage />) },
  { path: '*', element: <Navigate to='/' replace /> },
];

export default routes;
