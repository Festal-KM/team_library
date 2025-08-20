'use client'

import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/lib/api'
import { BookOpenIcon, ArchiveBoxIcon, InboxArrowDownIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/auth-store'

const CompactStatItem = ({ 
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
  <div className="flex items-center space-x-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
    <div className={`p-2 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-600 truncate">{title}</p>
      <p className={`text-lg font-bold ${color} ${loading ? 'animate-pulse' : ''}`}>
        {loading ? '...' : value}
      </p>
    </div>
  </div>
)

export default function UserDashboardStats() {
  const { user } = useAuthStore()

  // ユーザー固有の統計を取得
  const { data: userStats, isLoading: isLoadingUserStats } = useQuery({
    queryKey: ['stats', 'user', user?.id],
    queryFn: () => user?.id ? statsApi.getUserStats(user.id) : Promise.resolve(null),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30秒
    retry: 3,
  })

  // 全体統計も取得（比較用）
  const { data: globalStats, isLoading: isLoadingGlobalStats } = useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: () => statsApi.getDashboardStats(),
    staleTime: 30 * 1000, // 30秒
    retry: 3,
  })

  if (!user) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <UserGroupIcon className="h-4 w-4 mr-2 text-blue-600" />
            図書館の状況
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <CompactStatItem
            title="蔵書総数"
            value={globalStats?.total_books || 0}
            icon={BookOpenIcon}
            loading={isLoadingGlobalStats}
            color="text-blue-600"
          />
          
          <CompactStatItem
            title="利用可能"
            value={globalStats?.available_books || 0}
            icon={ArchiveBoxIcon}
            loading={isLoadingGlobalStats}
            color="text-green-600"
          />
          
          <CompactStatItem
            title="承認待ち"
            value={globalStats?.pending_requests || 0}
            icon={InboxArrowDownIcon}
            loading={isLoadingGlobalStats}
            color="text-purple-600"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 mb-6">
      {/* ユーザー固有の統計 */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <BookOpenIcon className="h-4 w-4 mr-2 text-primary-600" />
            あなたの利用状況
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <CompactStatItem
            title="借りている本"
            value={userStats?.loans.active || 0}
            icon={BookOpenIcon}
            loading={isLoadingUserStats}
            color="text-primary-600"
          />
          
          <CompactStatItem
            title="予約中"
            value={userStats?.reservations.active || 0}
            icon={ArchiveBoxIcon}
            loading={isLoadingUserStats}
            color="text-yellow-600"
          />
          
          <CompactStatItem
            title="申請中"
            value={userStats?.purchase_requests.pending || 0}
            icon={InboxArrowDownIcon}
            loading={isLoadingUserStats}
            color="text-secondary-600"
          />
        </div>
      </div>

      {/* 全体統計（コンパクト版） */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <UserGroupIcon className="h-4 w-4 mr-2 text-gray-600" />
            図書館全体
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <CompactStatItem
            title="蔵書総数"
            value={globalStats?.total_books || 0}
            icon={BookOpenIcon}
            loading={isLoadingGlobalStats}
            color="text-gray-600"
          />
          
          <CompactStatItem
            title="利用可能"
            value={globalStats?.available_books || 0}
            icon={ArchiveBoxIcon}
            loading={isLoadingGlobalStats}
            color="text-green-600"
          />
          
          <CompactStatItem
            title="承認待ち"
            value={globalStats?.pending_requests || 0}
            icon={InboxArrowDownIcon}
            loading={isLoadingGlobalStats}
            color="text-purple-600"
          />
        </div>
      </div>
    </div>
  )
} 