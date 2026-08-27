import { lazy, type ReactElement } from 'react';
import { Navigate, useParams, type RouteObject } from 'react-router-dom';
import ProtectedRoute from '@/route-protection/protected-route';
import RootRedirect from '@/route-protection/root-redirect';

const Login = lazy(() => import('@/pages/auth/login'));
const ResetPassword = lazy(() => import('@/pages/auth/reset-password'));
const CreatePassword = lazy(() => import('@/pages/auth/create-password'));
const PasswordSuccess = lazy(() => import('@/pages/auth/password-success'));
const EmailSent = lazy(() => import('@/pages/auth/email-sent'));
const BoardsPage = lazy(() => import('@/pages/boards'));
const BoardsInboxPage = lazy(() => import('@/pages/boards/inbox/BoardsInboxPage'));
const BoardsProfilePage = lazy(() => import('@/pages/profile/BoardsProfilePage'));
const BoardNoAccessPage = lazy(() => import('@/pages/boards/BoardNoAccessPage'));
const PublicTaskPage = lazy(() => import('@/pages/public/public-task-page'));

const protectedBoardsRoute = (element: ReactElement) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

function BoardsInboxLegacyRedirect() {
  const { taskId } = useParams();
  return <Navigate to={taskId ? `/inbox/${taskId}` : '/inbox'} replace />;
}

const routes: RouteObject[] = [
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
  { path: '/inbox/:taskId?', element: protectedBoardsRoute(<BoardsInboxPage />) },
  { path: '/boards/inbox/:taskId?', element: <BoardsInboxLegacyRedirect /> },
  { path: '/boards/profile', element: protectedBoardsRoute(<BoardsProfilePage />) },
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
