import { useEffect, useState } from 'react';
import { RiCloseLine, RiNotification3Line } from 'react-icons/ri';
import { useAuth } from '@/contexts/auth-context';
import { ensureBoardPushSubscription, getBoardPushPermission } from '@/services/board-push';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const DISMISS_KEY = 'boards.pushPrompt.dismissed';

/**
 * Soft prompt for browser notification permission.
 * Native Notification.requestPermission() only works from a user click —
 * browsers ignore auto-prompts after login.
 */
export default function BoardPushPermissionBanner() {
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setVisible(false);
      return;
    }
    if (getBoardPushPermission() !== 'default') {
      setVisible(false);
      return;
    }
    if (typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === '1') {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [isAuthenticated]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore quota */
    }
    setVisible(false);
  };

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    const result = await ensureBoardPushSubscription();
    setBusy(false);

    if (result?.success) {
      try {
        window.localStorage.removeItem(DISMISS_KEY);
      } catch {
        /* ignore */
      }
      setVisible(false);
      showSuccessToast('Browser notifications enabled');
      return;
    }

    if (result?.reason === 'denied') {
      dismiss();
      showErrorToast('Notifications are blocked. Enable them for this site in browser settings.');
      return;
    }
    if (result?.reason === 'dismissed') {
      // User closed the native dialog — keep banner so they can try again,
      // but don't force it every reload if they keep dismissing.
      return;
    }
    if (result?.reason === 'no_vapid') {
      showErrorToast('Push is not configured on the server.');
      return;
    }
    if (result?.reason === 'unsupported') {
      dismiss();
      showErrorToast('This browser does not support push notifications.');
      return;
    }
    if (result?.error) {
      showErrorToast(result.error);
    }
  };

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4'>
      <div className='pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-3.5 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.2)]'>
        <span className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-alpha-10 text-primary-base'>
          <RiNotification3Line size={18} />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-medium text-text-main-900'>Turn on notifications</p>
          <p className='mt-0.5 text-[13px] leading-5 text-text-sub-600'>
            Get alerts for mentions, assignments, and updates — even when Boards is in the
            background.
          </p>
          <div className='mt-2.5 flex flex-wrap items-center gap-2'>
            <button
              type='button'
              disabled={busy}
              onClick={handleEnable}
              className='rounded-lg bg-primary-base px-3 py-1.5 text-[13px] font-medium text-static-white transition hover:opacity-90 disabled:opacity-50'
            >
              {busy ? 'Enabling…' : 'Enable'}
            </button>
            <button
              type='button'
              disabled={busy}
              onClick={dismiss}
              className='rounded-lg px-3 py-1.5 text-[13px] font-medium text-text-sub-600 transition hover:bg-bg-weak-50 disabled:opacity-50'
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type='button'
          aria-label='Dismiss'
          disabled={busy}
          onClick={dismiss}
          className='rounded-md p-1 text-icon-sub-500 transition hover:bg-bg-weak-50 hover:text-text-main-900 disabled:opacity-50'
        >
          <RiCloseLine size={16} />
        </button>
      </div>
    </div>
  );
}
