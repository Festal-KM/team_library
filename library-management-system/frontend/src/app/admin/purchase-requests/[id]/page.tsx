'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseRequestsApi } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth-store'
import { PurchaseRequest } from '@/types/purchase'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { formatDate } from '@/lib/dateUtils'
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  LinkIcon,
  DocumentTextIcon,
  CurrencyYenIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

export default function PurchaseRequestDetailPage() {
  const { id } = useParams()
  const { user, isReady } = useRequireAuth()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const [showCommentForm, setShowCommentForm] = useState(false)

  // 購入申請詳細データを取得
  const { data: request, isLoading, error } = useQuery({
    queryKey: ['purchase-request', id],
    queryFn: async () => {
      console.log('Fetching purchase request with ID:', id);
      try {
        const result = await purchaseRequestsApi.getPurchaseRequest(Number(id));
        console.log('Purchase request data:', result);
        return result;
      } catch (error) {
        console.error('Error fetching purchase request:', error);
        throw error;
      }
    },
    enabled: isReady && !!id,
    retry: 2
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

  // ステータス変更mutation
  const statusMutation = useMutation({
    mutationFn: async ({ action, comment }: { action: 'approve' | 'reject' | 'order' | 'receive', comment: string }) => {
      if (!user?.id) throw new Error('ユーザー情報が取得できません')
      
      switch (action) {
        case 'approve':
          return await purchaseRequestsApi.processRequest(Number(id), user.id, true, comment)
        case 'reject':
          return await purchaseRequestsApi.processRequest(Number(id), user.id, false, comment)
        case 'order':
          return await purchaseRequestsApi.markAsOrdered(Number(id), comment)
        case 'receive':
          return await purchaseRequestsApi.markAsReceived(Number(id), comment)
        default:
          throw new Error('無効なアクションです')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-request', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-requests'] })
      setComment('')
      setShowCommentForm(false)
    },
    onError: (error: any) => {
      console.error('ステータス変更エラー:', error)
      
      // エラーメッセージを詳細に表示
      let errorMessage = '操作に失敗しました'
      if (error?.response?.data?.detail) {
        errorMessage = `操作に失敗しました: ${error.response.data.detail}`
      } else if (error?.message) {
        errorMessage = `操作に失敗しました: ${error.message}`
      }
      
      alert(errorMessage)
    }
  })

  const handleStatusChange = (action: 'approve' | 'reject' | 'order' | 'receive') => {
    if (!comment.trim() && action === 'reject') {
      alert('却下理由を入力してください')
      return
    }
    
    const confirmMessages = {
      approve: 'この購入申請を承認しますか？',
      reject: 'この購入申請を却下しますか？',
      order: 'この購入申請を発注済みにしますか？',
      receive: 'この購入申請を受領完了にして、図書館に追加しますか？'
    }
    
    if (confirm(confirmMessages[action])) {
      statusMutation.mutate({ action, comment: comment || `${action === 'approve' ? '承認' : action === 'reject' ? '却下' : action === 'order' ? '発注済み' : '受領完了・図書館追加'}しました` })
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年MM月dd日 HH:mm', { locale: ja })
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: { label: '審査中', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      approved: { label: '承認済み', color: 'bg-green-100 text-green-800', icon: CheckIcon },
      rejected: { label: '却下', color: 'bg-red-100 text-red-800', icon: XMarkIcon },
      ordered: { label: '発注済み', color: 'bg-blue-100 text-blue-800', icon: TagIcon },
      received: { label: '受領済み', color: 'bg-purple-100 text-purple-800', icon: CheckIcon },
      completed: { label: '完了', color: 'bg-gray-100 text-gray-800', icon: CheckIcon }
    }
    return statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-800', icon: ClockIcon }
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-2 text-2xl font-bold text-gray-900">購入申請が見つかりません</h1>
          <p className="mt-2 text-gray-600">指定された購入申請は存在しないか、アクセス権限がありません。</p>
          <Link
            href="/admin/purchase-requests"
            className="mt-4 inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(request.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/purchase-requests"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              購入申請一覧に戻る
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              印刷
            </button>
          </div>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">購入申請詳細</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-8">
          {/* 基本情報 */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                書籍情報
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-start space-x-6">
                {/* 書籍画像 */}
                <div className="flex-shrink-0">
                  <img
                    src={request.image_url || request.amazon_info?.cover_image || '/book-placeholder.svg'}
                    alt={request.title}
                    className="w-40 h-56 object-cover rounded-lg shadow-md border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/book-placeholder.svg';
                    }}
                  />
                </div>
                
                {/* 書籍詳細 */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{request.title}</h3>
                    {request.author && (
                      <p className="text-gray-600 mt-1">著者: {request.author}</p>
                    )}
                    {request.publisher && (
                      <p className="text-gray-600">出版社: {request.publisher}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {request.isbn && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">ISBN</dt>
                        <dd className="text-sm text-gray-900">{request.isbn}</dd>
                      </div>
                    )}
                    {request.amazon_info?.price && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">価格</dt>
                        <dd className="text-sm text-gray-900 flex items-center">
                          <CurrencyYenIcon className="h-4 w-4 mr-1" />
                          {request.amazon_info.price.toLocaleString()}
                        </dd>
                      </div>
                    )}
                    {request.amazon_info?.availability && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">在庫状況</dt>
                        <dd className="text-sm text-gray-900">{request.amazon_info.availability}</dd>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 申請理由 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 mb-2">申請理由</h4>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{request.reason}</p>
              </div>
            </div>
          </div>

          {/* Amazon詳細情報 */}
          {request.amazon_info?.description && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">商品説明</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-700 whitespace-pre-wrap">{request.amazon_info.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* ステータス */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">ステータス</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center">
                <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {statusInfo.label}
                </span>
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  申請日: {formatDate(request.created_at)}
                </div>
                
                {request.approved_at && (
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckIcon className="h-4 w-4 mr-2" />
                    承認日: {formatDate(request.approved_at)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 申請者情報 */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                申請者情報
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">氏名</dt>
                <dd className="text-sm text-gray-900">{request.user?.full_name || `ユーザーID: ${request.user_id}`}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                <dd className="text-sm text-gray-900">{request.user?.email || '不明'}</dd>
              </div>
              {request.user?.department && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">部署</dt>
                  <dd className="text-sm text-gray-900">{request.user.department}</dd>
                </div>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          {request.status === 'pending' && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">操作</h2>
              </div>
              <div className="p-6 space-y-4">
                <button
                  onClick={() => setShowCommentForm(!showCommentForm)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  コメント付きで操作
                </button>

                {showCommentForm && (
                  <div className="space-y-3">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="コメントを入力してください（任意）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleStatusChange('approve')}
                    disabled={statusMutation.isPending}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    承認
                  </button>
                  <button
                    onClick={() => handleStatusChange('reject')}
                    disabled={statusMutation.isPending}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    却下
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Amazonリンクボタン（サイドバー版） */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-100">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.73 12.67c-.26-.28-.89-.28-1.43-.28-.55 0-1.18 0-1.44.28-.17.18-.17.46 0 .63.26.28.89.28 1.44.28.54 0 1.17 0 1.43-.28.17-.17.17-.45 0-.63zm-7.52-2.34c-1.84 0-3.33 1.49-3.33 3.33s1.49 3.33 3.33 3.33 3.33-1.49 3.33-3.33-1.49-3.33-3.33-3.33zm0 5.67c-1.29 0-2.33-1.04-2.33-2.33s1.04-2.33 2.33-2.33 2.33 1.04 2.33 2.33-1.04 2.33-2.33 2.33zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm8 10c0 1.19-.26 2.32-.73 3.35-.09.2-.32.35-.55.35-.47 0-.85-.38-.85-.85 0-.14.03-.27.09-.39.34-.79.54-1.64.54-2.56 0-3.86-3.14-7-7-7s-7 3.14-7 7c0 .92.2 1.77.54 2.56.06.12.09.25.09.39 0 .47-.38.85-.85.85-.23 0-.46-.15-.55-.35C4.26 14.32 4 13.19 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8z"/>
                </svg>
                Amazonで確認
              </h2>
            </div>
            <div className="p-6">
              <a
                href={request.amazon_url || `https://www.amazon.co.jp/s?k=${encodeURIComponent(request.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.73 12.67c-.26-.28-.89-.28-1.43-.28-.55 0-1.18 0-1.44.28-.17.18-.17.46 0 .63.26.28.89.28 1.44.28.54 0 1.17 0 1.43-.28.17-.17.17-.45 0-.63zm-7.52-2.34c-1.84 0-3.33 1.49-3.33 3.33s1.49 3.33 3.33 3.33 3.33-1.49 3.33-3.33-1.49-3.33-3.33-3.33zm0 5.67c-1.29 0-2.33-1.04-2.33-2.33s1.04-2.33 2.33-2.33 2.33 1.04 2.33 2.33-1.04 2.33-2.33 2.33zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm8 10c0 1.19-.26 2.32-.73 3.35-.09.2-.32.35-.55.35-.47 0-.85-.38-.85-.85 0-.14.03-.27.09-.39.34-.79.54-1.64.54-2.56 0-3.86-3.14-7-7-7s-7 3.14-7 7c0 .92.2 1.77.54 2.56.06.12.09.25.09.39 0 .47-.38.85-.85.85-.23 0-.46-.15-.55-.35C4.26 14.32 4 13.19 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8z"/>
                </svg>
                {request.amazon_url ? 'Amazonページを開く' : 'Amazonで検索'}
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="text-xs text-gray-500 text-center mt-2">
                {request.amazon_url ? '※ 新しいタブで開きます' : '※ Amazonで書籍タイトル検索を行います'}
              </p>
            </div>
          </div>

          {request.status === 'approved' && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">次のステップ</h2>
              </div>
              <div className="p-6">
                <button
                  onClick={() => setShowCommentForm(!showCommentForm)}
                  className="w-full mb-4 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  コメント付きで操作
                </button>

                {showCommentForm && (
                  <div className="mb-4">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="発注に関するメモ（任意）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                    />
                  </div>
                )}

                <button
                  onClick={() => handleStatusChange('order')}
                  disabled={statusMutation.isPending}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <TagIcon className="h-4 w-4 mr-2" />
                  発注済みにする
                </button>
              </div>
            </div>
          )}

          {request.status === 'ordered' && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">受領・図書館追加処理</h2>
              </div>
              <div className="p-6">
                <button
                  onClick={() => setShowCommentForm(!showCommentForm)}
                  className="w-full mb-4 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  受領・配置メモを追加
                </button>

                {showCommentForm && (
                  <div className="mb-4">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="受領・図書館追加に関するメモ（配置場所など）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                    />
                  </div>
                )}

                <button
                  onClick={() => handleStatusChange('receive')}
                  disabled={statusMutation.isPending}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  受領完了して図書館に追加
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 承認履歴 */}
      {request.approval_history && request.approval_history.length > 0 && (
        <div className="mt-8 bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">操作履歴</h2>
          </div>
          <div className="p-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {request.approval_history.map((history, index) => (
                  <li key={history.id}>
                    <div className="relative pb-8">
                      {index !== request.approval_history!.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center ring-8 ring-white">
                            <UserIcon className="h-4 w-4 text-white" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{history.user.full_name}</span>が
                              <span className="font-medium">{history.action}</span>
                            </p>
                            {history.comment && (
                              <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">{history.comment}</p>
                            )}
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time dateTime={history.created_at}>{formatDate(history.created_at)}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 