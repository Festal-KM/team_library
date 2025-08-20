'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'approver' | 'user';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requiredRole && user && !hasRequiredRole(user.role, requiredRole)) {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, user, isInitialized, requiredRole, router]);

  // ロール階層をチェック
  const hasRequiredRole = (userRole: string, required: string): boolean => {
    const roleHierarchy = {
      admin: 3,
      approver: 2,
      user: 1,
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[required as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  };

  // ローディング中
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 認証されていない場合
  if (!isAuthenticated) {
    return null; // useEffectでリダイレクトされる
  }

  // 権限が不足している場合
  if (requiredRole && user && !hasRequiredRole(user.role, requiredRole)) {
    return null; // useEffectでリダイレクトされる
  }

  return <>{children}</>;
} 