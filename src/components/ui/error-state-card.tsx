import { RiErrorWarningLine } from 'react-icons/ri';

interface ErrorStateCardProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

/**
 * Shared error state UI (rounded card, icon, title, message, optional retry).
 * Use for application error states (e.g. invalid link, load failed, not found).
 * For catching thrown errors in the tree, use ErrorBoundary instead.
 */
const ErrorStateCard = ({ title, message, onRetry }: ErrorStateCardProps) => (
  <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
    <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
      <RiErrorWarningLine className='size-6 text-error-base' />
    </div>
    <h3 className='mb-2 text-lg font-semibold text-error-darker'>{title}</h3>
    <p className='mb-4 text-sm text-error-darker/80'>{message}</p>
    {onRetry && (
      <button
        type='button'
        onClick={onRetry}
        className='rounded-lg bg-error-base px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-darker'
      >
        Try again
      </button>
    )}
  </div>
);

export default ErrorStateCard;
