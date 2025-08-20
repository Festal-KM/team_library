'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/hooks/useAuth'
import { AiOutlineBook, AiOutlineUser, AiOutlineCalendar, AiOutlineShoppingCart } from 'react-icons/ai'
import Link from 'next/link'

interface AdminStats {
  total_books: number;
  total_users: number;
  active_loans: number;
  active_reservations: number;
  ready_reservations: number;
  expired_reservations: number;
}

export default function AdminRedirectPage() {
  const router = useRouter()
  const { user, isReady } = useRequireAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)

  useEffect(() => {
    if (isReady) {
      if (user?.role === 'admin') {
        // 管理者の場合はダッシュボードを表示
        setShowDashboard(true)
        // 統計データを取得（仮のデータ）
        setStats({
          total_books: 150,
          total_users: 45,
          active_loans: 23,
          active_reservations: 8,
          ready_reservations: 3,
          expired_reservations: 1
        })
      } else {
        // 管理者でない場合はダッシュボードにリダイレクト
        router.replace('/')
      }
    }
  }, [isReady, user, router])

  if (!showDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <p className="text-gray-600 mt-2">図書館システムの管理と監視</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AiOutlineBook className="text-3xl text-blue-600 mr-4" />
            <div>
              <p className="text-sm text-gray-600">総書籍数</p>
              <p className="text-2xl font-bold">{stats?.total_books || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AiOutlineUser className="text-3xl text-green-600 mr-4" />
            <div>
              <p className="text-sm text-gray-600">総ユーザー数</p>
              <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AiOutlineCalendar className="text-3xl text-orange-600 mr-4" />
            <div>
              <p className="text-sm text-gray-600">貸出中</p>
              <p className="text-2xl font-bold">{stats?.active_loans || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AiOutlineShoppingCart className="text-3xl text-purple-600 mr-4" />
            <div>
              <p className="text-sm text-gray-600">予約中</p>
              <p className="text-2xl font-bold">{stats?.active_reservations || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 通知・アラートセクション */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">通知・アラート</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 予約準備完了通知 */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">予約準備完了</h3>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {stats?.ready_reservations || 0}件
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              返却により予約者への貸出準備が完了した書籍があります
            </p>
            {stats?.ready_reservations && stats.ready_reservations > 0 ? (
              <Link
                href="/admin/reservations?status=ready"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                詳細を確認 →
              </Link>
            ) : (
              <p className="text-sm text-gray-500">現在、準備完了の予約はありません</p>
            )}
          </div>

          {/* 期限切れ予約通知 */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">期限切れ予約</h3>
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {stats?.expired_reservations || 0}件
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              期限切れにより自動キャンセルされた予約があります
            </p>
            {stats?.expired_reservations && stats.expired_reservations > 0 ? (
              <Link
                href="/admin/reservations?status=expired"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                詳細を確認 →
              </Link>
            ) : (
              <p className="text-sm text-gray-500">現在、期限切れの予約はありません</p>
            )}
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/books"
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <div className="text-center">
              <AiOutlineBook className="text-2xl mx-auto mb-2" />
              <p className="font-medium">書籍管理</p>
            </div>
          </Link>
          <Link
            href="/admin/users"
            className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            <div className="text-center">
              <AiOutlineUser className="text-2xl mx-auto mb-2" />
              <p className="font-medium">ユーザー管理</p>
            </div>
          </Link>
          <Link
            href="/admin/purchase-requests"
            className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <div className="text-center">
              <AiOutlineShoppingCart className="text-2xl mx-auto mb-2" />
              <p className="font-medium">購入申請管理</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
} 