'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { purchaseRequestsApi } from '@/lib/api'
import { PurchaseRequest } from '@/types/purchase'
import { formatDate } from '@/lib/dateUtils'
import { DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { useRequireAuth } from '@/hooks/useAuth'

// formatDate関数は @/lib/dateUtils からインポートするように変更

// ステータス表示関数（購入申請ページと同じ実装）
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">審査中</span>;
    case 'approved':
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">承認済み</span>;
    case 'ordered':
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">発注済み</span>;
    case 'received':
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">受領済み</span>;
    case 'completed':
      return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">完了</span>;
    case 'rejected':
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">却下</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">不明</span>;
  }
};

export default function MyPurchaseRequestsSection() {
  // 認証ストアから現在のユーザー情報を取得
  const { user, isReady } = useRequireAuth();

  const { data: requestsResponse, isLoading, error } = useQuery({
    queryKey: ['purchase-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const result = await purchaseRequestsApi.getUserRequests(user.id);
      return result;
    },
    enabled: isReady && !!user?.id,
    staleTime: 0, // データを常に最新に
    gcTime: 0, // キャッシュしない (React Query v4の正しいプロパティ名)
  })

  // APIレスポンスから配列を取得
  const requests: PurchaseRequest[] = requestsResponse || [];

  // ユーザーが認証されていない場合
  if (!isReady || !user) {
    return (
      <section className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold">購入申請</h3>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>ログインしてください</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold">購入申請</h3>
        </div>
        <Link href="/purchase-requests" className="text-sm text-primary-600 hover:text-primary-800 flex items-center">
          すべて見る
          <ArrowRightIcon className="ml-1 h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          データの取得に失敗しました
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>購入申請はありません</p>
          <Link href="/purchase-requests" className="mt-2 inline-block text-primary-600 hover:text-primary-800">
            新しい申請を作成
          </Link>
        </div>
      ) : (
        <div className="divide-y space-y-0">
          {requests.slice(0, 3).map((request: PurchaseRequest) => {
            // 新しいデータ構造に対応
            const requestId = request.id
            const title = request.title
            const author = request.author
            const status = request.status || 'pending'
            const createdAt = request.created_at
            
            // タイトルが長い場合は省略表示
            const displayTitle = title.length > 30 ? title.substring(0, 30) + '...' : title
            const displayAuthor = author && author.length > 20 ? author.substring(0, 20) + '...' : author
            
            return (
              <div key={requestId} className="py-3 first:pt-0 last:pb-0">
                <div className="space-y-2">
                  {/* タイトルとステータス */}
                  <div className="flex flex-col gap-2">
                    <Link 
                      href={`/purchase-requests/${requestId}`} 
                      className="font-medium hover:text-primary-600 text-sm leading-tight break-words hyphens-auto"
                      title={title}
                      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      {displayTitle}
                    </Link>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500 truncate">
                        {formatDate(createdAt, { includeTime: false })}
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {getStatusLabel(status)}
                      </div>
                    </div>
                  </div>
                  
                  {/* 著者情報（ある場合） */}
                  {author && (
                    <div className="text-xs text-gray-600 break-words leading-tight" title={author}>
                      {displayAuthor}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
} 