'use client'

import { 
  ShoppingCartIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/dateUtils'

interface PurchaseRequestsCardProps {
  requests: any[]
}

export default function PurchaseRequestsCard({ requests }: PurchaseRequestsCardProps) {
  // formatDate関数は @/lib/dateUtils からインポートするように変更

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-4 w-4 mr-1" /> 承認待ち
          </span>
        )
      case 'approved':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircleIcon className="h-4 w-4 mr-1" /> 承認済み
          </span>
        )
      case 'ordered':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            <ShoppingCartIcon className="h-4 w-4 mr-1" /> 発注済み
          </span>
        )
      case 'received':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
            <CheckCircleIcon className="h-4 w-4 mr-1" /> 受領済み
          </span>
        )
      case 'completed':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
            <CheckCircleIcon className="h-4 w-4 mr-1" /> 完了
          </span>
        )
      case 'rejected':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <XCircleIcon className="h-4 w-4 mr-1" /> 却下
          </span>
        )
      case 'purchased':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            <ShoppingCartIcon className="h-4 w-4 mr-1" /> 購入済み
          </span>
        )
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            不明
          </span>
        )
    }
  }

  // requestsが配列でない場合の安全な処理
  const safeRequests = Array.isArray(requests) ? requests : []

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <ShoppingCartIcon className="h-5 w-5 text-primary-600 mr-2" />
          購入リクエスト
        </h2>
        <Link 
          href="/purchase-requests/new"
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusCircleIcon className="h-4 w-4 mr-1" />
          新規申請
        </Link>
      </div>

      {safeRequests.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">購入リクエストがありません</h3>
          <p className="mt-1 text-sm text-gray-500">新しい書籍の購入をリクエストしてみましょう。</p>
          <div className="mt-6">
            <Link 
              href="/purchase-requests/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusCircleIcon className="h-4 w-4 mr-2" />
              購入リクエストを作成
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  書籍
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申請日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {safeRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-16 w-12 relative">
                        {request.amazon_info?.image_url ? (
                          <Image
                            src={request.amazon_info.image_url}
                            alt={request.title}
                            layout="fill"
                            objectFit="cover"
                            className="rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 rounded bg-gray-200 flex items-center justify-center">
                            <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{request.title}</div>
                        <div className="text-sm text-gray-500">{request.author}</div>
                        {request.amazon_info?.price && (
                          <div className="text-sm text-gray-500">¥{request.amazon_info.price.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(request.created_at, { includeTime: false })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {safeRequests.length > 0 && (
        <div className="mt-4 text-center">
          <Link 
            href="/purchase-requests"
            className="text-primary-600 hover:text-primary-500 text-sm font-medium"
          >
            すべての購入リクエストを見る →
          </Link>
        </div>
      )}
    </div>
  )
} 