'use client'

import { useQuery } from '@tanstack/react-query'
import { statsApi, purchaseRequestsApi } from '@/lib/api'
import { BookOpenIcon, ClockIcon, ArchiveBoxIcon, InboxArrowDownIcon } from '@heroicons/react/24/outline'

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  loading, 
  color 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  loading: boolean; 
  color: string;
}) => (
  <div className={`bg-white rounded-lg shadow-md overflow-hidden border-t-4 ${color}`}>
    <div className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-bold mt-1">
            {loading ? '読み込み中...' : value}
          </h3>
        </div>
        <div className={`rounded-full p-3 ${color.replace('border', 'bg').replace('-500', '-100')}`}>
          <Icon className={`h-6 w-6 ${color.replace('border', 'text')}`} />
        </div>
      </div>
    </div>
  </div>
)

export default function DashboardStats() {
  // ダッシュボード統計を取得
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: () => statsApi.getDashboardStats(),
    staleTime: 30 * 1000, // 30秒
    retry: 3, // 失敗時に3回リトライ
  })

  // デバッグデータの取得
  const { data: bookStatus } = useQuery({
    queryKey: ['debug', 'book-status'],
    queryFn: () => statsApi.getDebugBookStatus(),
    staleTime: 30 * 1000, // 30秒
    retry: 3, // 失敗時に3回リトライ
  })

  // 統計データが読み込まれるまで待機
  const totalBooks = stats?.total_books || 0
  const availableBooks = stats?.available_books || 0
  const overdueBooks = stats?.overdue_books || 0
  const pendingRequests = stats?.pending_requests || 0

  // データがあれば、コンソールに表示（デバッグ用）
  if (bookStatus) {
    console.log('Book status:', bookStatus)
  }

  console.log('Dashboard stats:', stats);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="蔵書総数"
        value={totalBooks}
        icon={BookOpenIcon}
        loading={isLoadingStats}
        color="border-primary-500"
      />
      
      <StatCard
        title="利用可能な書籍"
        value={availableBooks}
        icon={ArchiveBoxIcon}
        loading={isLoadingStats}
        color="border-green-500"
      />
      
      <StatCard
        title="返却期限切れ"
        value={overdueBooks}
        icon={ClockIcon}
        loading={isLoadingStats}
        color="border-red-500"
      />
      
      <StatCard
        title="承認待ち申請"
        value={pendingRequests}
        icon={InboxArrowDownIcon}
        loading={isLoadingStats}
        color="border-secondary-500"
      />
    </div>
  )
} 