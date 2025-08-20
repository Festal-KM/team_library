import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';

// ダッシュボード統計情報
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: () => statsApi.getDashboardStats(),
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
    refetchInterval: 5 * 60 * 1000, // 5分ごとに自動更新
  });
};

// デバッグ用書籍ステータス
export const useDebugBookStatus = () => {
  return useQuery({
    queryKey: ['stats', 'debug', 'book-status'],
    queryFn: () => statsApi.getDebugBookStatus(),
    staleTime: 1 * 60 * 1000, // 1分間キャッシュ
    gcTime: 3 * 60 * 1000, // 3分間保持
    enabled: process.env.NODE_ENV === 'development', // 開発環境でのみ有効
  });
}; 