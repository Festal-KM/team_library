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
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface PurchaseRequestsCardProps {
  requests: any[]
}

export default function PurchaseRequestsCard({ requests }: PurchaseRequestsCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日', { locale: ja })
    } catch (error) {
      return '日付不明'
    }
  }

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
            {status}
          </span>
        )
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <ShoppingCartIcon className="h-5 w-5 text-primary-600 mr-2" />
          購入リクエスト
          {requests && requests.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">{requests.length}件</span>
          )}
        </h2>
        
        <Link href="/purchase-requests/new">
          <button className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center">
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            新規リクエスト
          </button>
        </Link>
      </div>

      {(!requests || requests.length === 0) ? (
        <div className="text-gray-500 py-4 text-center">
          購入リクエストの履歴はありません
        </div>
      ) : (
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  書籍情報
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  リクエスト日
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状態
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
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
                      {formatDate(request.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="mt-1 text-xs text-red-600">
                        理由: {request.rejection_reason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 