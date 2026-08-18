// AlignUI Toast v0.0.0

import { toast as sonnerToast, Toaster, type ExternalToast } from 'sonner';
import type { ReactElement } from 'react';

const defaultOptions: ExternalToast = {
  className: 'group/toast',
  position: 'top-right',
};

const customToast = (
  renderFunc: (id: string | number) => ReactElement,
  options: ExternalToast = {},
) => {
  const mergedOptions = { ...defaultOptions, ...options };
  return sonnerToast.custom(renderFunc, mergedOptions);
};

const toast = {
  ...sonnerToast,
  custom: customToast,
};

export { toast, Toaster };
