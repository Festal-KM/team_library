'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { booksApi } from '@/lib/api'
import { PurchaseRequest } from '@/types/request'
import { User } from '@/types/user'
import { CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ApprovalPage() {
  const queryClient = useQueryClient()
  const [approvalStatus, setApprovalStatus] = useState<Record<number, 'approving' | 'rejecting' | 'error' | 'success' | null>>({})
  
  // 保留中の購入リクエストを取得
  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['purchase-requests', 'pending'],
    queryFn: () => booksApi.getPendingPurchaseRequests(),
  })
  
  // ユーザー情報を取得
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => booksApi.getUsers(),
  })
  
  // 承認処理
  const approveRequest = async (requestId: number) => {
    try {
      setApprovalStatus(prev => ({ ...prev, [requestId]: 'approving' }))
      
      // 現在のユーザーID（実際の環境では現在のログインユーザーIDを使用）
      const currentUserId = 4 // 承認者: 佐藤次郎
      
      // リクエストデータを準備 - 文字列に変換
      const requestData = {
        admin_id: String(currentUserId)
      };
      
      console.log('承認リクエスト送信:', { requestId, requestData });
      
      // 直接Fetch APIを使用して明示的にリクエストを送信
      const response = await fetch(`http://localhost:8000/api/purchase-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
      });
      
      const textResponse = await response.text();
      console.log('レスポンステキスト:', textResponse);
      
      if (!response.ok) {
        console.error('承認APIエラー:', {
          status: response.status,
          statusText: response.statusText,
          responseText: textResponse
        });
        throw new Error(`API error: Status ${response.status} - ${textResponse || 'Unknown error'}`);
      }
      
      let result;
      try {
        result = textResponse ? JSON.parse(textResponse) : {};
      } catch (e) {
        console.error('JSON解析エラー:', e);
        result = { message: 'Response parsing error' };
      }
      
      console.log('承認結果:', result);
      
      // キャッシュを更新
      await queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
      
      setApprovalStatus(prev => ({ ...prev, [requestId]: 'success' }))
      
      // 2秒後にステータス表示をクリア
      setTimeout(() => {
        setApprovalStatus(prev => ({ ...prev, [requestId]: null }))
      }, 2000)
      
    } catch (error) {
      console.error('承認エラー:', error)
      setApprovalStatus(prev => ({ ...prev, [requestId]: 'error' }))
      
      // 5秒後にエラー表示をクリア
      setTimeout(() => {
        setApprovalStatus(prev => ({ ...prev, [requestId]: null }))
      }, 5000)
    }
  }
  
  // 却下処理
  const rejectRequest = async (requestId: number) => {
    try {
      setApprovalStatus(prev => ({ ...prev, [requestId]: 'rejecting' }))
      
      // 現在のユーザーID（実際の環境では現在のログインユーザーIDを使用）
      const currentUserId = 4 // 承認者: 佐藤次郎
      
      // リクエストデータを準備 - 文字列に変換
      const requestData = {
        admin_id: String(currentUserId)
      };
      
      console.log('却下リクエスト送信:', { requestId, requestData });
      
      // 直接Fetch APIを使用して明示的にリクエストを送信
      const response = await fetch(`http://localhost:8000/api/purchase-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
      });
      
      const textResponse = await response.text();
      console.log('レスポンステキスト:', textResponse);
      
      if (!response.ok) {
        console.error('却下APIエラー:', {
          status: response.status,
          statusText: response.statusText,
          responseText: textResponse
        });
        throw new Error(`API error: Status ${response.status} - ${textResponse || 'Unknown error'}`);
      }
      
      let result;
      try {
        result = textResponse ? JSON.parse(textResponse) : {};
      } catch (e) {
        console.error('JSON解析エラー:', e);
        result = { message: 'Response parsing error' };
      }
      
      console.log('却下結果:', result);
      
      // キャッシュを更新
      await queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
      
      setApprovalStatus(prev => ({ ...prev, [requestId]: 'success' }))
      
      // 2秒後にステータス表示をクリア
      setTimeout(() => {
        setApprovalStatus(prev => ({ ...prev, [requestId]: null }))
      }, 2000)
      
    } catch (error) {
      console.error('却下エラー:', error)
      setApprovalStatus(prev => ({ ...prev, [requestId]: 'error' }))
      
      // 5秒後にエラー表示をクリア
      setTimeout(() => {
        setApprovalStatus(prev => ({ ...prev, [requestId]: null }))
      }, 5000)
    }
  }
  
  // リクエスト者の名前を取得
  const getRequesterName = (userId: number) => {
    const user = users?.find(u => u.id === userId)
    return user ? user.full_name : '不明なユーザー'
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">購入リクエスト承認</h1>
        <div className="text-gray-500 text-sm">
          承認待ち: {pendingRequests?.length || 0} 件
        </div>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              承認または却下すると、リクエスト者に結果が通知されます。却下する場合は理由を考慮してください。
            </p>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : pendingRequests && pendingRequests.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {pendingRequests.map((request) => (
              <li key={request.id} className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between flex-wrap sm:flex-nowrap">
                  <div className="w-full sm:w-auto">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{request.title}</h3>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-2">
                      {request.author && <p>著者: {request.author}</p>}
                      {request.publisher && <span>・</span>}
                      {request.publisher && <p>出版社: {request.publisher}</p>}
                      {request.isbn && <span>・</span>}
                      {request.isbn && <p>ISBN: {request.isbn}</p>}
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <p>リクエスト者: {getRequesterName(request.user_id)}</p>
                      <span className="mx-2">•</span>
                      <p>リクエスト日: {new Date(request.created_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 flex items-center justify-end space-x-3">
                    {approvalStatus[request.id] === 'approving' ? (
                      <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        承認処理中...
                      </span>
                    ) : approvalStatus[request.id] === 'rejecting' ? (
                      <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        却下処理中...
                      </span>
                    ) : approvalStatus[request.id] === 'error' ? (
                      <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        エラーが発生しました
                      </span>
                    ) : approvalStatus[request.id] === 'success' ? (
                      <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        処理が完了しました
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => approveRequest(request.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          承認
                        </button>
                        <button
                          onClick={() => rejectRequest(request.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          却下
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">リクエスト理由:</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{request.reason}</p>
                  </div>
                  
                  {request.amazon_info && (
                    <div className="mt-4 flex flex-col sm:flex-row">
                      {request.amazon_info.image_url && (
                        <div className="sm:mr-4 mb-4 sm:mb-0 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={request.amazon_info.image_url} 
                            alt={request.title}
                            className="w-24 h-auto object-contain"
                          />
                        </div>
                      )}
                      <div>
                        {request.amazon_info.price && (
                          <p className="text-sm font-medium text-gray-700">
                            価格: ¥{request.amazon_info.price.toLocaleString()}
                          </p>
                        )}
                        {request.amazon_info.availability && (
                          <p className="text-sm text-gray-600">
                            在庫: {request.amazon_info.availability}
                          </p>
                        )}
                        {request.url && (
                          <a 
                            href={request.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-primary-600 hover:text-primary-500"
                          >
                            Amazonで見る
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">現在、承認待ちのリクエストはありません。</p>
        </div>
      )}
    </div>
  )
} 