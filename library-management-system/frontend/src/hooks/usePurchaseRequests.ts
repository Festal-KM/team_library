import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseRequestsApi } from '@/lib/api';
import { PurchaseRequest, AmazonBookInfo } from '@/types/purchase';

// ユーザーの購入申請一覧
export const useUserPurchaseRequests = (userId: number) => {
  return useQuery({
    queryKey: ['user-purchase-requests', userId],
    queryFn: () => purchaseRequestsApi.getUserRequests(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });
};

// 承認待ちの購入申請一覧（承認者・管理者用）
export const usePendingPurchaseRequests = () => {
  return useQuery({
    queryKey: ['pending-purchase-requests'],
    queryFn: () => purchaseRequestsApi.getPendingRequests(),
    staleTime: 1 * 60 * 1000, // 1分間キャッシュ
    gcTime: 3 * 60 * 1000, // 3分間保持
  });
};

// Amazon書籍情報取得
export const useAmazonBookInfo = (amazonUrl: string) => {
  return useQuery({
    queryKey: ['amazon-book-info', amazonUrl],
    queryFn: () => purchaseRequestsApi.getAmazonBookInfo(amazonUrl),
    enabled: !!amazonUrl && amazonUrl.includes('amazon'),
    staleTime: 30 * 60 * 1000, // 30分間キャッシュ
    gcTime: 60 * 60 * 1000, // 1時間保持
    retry: 1, // Amazon APIは失敗しやすいので1回のみリトライ
  });
};

// 購入申請作成
export const useCreatePurchaseRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (requestData: {
      user_id: number;
      amazon_url: string;
      reason: string;
      title?: string;
      author?: string;
      publisher?: string;
      isbn?: string;
      price?: number;
      cover_image?: string;
      description?: string;
    }) => purchaseRequestsApi.createRequest(requestData),
    onSuccess: (_, { user_id }) => {
      // 関連するキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['user-purchase-requests', user_id] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

// 購入申請を承認または却下
export const useProcessPurchaseRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      requestId, 
      approverId, 
      approve, 
      comment 
    }: { 
      requestId: number; 
      approverId: number; 
      approve: boolean; 
      comment?: string; 
    }) => purchaseRequestsApi.processRequest(requestId, approverId, approve, comment),
    onSuccess: () => {
      // 申請関連キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

// 承認された申請を購入済みに設定
export const useMarkAsPurchased = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (requestId: number) => purchaseRequestsApi.markAsPurchased(requestId),
    onSuccess: () => {
      // 申請関連キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}; 