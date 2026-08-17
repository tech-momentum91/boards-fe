// AlignUI Toast v0.0.0

import { toast as sonnerToast, Toaster } from 'sonner';

const defaultOptions = {
  className: 'group/toast',
  position: 'top-right',
};

const customToast = (renderFunc, options = {}) => {
  const mergedOptions = { ...defaultOptions, ...options };
  return sonnerToast.custom(renderFunc, mergedOptions);
};

const toast = {
  ...sonnerToast,
  custom: customToast,
};

export { toast, Toaster };
