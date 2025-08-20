import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  department: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isHydrated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setInitialized: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: false,
      isHydrated: false,
      
      login: (user: User, accessToken: string, refreshToken: string) => {
        // ローカルストレージにもトークンを保存（APIクライアント用）
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
        }
        
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isInitialized: true,
          isHydrated: true
        });
      },
      
      logout: () => {
        // ローカルストレージからトークンを削除
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isInitialized: true,
          isHydrated: true
        });
      },
      
      updateUser: (user: User) => {
        set({ user });
      },

      setInitialized: () => {
        set({ isInitialized: true });
      },

      setHydrated: () => {
        set({ isHydrated: true });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // 永続化するデータを指定
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      }),
      // 永続化データの復元時に初期化フラグを設定
      onRehydrateStorage: () => {
        return (state: any, error: any) => {
          if (error) {
            console.error('Failed to rehydrate auth store:', error);
          }
          
          // 常にisHydratedをtrueに設定（認証データの有無に関わらず）
          setTimeout(() => {
            useAuthStore.setState({ isHydrated: true, isInitialized: true });
          }, 0);
          
          if (state) {
            // 永続化されたデータがある場合、ローカルストレージにも同期
            if (state.accessToken && typeof window !== 'undefined') {
              localStorage.setItem('access_token', state.accessToken);
            }
            if (state.refreshToken && typeof window !== 'undefined') {
              localStorage.setItem('refresh_token', state.refreshToken);
            }
          }
        };
      }
    }
  )
);

// 認証が必要なページで使用するカスタムフック
export const useRequireAuth = () => {
  const { user, isAuthenticated, isHydrated, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // ハイドレーションが完了していない場合は待機
    if (!isHydrated || !isInitialized) {
      return;
    }

    // 認証されていない場合はログインページにリダイレクト
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, user, isHydrated, isInitialized, router]);

  return {
    user,
    isAuthenticated,
    isReady: isHydrated && isInitialized
  };
}; 