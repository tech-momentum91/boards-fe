// This hook has been replaced by the AuthContext
// Please use: import { useAuth } from '@/contexts/auth-context';
// This file is kept for backwards compatibility but should not be used

import { useAuth as useAuthContext } from '@/contexts/auth-context';

export const useAuth = () => {
  console.warn(
    'Using deprecated useAuth hook from hooks/useAuth.js. Please use: import { useAuth } from "@/contexts/auth-context"',
  );
  return useAuthContext();
};
