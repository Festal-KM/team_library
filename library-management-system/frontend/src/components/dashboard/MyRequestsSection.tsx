'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { purchaseRequestsApi } from '@/lib/api'
import { format, isValid } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowRightIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/auth-store'

// 安全な日付フォーマット関数
const formatDate = (dateString: string | null | undefined, formatStr: string = 'yyyy/MM/dd') => {
  if (!dateString) return '日付なし';
  
  const date = new Date(dateString);
  if (!isValid(date)) return '無効な日付';
  
  try {
    return format(date, formatStr, { locale: ja });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '日付エラー';
  }
};

export default function MyRequestsSection() {
  // 認証ストアから現在のユーザー情報を取得
  const { user } = useAuthStore();

  const { data: requestsResponse, isLoading, error } = useQuery({
    queryKey: ['purchase-requests', 'user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const result = await purchaseRequestsApi.getUserRequests(user.id);
      return result;
    },
    enabled: !!user?.id,
  })

  // APIレスポンスから配列を取得
  const requests = Array.isArray(requestsResponse) ? requestsResponse : (requestsResponse as any)?.requests || [];

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
      case 'purchased':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">購入済み</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">不明</span>;
    }
  };

  // ユーザーが認証されていない場合
  if (!user) {
    return (
      <section className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5 text-primary-600" />
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
          <ShoppingCartIcon className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold">購入申請</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Link 
            href="/purchase-requests/new" 
            className="text-sm bg-primary-100 text-primary-800 px-2 py-1 rounded hover:bg-primary-200"
          >
            新規申請
          </Link>
          <Link href="/purchase-requests" className="text-sm text-primary-600 hover:text-primary-800 flex items-center">
            一覧
            <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </div>
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
          <Link 
            href="/purchase-requests/new" 
            className="mt-2 inline-block text-primary-600 hover:text-primary-800"
          >
            新しい本をリクエストする
          </Link>
        </div>
      ) : (
        <div className="divide-y space-y-0">
          {requests.slice(0, 3).map((request: any) => {
            // タイトルが長い場合は省略表示
            const displayTitle = request.title.length > 30 ? request.title.substring(0, 30) + '...' : request.title
            const displayAuthor = request.author && request.author.length > 20 ? request.author.substring(0, 20) + '...' : request.author
            
            return (
              <div key={request.id} className="py-3 first:pt-0 last:pb-0">
                <div className="space-y-2">
                  {/* タイトルとステータス */}
                  <div className="flex flex-col gap-2">
                    <Link 
                      href={`/purchase-requests/${request.id}`} 
                      className="font-medium hover:text-primary-600 text-sm leading-tight break-words hyphens-auto"
                      title={request.title}
                      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      {displayTitle}
                    </Link>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500 truncate">
                        {formatDate(request.created_at)}
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {getStatusLabel(request.status)}
                      </div>
                    </div>
                  </div>
                  
                  {/* 著者情報（ある場合） */}
                  {request.author && (
                    <div className="text-xs text-gray-600 break-words leading-tight" title={request.author}>
                      {displayAuthor}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
} 