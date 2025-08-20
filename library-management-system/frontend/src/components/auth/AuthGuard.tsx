'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

// 認証が不要なページのパス
const PUBLIC_PATHS = ['/login', '/register'];

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized, isHydrated, setInitialized, setHydrated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // 初期化の完了を待つ
    const initializeAuth = async () => {
      // Zustandの永続化が完了するまで待機
      let attempts = 0;
      const maxAttempts = 50; // 最大5秒待機
      
      while (attempts < maxAttempts && (!isInitialized || !isHydrated)) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        
        // 強制的に初期化フラグを設定
        if (attempts > 10 && !isInitialized) {
          setInitialized();
        }
        if (attempts > 10 && !isHydrated) {
          setHydrated();
        }
      }
      
      // 最終的に初期化完了とする
      if (!isInitialized) setInitialized();
      if (!isHydrated) setHydrated();
      
      setIsLoading(false);
    };

    initializeAuth();
  }, [isInitialized, isHydrated, setInitialized, setHydrated]);

  useEffect(() => {
    // 初期化が完了してからリダイレクト処理を実行
    if (!isLoading && isInitialized && isHydrated && !hasRedirected) {
      const isPublicPath = PUBLIC_PATHS.includes(pathname);
      
      if (!isAuthenticated && !isPublicPath) {
        // 未認証でプライベートページにアクセスした場合
        console.log('Redirecting to login: not authenticated');
        setHasRedirected(true);
        router.push('/login');
      } else if (isAuthenticated && pathname === '/login') {
        // 認証済みでログインページにアクセスした場合
        console.log('Redirecting to home: already authenticated');
        setHasRedirected(true);
        router.push('/');
      }
    }
  }, [isLoading, isInitialized, isHydrated, isAuthenticated, pathname, router, hasRedirected]);

  // パス変更時にリダイレクトフラグをリセット
  useEffect(() => {
    setHasRedirected(false);
  }, [pathname]);

  // 初期化中はローディング表示
  if (isLoading || !isInitialized || !isHydrated) {
    return <LoadingSpinner />;
  }

  // 未認証でプライベートページにアクセスした場合は何も表示しない
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  if (!isAuthenticated && !isPublicPath) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
} 