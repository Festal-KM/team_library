'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { usersApi, loansApi, reservationsApi, purchaseRequestsApi, statsApi } from '@/lib/api'
import { 
  UserIcon, 
  ArrowLeftIcon,
  BookOpenIcon,
  ClockIcon,
  ArchiveBoxIcon,
  InboxArrowDownIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { useRequireAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, isReady } = useRequireAuth()
  const userId = parseInt(params.id as string)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'reservations' | 'requests'>('overview')

  // ユーザー詳細情報を取得
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getUser(userId),
    enabled: isReady && currentUser?.role === 'admin' && !!userId
  })

  // ユーザー統計を取得
  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => statsApi.getUserStats(userId),
    enabled: isReady && currentUser?.role === 'admin' && !!userId
  })

  // 貸出履歴を取得
  const { data: loans, isLoading: isLoadingLoans } = useQuery({
    queryKey: ['user-loans', userId],
    queryFn: () => loansApi.getUserActiveLoans(userId),
    enabled: isReady && currentUser?.role === 'admin' && !!userId && activeTab === 'loans'
  })

  // 予約履歴を取得
  const { data: reservations, isLoading: isLoadingReservations } = useQuery({
    queryKey: ['user-reservations', userId],
    queryFn: () => reservationsApi.getUserReservations(userId),
    enabled: isReady && currentUser?.role === 'admin' && !!userId && activeTab === 'reservations'
  })

  // 購入申請履歴を取得
  const { data: requests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['user-requests', userId],
    queryFn: () => purchaseRequestsApi.getUserRequests(userId),
    enabled: isReady && currentUser?.role === 'admin' && !!userId && activeTab === 'requests'
  })

  // 管理者権限チェック
  if (!isReady || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス権限がありません</h1>
          <p className="text-gray-600">管理者権限が必要です。</p>
          <Link href="/" className="mt-4 inline-block text-primary-600 hover:text-primary-800">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    )
  }

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (userError || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">ユーザーが見つかりません</h1>
          <p className="text-gray-600">指定されたユーザーは存在しないか、削除されています。</p>
          <Link href="/admin/users" className="mt-4 inline-block text-primary-600 hover:text-primary-800">
            ユーザー一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800 font-medium">管理者</span>
      case 'approver':
        return <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 font-medium">承認者</span>
      case 'user':
        return <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800 font-medium">一般ユーザー</span>
      default:
        return <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800 font-medium">{role}</span>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">貸出中</span>
      case 'RETURNED':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">返却済み</span>
      case 'OVERDUE':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">期限切れ</span>
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd', { locale: ja })
    } catch {
      return '日付不明'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ユーザー詳細</h1>
            <p className="text-gray-600 mt-1">{user.full_name}さんの詳細情報</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/admin/users/${userId}/edit`}
            className="bg-secondary-600 text-white px-4 py-2 rounded-md hover:bg-secondary-700 flex items-center"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            編集
          </Link>
        </div>
      </div>

      {/* ユーザー基本情報 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            <div className="h-20 w-20 rounded-full bg-primary-200 flex items-center justify-center">
              <span className="text-primary-800 font-bold text-2xl">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
              {getRoleBadge(user.role)}
              <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800 font-medium">
                有効
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">メールアドレス:</span>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">ユーザー名:</span>
                <p className="text-gray-900">@{user.username || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">部署:</span>
                <p className="text-gray-900">{user.department || '未設定'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">登録日:</span>
                <p className="text-gray-900">{user.created_at ? formatDate(user.created_at) : '不明'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">借りている本</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.loans.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <ArchiveBoxIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">予約中</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.reservations.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <InboxArrowDownIcon className="h-8 w-8 text-secondary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">申請中</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.purchase_requests.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総貸出数</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.loans.total}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="bg-white rounded-lg shadow-md mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: '概要', icon: UserIcon },
              { key: 'loans', label: '貸出履歴', icon: BookOpenIcon },
              { key: 'reservations', label: '予約履歴', icon: ArchiveBoxIcon },
              { key: 'requests', label: '購入申請', icon: InboxArrowDownIcon }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">フルネーム</label>
                      <p className="mt-1 text-sm text-gray-900">{user.full_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">メールアドレス</label>
                      <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">ユーザー名</label>
                      <p className="mt-1 text-sm text-gray-900">@{user.username || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">ロール</label>
                      <div className="mt-1">{getRoleBadge(user.role)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">部署</label>
                      <p className="mt-1 text-sm text-gray-900">{user.department || '未設定'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">登録日</label>
                      <p className="mt-1 text-sm text-gray-900">{user.created_at ? formatDate(user.created_at) : '不明'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'loans' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">貸出履歴</h3>
              {isLoadingLoans ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-gray-500">読み込み中...</p>
                </div>
              ) : loans && loans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">書籍</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">貸出日</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">返却期限</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loans.map((loan: any) => (
                        <tr key={loan.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{loan.book?.title || loan.book_title || 'タイトル不明'}</div>
                            <div className="text-sm text-gray-500">{loan.book?.author || loan.book_author || '著者不明'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {loan.loan_date ? formatDate(loan.loan_date) : '不明'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {loan.due_date ? formatDate(loan.due_date) : '不明'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(loan.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BookOpenIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>貸出履歴がありません</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reservations' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">予約履歴</h3>
              {isLoadingReservations ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-gray-500">読み込み中...</p>
                </div>
              ) : reservations && reservations.length > 0 ? (
                <div className="space-y-4">
                  {reservations.map((reservation: any) => (
                    <div key={reservation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{reservation.book?.title || 'タイトル不明'}</h4>
                          <p className="text-sm text-gray-500">{reservation.book?.author || '著者不明'}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            予約日: {reservation.reservation_date ? formatDate(reservation.reservation_date) : '不明'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          reservation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          reservation.status === 'READY' ? 'bg-green-100 text-green-800' :
                          reservation.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {reservation.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>予約履歴がありません</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">購入申請履歴</h3>
              {isLoadingRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-gray-500">読み込み中...</p>
                </div>
              ) : requests && requests.length > 0 ? (
                <div className="space-y-4">
                  {requests.map((request: any) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{request.title || 'タイトル不明'}</h4>
                          <p className="text-sm text-gray-500">{request.author || '著者不明'}</p>
                          <p className="text-sm text-gray-600 mt-2">{request.reason}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            申請日: {request.created_at ? formatDate(request.created_at) : '不明'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status === 'PENDING' ? '承認待ち' :
                           request.status === 'APPROVED' ? '承認済み' :
                           request.status === 'REJECTED' ? '却下' : request.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <InboxArrowDownIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>購入申請履歴がありません</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 