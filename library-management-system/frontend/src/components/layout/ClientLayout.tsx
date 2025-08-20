'use client';

import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/layout/Header';
import NotificationSystem from '@/components/ui/NotificationSystem';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  
  // ログインページは認証不要なので、AuthGuardの外で表示
  const isLoginPage = pathname === '/login';
  
  if (isLoginPage) {
    return (
      <>
        {children}
        <NotificationSystem />
      </>
    );
  }

  // その他のページはAuthGuardで保護
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pb-8">
          {children}
        </main>
        <footer className="bg-white border-t border-gray-200 py-8">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>&copy; 2024 社内図書館管理システム. All rights reserved.</p>
          </div>
        </footer>
        <NotificationSystem />
      </div>
    </AuthGuard>
  );
} 