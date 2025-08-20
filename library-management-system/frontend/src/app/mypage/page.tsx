'use client'

import React from 'react'
import Link from 'next/link'
import { AiOutlineLoading3Quarters, AiOutlineBook, AiOutlineCalendar, AiOutlineShoppingCart } from 'react-icons/ai'
import { useAuthStore } from '@/lib/auth-store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loansApi, reservationsApi, purchaseRequestsApi } from '@/lib/api'
import { formatDate } from '@/lib/dateUtils'
import PasswordChangeCard from '@/components/mypage/PasswordChangeCard'

const MyPage = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // 現在のユーザーの貸出中の書籍を取得
  const { data: activeLoans = [], isLoading: loansLoading, error: loansError } = useQuery({
    queryKey: ['loans', 'user', user?.id, 'active'],
    queryFn: () => loansApi.getUserActiveLoans(user!.id),
    enabled: !!user?.id,
  })

  // 現在のユーザーの予約を取得
  const { data: reservations = [], isLoading: reservationsLoading, error: reservationsError } = useQuery({
    queryKey: ['reservations', 'user', user?.id],
    queryFn: () => reservationsApi.getUserReservations(user!.id, true),
    enabled: !!user?.id,
  })

  // 現在のユーザーの購入申請を取得
  const { data: purchaseRequests = [], isLoading: purchaseRequestsLoading, error: purchaseRequestsError } = useQuery({
    queryKey: ['purchase-requests', 'user', user?.id],
    queryFn: () => purchaseRequestsApi.getUserRequests(user!.id),
    enabled: !!user?.id,
  })

  // 返却ミューテーション
  const returnMutation = useMutation({
    mutationFn: (loanId: number) => loansApi.returnBook(loanId),
    onSuccess: (data, loanId) => {
      // 貸出中書籍一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['loans', 'user', user?.id, 'active'] })
      
      // 返却した書籍の情報を取得
      const returnedLoan = activeLoans.find(loan => loan.id === loanId)
      const bookTitle = returnedLoan?.book?.title || returnedLoan?.book_title || '書籍'
      
      alert(`「${bookTitle}」を返却しました。ご利用ありがとうございました。`)
    },
    onError: (error: any) => {
      console.error('返却エラー:', error)
      let errorMessage = '返却に失敗しました'
      
      if (error.response?.status === 404) {
        errorMessage = '貸出記録が見つかりませんでした'
      } else if (error.response?.status === 400) {
        errorMessage = '既に返却済みの書籍です'
      } else if (error.response?.data?.detail) {
        errorMessage = `返却に失敗しました: ${error.response.data.detail}`
      }
      
      alert(errorMessage)
    }
  })

  // 予約キャンセルミューテーション
  const cancelReservationMutation = useMutation({
    mutationFn: (reservationId: number) => reservationsApi.cancelReservation(reservationId),
    onSuccess: (data, reservationId) => {
      // 予約一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['reservations', 'user', user?.id] })
      
      // キャンセルした予約の情報を取得
      const cancelledReservation = reservations.find(r => r.id === reservationId)
      const bookTitle = cancelledReservation?.book?.title || cancelledReservation?.book_title || '書籍'
      
      alert(`「${bookTitle}」の予約をキャンセルしました。`)
    },
    onError: (error: any) => {
      console.error('予約キャンセルエラー:', error)
      let errorMessage = '予約のキャンセルに失敗しました'
      
      if (error.response?.status === 400) {
        errorMessage = 'この予約は既にキャンセル済みか、キャンセルできない状態です'
      } else if (error.response?.status === 404) {
        errorMessage = '予約が見つかりませんでした'
      } else if (error.response?.data?.detail) {
        errorMessage = `予約キャンセルに失敗しました: ${error.response.data.detail}`
      }
      
      alert(errorMessage)
    }
  })

  const isLoading = loansLoading || reservationsLoading || purchaseRequestsLoading

  // formatDate関数は @/lib/dateUtils からインポートするように変更

  const handleReturnBook = (loanId: number, bookTitle: string) => {
    if (confirm(`「${bookTitle}」を返却しますか？`)) {
      returnMutation.mutate(loanId)
    }
  }

  const handleCancelReservation = (reservationId: number, bookTitle: string) => {
    if (confirm(`「${bookTitle}」の予約をキャンセルしますか？`)) {
      cancelReservationMutation.mutate(reservationId)
    }
  }

  // ログインしていない場合
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ログインが必要です</h1>
          <p className="text-gray-600 mb-6">マイページを表示するにはログインしてください。</p>
          <Link href="/login" className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700">
            ログイン
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">マイページ</h1>
        <p className="text-gray-600 mt-2">こんにちは、{user.email}さん</p>
      </div>

      {/* ローディング表示 */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <AiOutlineLoading3Quarters className="animate-spin text-4xl text-primary-600" />
          <span className="ml-3 text-lg text-gray-600">データを読み込み中...</span>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AiOutlineBook className="text-3xl text-blue-600 mr-4" />
            <div>
              <p className="text-sm text-gray-600">貸出中</p>
              <p className="text-2xl font-bold">{activeLoans.length}冊</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AiOutlineCalendar className="text-3xl text-green-600 mr-4" />
            <div>
              <p className="text-sm text-gray-600">予約中</p>
              <p className="text-2xl font-bold">{reservations.length}冊</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AiOutlineShoppingCart className="text-3xl text-purple-600 mr-4" />
            <div>
              <p className="text-sm text-gray-600">購入申請</p>
              <p className="text-2xl font-bold">{purchaseRequests.length}件</p>
            </div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {(loansError || reservationsError || purchaseRequestsError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>データの取得中にエラーが発生しました。</p>
          {loansError && <p className="text-sm">貸出データ: {loansError instanceof Error ? loansError.message : '不明なエラー'}</p>}
          {reservationsError && <p className="text-sm">予約データ: {reservationsError instanceof Error ? reservationsError.message : '不明なエラー'}</p>}
          {purchaseRequestsError && <p className="text-sm">購入申請データ: {purchaseRequestsError instanceof Error ? purchaseRequestsError.message : '不明なエラー'}</p>}
        </div>
      )}

      {/* 貸出中の書籍 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">貸出中の書籍</h2>
          <Link href="/books" className="text-blue-600 hover:text-blue-800 text-sm">
            書籍を探す →
          </Link>
        </div>
        {activeLoans.length > 0 ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">書籍</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">貸出日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">返却期限</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeLoans.map((loan) => {
                  // 新しいデータ構造に対応
                  const bookTitle = loan.book?.title || loan.book_title || `書籍ID: ${loan.book_id}`
                  const bookAuthor = loan.book?.author || loan.book_author || '著者不明'
                  const loanDate = loan.loan_date || loan.borrowed_at
                  const dueDate = loan.due_date
                  
                  return (
                    <tr key={loan.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          <Link href={`/books/${loan.book_id}`} className="hover:text-primary-600">
                            {bookTitle}
                          </Link>
                        </div>
                        <div className="text-sm text-gray-500">{bookAuthor}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {loanDate ? formatDate(loanDate, { includeTime: false }) : '不明'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {dueDate ? formatDate(dueDate, { includeTime: false }) : '不明'}
                      </td>
                      <td className="px-6 py-4">
                        {dueDate && new Date(dueDate) < new Date() ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">期限切れ</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">貸出中</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleReturnBook(loan.id, bookTitle)}
                          disabled={returnMutation.isPending}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {returnMutation.isPending ? '返却中...' : '返却'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <AiOutlineBook className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">現在借りている本はありません</p>
            <Link href="/books" className="mt-2 inline-block text-blue-600 hover:text-blue-800">
              書籍を探す
            </Link>
          </div>
        )}
      </div>

      {/* 予約中の書籍 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">予約中の書籍</h2>
        </div>
        {reservations.length > 0 ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">書籍</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">予約日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">順位</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">期限</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((reservation) => {
                  // 新しいデータ構造に対応
                  const bookTitle = reservation.book?.title || reservation.book_title || `書籍ID: ${reservation.book_id}`
                  const bookAuthor = reservation.book?.author || reservation.book_author || '著者不明'
                  const reservationDate = reservation.reservation_date || reservation.reserved_at
                  const expiryDate = reservation.expiry_date
                  const priority = reservation.priority || 1
                  
                  return (
                    <tr key={reservation.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          <Link href={`/books/${reservation.book_id}`} className="hover:text-primary-600">
                            {bookTitle}
                          </Link>
                        </div>
                        <div className="text-sm text-gray-500">{bookAuthor}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {reservationDate ? formatDate(reservationDate, { includeTime: false }) : '不明'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          priority === 1 ? 'bg-green-100 text-green-800' :
                          priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {priority}番目
                        </span>
                        {priority === 1 && reservation.status === 'ready' && (
                          <div className="text-xs text-green-600 mt-1">貸出可能</div>
                        )}
                        {priority === 1 && reservation.status === 'pending' && (
                          <div className="text-xs text-blue-600 mt-1">次の対象</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {expiryDate ? formatDate(expiryDate, { includeTime: false }) : '不明'}
                        {expiryDate && new Date(expiryDate) < new Date() && (
                          <div className="text-xs text-red-600 mt-1">期限切れ</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          reservation.status === 'ready' ? 'bg-green-100 text-green-800' :
                          reservation.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          reservation.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {reservation.status === 'pending' ? '待機中' :
                           reservation.status === 'ready' ? '準備完了' :
                           reservation.status === 'completed' ? '完了' :
                           reservation.status === 'cancelled' ? 'キャンセル' :
                           reservation.status === 'expired' ? '期限切れ' :
                           reservation.status || '不明'}
                        </span>
                        {reservation.status === 'ready' && (
                          <div className="text-xs text-green-600 mt-1">
                            {expiryDate && `${Math.max(0, Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}日以内に貸出`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {reservation.status === 'ready' ? (
                          <div className="space-y-1">
                            <Link
                              href={`/books/${reservation.book_id}`}
                              className="block bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 text-center"
                            >
                              借りる
                            </Link>
                            <button
                              onClick={() => handleCancelReservation(reservation.id, bookTitle)}
                              disabled={cancelReservationMutation.isPending}
                              className="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {cancelReservationMutation.isPending ? 'キャンセル中...' : 'キャンセル'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCancelReservation(reservation.id, bookTitle)}
                            disabled={cancelReservationMutation.isPending}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancelReservationMutation.isPending ? 'キャンセル中...' : 'キャンセル'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <AiOutlineCalendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">現在予約している本はありません</p>
          </div>
        )}
      </div>

      {/* 購入申請 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">購入申請</h2>
          <Link href="/purchase-requests/new" className="text-blue-600 hover:text-blue-800 text-sm">
            新規申請 →
          </Link>
        </div>
        {purchaseRequests.length > 0 ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">書籍</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{request.title}</div>
                      <div className="text-sm text-gray-500">{request.author}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {request.created_at ? formatDate(request.created_at, { includeTime: true }) : '不明'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                        request.status === 'received' ? 'bg-purple-100 text-purple-800' :
                        request.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status === 'pending' ? '審査中' :
                         request.status === 'approved' ? '承認済み' :
                         request.status === 'ordered' ? '発注済み' :
                         request.status === 'received' ? '受領済み' :
                         request.status === 'completed' ? '完了' :
                         request.status === 'rejected' ? '却下' :
                         '不明'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <AiOutlineShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">購入申請はありません</p>
            <Link href="/purchase-requests/new" className="mt-2 inline-block text-blue-600 hover:text-blue-800">
              新規申請
            </Link>
          </div>
        )}
      </div>

      {/* パスワード変更セクション */}
      <div className="mb-8">
        <PasswordChangeCard />
      </div>
    </div>
  )
}

export default MyPage 