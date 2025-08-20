'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // デフォルトのキャッシュ設定
        staleTime: 5 * 60 * 1000, // 5分間はデータを新鮮とみなす
        gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
        retry: (failureCount, error: any) => {
          // 認証エラーの場合はリトライしない
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            return false;
          }
          // その他のエラーは最大2回リトライ
          return failureCount < 2;
        },
        refetchOnWindowFocus: false, // ウィンドウフォーカス時の自動再取得を無効
        refetchOnMount: true, // マウント時は再取得
        refetchOnReconnect: true, // 再接続時は再取得
      },
      mutations: {
        retry: (failureCount, error: any) => {
          // 認証エラーやクライアントエラーの場合はリトライしない
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false;
          }
          // サーバーエラーの場合は1回リトライ
          return failureCount < 1;
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 開発環境でのみReact Query Devtoolsを表示 */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
} 