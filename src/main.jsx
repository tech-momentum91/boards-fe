import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toast';
import routes from './routes';
import { TooltipProvider } from '@radix-ui/react-tooltip';

/**
 * Loading fallback component for lazy-loaded routes
 */
const LoadingFallback = () => (
  <div className='h-screen w-full flex items-center justify-center bg-(--color-bg-weak-50)'>
    <div className='flex flex-col items-center gap-4'>
      <div className='w-8 h-8 border-4 border-(--color-primary-base) border-t-transparent rounded-full animate-spin' />
      <p className='text-(--color-text-sub-500)'>Loading...</p>
    </div>
  </div>
);

/**
 * App component that renders routes using useRoutes hook
 */
function AppRoutes() {
  const element = useRoutes(routes);
  return element;
}

function Root() {
  return (
    <Provider store={store}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LoadingFallback />}>
              <AppRoutes />
            </Suspense>
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </Provider>
  );
}

// Store root instance to prevent recreation on hot reload
const container = document.querySelector('#root');
let root = window.__reactRoot;

if (!root) {
  root = ReactDOM.createRoot(container);
  window.__reactRoot = root;
}

root.render(<Root />);
