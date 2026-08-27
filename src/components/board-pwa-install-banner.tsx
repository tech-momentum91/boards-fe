import { useEffect, useState } from 'react';
import { RiCloseLine, RiDownloadLine, RiShareLine } from 'react-icons/ri';
import { useAuth } from '@/contexts/auth-context';
import {
  dismissBoardPwaInstall,
  isBoardPwaStandalone,
  isIosSafari,
  listenForBoardPwaInstall,
  onBoardPwaDeferredPrompt,
  promptBoardPwaInstall,
  registerBoardServiceWorker,
  wasBoardPwaInstallDismissed,
} from '@/services/board-pwa';
import { showSuccessToast } from '@/utils/error-utils';

/**
 * Prompt to install Boards as a PWA / Add to Home Screen.
 * Required on iOS Safari for background Web Push; optional but useful elsewhere.
 */
export default function BoardPwaInstallBanner() {
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState(null); // 'chrome' | 'ios'
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    registerBoardServiceWorker();
    return listenForBoardPwaInstall();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setVisible(false);
      return undefined;
    }
    if (isBoardPwaStandalone() || wasBoardPwaInstallDismissed()) {
      setVisible(false);
      return undefined;
    }

    if (isIosSafari()) {
      setMode('ios');
      setVisible(true);
      return undefined;
    }

    const unsub = onBoardPwaDeferredPrompt(() => {
      setMode('chrome');
      setVisible(true);
    });
    return unsub;
  }, [isAuthenticated]);

  if (!visible || !mode) return null;

  const dismiss = () => {
    dismissBoardPwaInstall();
    setVisible(false);
  };

  const handleInstall = async () => {
    if (busy || mode !== 'chrome') return;
    setBusy(true);
    const result = await promptBoardPwaInstall();
    setBusy(false);
    if (result.outcome === 'accepted') {
      setVisible(false);
      showSuccessToast('Boards installed');
      return;
    }
    if (result.outcome === 'dismissed') {
      return;
    }
    dismiss();
  };

  return (
    <div className='pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-3.5 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.2)]'>
      <span className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-alpha-10 text-primary-base'>
        {mode === 'ios' ? <RiShareLine size={18} /> : <RiDownloadLine size={18} />}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-medium text-text-main-900'>Install Boards</p>
        <p className='mt-0.5 text-[13px] leading-5 text-text-sub-600'>
          {mode === 'ios' ? (
            <>
              On iPhone, open Share{' '}
              <span className='inline-flex align-text-bottom text-primary-base' aria-hidden>
                <RiShareLine size={14} />
              </span>{' '}
              then <strong className='font-medium text-text-main-900'>Add to Home Screen</strong>.
              Notifications only work after Boards is installed.
            </>
          ) : (
            <>
              Install Boards for faster access and background notifications when the tab is closed.
            </>
          )}
        </p>
        <div className='mt-2.5 flex flex-wrap items-center gap-2'>
          {mode === 'chrome' ? (
            <button
              type='button'
              disabled={busy}
              onClick={handleInstall}
              className='rounded-lg bg-primary-base px-3 py-1.5 text-[13px] font-medium text-static-white transition hover:opacity-90 disabled:opacity-50'
            >
              {busy ? 'Installing…' : 'Install'}
            </button>
          ) : null}
          <button
            type='button'
            disabled={busy}
            onClick={dismiss}
            className='rounded-lg px-3 py-1.5 text-[13px] font-medium text-text-sub-600 transition hover:bg-bg-weak-50 disabled:opacity-50'
          >
            {mode === 'ios' ? 'Got it' : 'Not now'}
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
  );
}
