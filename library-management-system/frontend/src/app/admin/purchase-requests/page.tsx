'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { purchaseRequestsApi } from '@/lib/api'
import { PurchaseRequest } from '@/types/purchase'
import Link from 'next/link'
import { 
  DocumentTextIcon, 
  CheckIcon, 
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { useRequireAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/dateUtils'

// formatDate関数は @/lib/dateUtils からインポートするように変更

export default function AdminPurchaseRequestsPage() {
  const { user, isReady } = useRequireAuth()
  const queryClient = useQueryClient()
  
  // 検索・フィルター状態
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // 購入申請データを取得
  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['admin-purchase-requests'],
    queryFn: () => purchaseRequestsApi.getAllPurchaseRequests(),
    enabled: isReady && (user?.role === 'admin' || user?.role === 'approver')
  })

  // 管理者または承認者権限チェック
  if (!isReady || !user || (user.role !== 'admin' && user.role !== 'approver')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス権限がありません</h1>
          <p className="text-gray-600">管理者または承認者権限が必要です。</p>
          <Link href="/" className="mt-4 inline-block text-primary-600 hover:text-primary-800">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    )
  }

  // フィルタリングとソート
  const filteredAndSortedRequests = requests
    ?.filter((request: PurchaseRequest) => {
      const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (request.author && request.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (request.reason && request.reason.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = !statusFilter || request.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
    ?.sort((a: PurchaseRequest, b: PurchaseRequest) => {
      let aValue = a[sortBy as keyof PurchaseRequest] || ''
      let bValue = b[sortBy as keyof PurchaseRequest] || ''
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase()
      if (typeof bValue === 'string') bValue = bValue.toLowerCase()
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    }) || []

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleApproveRequest = async (requestId: number) => {
    if (!confirm('この購入申請を承認しますか？')) return
    
    try {
      await purchaseRequestsApi.processRequest(requestId, user.id, true, '承認しました')
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-requests'] })
      alert('購入申請を承認しました')
    } catch (error) {
      console.error('申請承認エラー:', error)
      alert('申請の承認に失敗しました')
    }
  }

  const handleRejectRequest = async (requestId: number) => {
    const reason = prompt('却下理由を入力してください:')
    if (!reason) return
    
    try {
      await purchaseRequestsApi.processRequest(requestId, user.id, false, reason)
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-requests'] })
      alert('購入申請を却下しました')
    } catch (error) {
      console.error('申請却下エラー:', error)
      alert('申請の却下に失敗しました')
    }
  }

  const handleMarkAsOrdered = async (requestId: number) => {
    if (!confirm('この購入申請を発注済みにしますか？')) return
    
    try {
      await purchaseRequestsApi.markAsOrdered(requestId, '発注済みにしました')
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-requests'] })
      alert('購入申請を発注済みにしました')
    } catch (error) {
      console.error('発注済み処理エラー:', error)
      alert('購入申請の発注済み処理に失敗しました')
    }
  }

  const handleMarkAsReceived = async (requestId: number) => {
    if (!confirm('この購入申請を受領済みにして、図書館に追加しますか？')) return
    
    try {
      // 受領済みにする（図書館追加も同時に行われる）
      await purchaseRequestsApi.markAsReceived(requestId, '受領完了・図書館追加済み')
      
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-requests'] })
      alert('購入申請を受領済みにして、図書館に追加しました')
    } catch (error) {
      console.error('受領済み処理エラー:', error)
      alert('購入申請の受領済み処理に失敗しました')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">審査中</span>
      case 'approved':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">承認済み</span>
      case 'ordered':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">発注済み</span>
      case 'received':
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">受領済み</span>
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">完了</span>
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">却下</span>
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">高</span>
      case 'medium':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">中</span>
      case 'low':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">低</span>
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">-</span>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">購入申請管理</h1>
          <p className="text-gray-600 mt-2">書籍の購入申請を管理します</p>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 検索 */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="書籍名・著者・理由で検索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* ステータスフィルター */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">全ステータス</option>
            <option value="pending">審査中</option>
            <option value="approved">承認済み</option>
            <option value="ordered">発注済み</option>
            <option value="received">受領済み</option>
            <option value="completed">完了</option>
            <option value="rejected">却下</option>
          </select>

          {/* ソート */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-')
              setSortBy(field)
              setSortOrder(order as 'asc' | 'desc')
            }}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="created_at-desc">申請日 (新しい順)</option>
            <option value="created_at-asc">申請日 (古い順)</option>
            <option value="title-asc">書籍名 (昇順)</option>
            <option value="title-desc">書籍名 (降順)</option>
            <option value="priority-desc">優先度 (高い順)</option>
            <option value="priority-asc">優先度 (低い順)</option>
          </select>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総申請数</p>
              <p className="text-2xl font-bold text-gray-900">{requests?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">審査中</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests?.filter((req: PurchaseRequest) => req.status === 'pending').length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <CheckIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">承認済み</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests?.filter((req: PurchaseRequest) => req.status === 'approved').length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <FunnelIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">発注済み</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests?.filter((req: PurchaseRequest) => req.status === 'ordered').length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <CheckIcon className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">完了</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests?.filter((req: PurchaseRequest) => req.status === 'completed').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 申請一覧 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            データの取得に失敗しました
          </div>
        ) : filteredAndSortedRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>条件に一致する申請が見つかりません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      書籍情報
                      {sortBy === 'title' && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4 ml-1" /> : <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    申請者
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center">
                      申請日
                      {sortBy === 'created_at' && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4 ml-1" /> : <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    優先度
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedRequests.map((request: PurchaseRequest) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.title}</div>
                        {request.author && (
                          <div className="text-sm text-gray-500">著者: {request.author}</div>
                        )}
                        {request.reason && (
                          <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                            理由: {request.reason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {request.user?.full_name || `ユーザーID: ${request.user_id}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                      {formatDate(request.created_at, { includeTime: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge('medium')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/purchase-requests/${request.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          詳細
                        </Link>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              className="text-green-600 hover:text-green-900"
                              title="承認"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              className="text-red-600 hover:text-red-900"
                              title="却下"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <button
                            onClick={() => handleMarkAsOrdered(request.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="発注済みにする"
                          >
                            発注済み
                          </button>
                        )}
                        {request.status === 'ordered' && (
                          <button
                            onClick={() => handleMarkAsReceived(request.id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="受領済みにする"
                          >
                            受領済み
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 