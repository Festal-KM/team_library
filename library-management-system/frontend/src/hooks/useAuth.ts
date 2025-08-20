import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';

export function useAuth() {
  const authStore = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 認証状態が初期化されるまで待機
    if (authStore.isInitialized && authStore.isHydrated) {
      setIsReady(true);
    }
  }, [authStore.isInitialized, authStore.isHydrated]);

  return {
    ...authStore,
    isReady,
  };
}

export function useRequireAuth() {
  const auth = useAuth();
  
  return {
    ...auth,
    isAuthenticated: auth.isReady && auth.isAuthenticated,
    user: auth.isReady ? auth.user : null,
  };
} 