'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { purchaseRequestsApi } from '@/lib/api'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowRightIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { PurchaseRequestStatus } from '@/types/purchase'

export default function MyRequestsSection() {
  // ユーザーID（実際にはコンテキストから取得）
  const userId = 1;  // デモ用に固定

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['purchase-requests', 'user', userId],
    queryFn: () => purchaseRequestsApi.getUserRequests(userId),
  })

  // ステータスに応じたバッジのスタイル
  const getStatusBadgeStyle = (status: PurchaseRequestStatus) => {
    switch (status) {
      case PurchaseRequestStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case PurchaseRequestStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case PurchaseRequestStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case PurchaseRequestStatus.PURCHASED:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // ステータスの日本語表示
  const getStatusText = (status: PurchaseRequestStatus) => {
    switch (status) {
      case PurchaseRequestStatus.PENDING:
        return '承認待ち';
      case PurchaseRequestStatus.APPROVED:
        return '承認済み';
      case PurchaseRequestStatus.REJECTED:
        return '却下';
      case PurchaseRequestStatus.PURCHASED:
        return '購入済み';
      default:
        return '不明';
    }
  };

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
        <div className="divide-y">
          {requests.slice(0, 3).map(request => (
            <div key={request.id} className="py-3">
              <div className="flex justify-between">
                <Link 
                  href={`/purchase-requests/${request.id}`} 
                  className="font-medium hover:text-primary-600 line-clamp-1"
                >
                  {request.title}
                </Link>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeStyle(request.status)}`}>
                  {getStatusText(request.status)}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {request.author}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                申請日: {format(new Date(request.created_at), 'yyyy/MM/dd', { locale: ja })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
} 