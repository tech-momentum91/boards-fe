import * as React from 'react';
import {
  RiAlertFill,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiInformationFill,
  RiMagicFill,
} from 'react-icons/ri';

import * as Alert from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';

const AlertToast = React.forwardRef((props, forwardedRef) => {
  const { t, status = 'feature', variant = 'stroke', message, dismissable = true, icon } = props;

  let Icon;

  if (icon) {
    Icon = icon;
  } else {
    switch (status) {
      case 'success':
        Icon = RiCheckboxCircleFill;
        break;
      case 'warning':
        Icon = RiAlertFill;
        break;
      case 'error':
        Icon = RiErrorWarningFill;
        break;
      case 'information':
        Icon = RiInformationFill;
        break;
      case 'feature':
        Icon = RiMagicFill;
        break;
      default:
        Icon = RiErrorWarningFill;
        break;
    }
  }

  return (
    <Alert.Root
      ref={forwardedRef}
      status={status}
      variant={variant}
      size='small'
      className='w-[min(500px,calc(100vw-2rem))] max-w-full'
    >
      <div className='flex w-full min-w-0 items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center justify-start gap-2'>
          <Alert.Icon as={Icon} className='shrink-0' />
          <span className='min-w-0 break-words'>{message}</span>
        </div>

        <div className='flex shrink-0 items-center justify-end'>
          {dismissable && (
            <button
              type='button'
              onClick={() => toast.dismiss(t)}
              className='shrink-0 p-0.5 text-current'
              aria-label='Dismiss'
            >
              <Alert.CloseIcon />
            </button>
          )}
        </div>
      </div>
    </Alert.Root>
  );
});

AlertToast.displayName = 'AlertToast';

export { AlertToast as Root };
