'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi, authApi } from '@/lib/api'
import Link from 'next/link'
import { 
  UserIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import { useRequireAuth } from '@/hooks/useAuth'

export default function AdminUsersPage() {
  const { user, isReady } = useRequireAuth()
  const queryClient = useQueryClient()
  
  // 検索・フィルター状態
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('full_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // ユーザーデータを取得
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.getUsers(),
    enabled: isReady && user?.role === 'admin'
  })

  // 管理者権限チェック
  if (!isReady || !user || user.role !== 'admin') {
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

  // データが読み込まれていない場合の処理
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h1>
          <p className="text-gray-600">データの取得に失敗しました。</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // フィルタリングとソート
  const filteredAndSortedUsers = users
    ?.filter(userItem => {
      // 安全にプロパティにアクセス
      const fullName = userItem.full_name || ''
      const email = userItem.email || ''
      const username = userItem.username || ''
      
      const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           username.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = !roleFilter || userItem.role === roleFilter
      const matchesStatus = !statusFilter || 
                           (statusFilter === 'active' && userItem.is_active !== false) ||
                           (statusFilter === 'inactive' && userItem.is_active === false)
      
      return matchesSearch && matchesRole && matchesStatus
    })
    ?.sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a] || ''
      let bValue = b[sortBy as keyof typeof b] || ''
      
      // 値が存在しない場合のデフォルト値を設定
      if (aValue === undefined || aValue === null) aValue = ''
      if (bValue === undefined || bValue === null) bValue = ''
      
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

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus
      const statusText = newStatus ? '有効' : '無効'
      
      if (!confirm(`このユーザーを${statusText}にしますか？`)) return
      
      await usersApi.updateUser(userId, { is_active: newStatus })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      alert(`ユーザーを${statusText}にしました`)
    } catch (error) {
      console.error('ユーザーステータス更新エラー:', error)
      alert('ユーザーステータスの更新に失敗しました')
    }
  }

  const handleChangeUserRole = async (userId: number, currentRole: string, newRole: string) => {
    if (currentRole === newRole) return
    
    const roleNames: Record<string, string> = {
      'user': '一般ユーザー',
      'approver': '承認者', 
      'admin': '管理者'
    }
    
    const currentRoleName = roleNames[currentRole] || currentRole
    const newRoleName = roleNames[newRole] || newRole
    
    if (!confirm(`このユーザーのロールを「${currentRoleName}」から「${newRoleName}」に変更しますか？`)) return
    
    try {
      await usersApi.updateUser(userId, { role: newRole as 'user' | 'approver' | 'admin' })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      alert(`ユーザーロールを${newRoleName}に変更しました`)
    } catch (error) {
      console.error('ユーザーロール更新エラー:', error)
      alert('ユーザーロールの更新に失敗しました')
    }
  }

  const handleResetPassword = async (userId: number, userName: string) => {
    if (!confirm(`ユーザー「${userName}」のパスワードを「password123」にリセットしますか？`)) return
    
    try {
      const response = await authApi.resetPassword(userId)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      alert(response.message)
    } catch (error) {
      console.error('パスワードリセットエラー:', error)
      alert('パスワードのリセットに失敗しました')
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('このユーザーを削除しますか？')) return
    
    try {
      await usersApi.deleteUser(userId)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      alert('ユーザーを削除しました')
    } catch (error) {
      console.error('ユーザー削除エラー:', error)
      alert('ユーザーの削除に失敗しました')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">管理者</span>
      case 'approver':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">承認者</span>
      case 'user':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">一般ユーザー</span>
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{role}</span>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600 mt-2">システムのユーザーを管理します</p>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/admin/users/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            新規ユーザー追加
          </Link>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 検索 */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="名前・メール・ユーザー名で検索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* ロールフィルター */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">全ロール</option>
            <option value="admin">管理者</option>
            <option value="approver">承認者</option>
            <option value="user">一般ユーザー</option>
          </select>

          {/* ステータスフィルター */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">全ステータス</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
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
            <option value="full_name-asc">名前 (昇順)</option>
            <option value="full_name-desc">名前 (降順)</option>
            <option value="email-asc">メール (昇順)</option>
            <option value="email-desc">メール (降順)</option>
            <option value="role-asc">ロール (昇順)</option>
            <option value="role-desc">ロール (降順)</option>
          </select>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
              <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">有効ユーザー</p>
              <p className="text-2xl font-bold text-gray-900">
                {users?.filter(u => u.is_active !== false).length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">無効ユーザー</p>
              <p className="text-2xl font-bold text-gray-900">
                {users?.filter(u => u.is_active === false).length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <FunnelIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">表示中</p>
              <p className="text-2xl font-bold text-gray-900">{filteredAndSortedUsers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredAndSortedUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <UserIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>条件に一致するユーザーが見つかりません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('full_name')}
                  >
                    <div className="flex items-center">
                      ユーザー情報
                      {sortBy === 'full_name' && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4 ml-1" /> : <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center">
                      ロール
                      {sortBy === 'role' && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4 ml-1" /> : <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )}
                    </div>
                    <small className="text-gray-400 normal-case">直接変更可</small>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    部署
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                    <small className="text-gray-400 normal-case block">クリックで変更</small>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center">
                            <span className="text-primary-800 font-semibold">
                              {(userItem.full_name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{userItem.full_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{userItem.email || 'N/A'}</div>
                          <div className="text-xs text-gray-400">@{userItem.username || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={userItem.role}
                        onChange={(e) => handleChangeUserRole(userItem.id, userItem.role, e.target.value)}
                        className="text-xs rounded-full border-0 bg-transparent font-medium focus:ring-2 focus:ring-primary-500"
                        disabled={userItem.id === user.id} // 自分自身のロールは変更不可
                      >
                        <option value="user">一般ユーザー</option>
                        <option value="approver">承認者</option>
                        <option value="admin">管理者</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userItem.department || '未設定'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleUserStatus(userItem.id, userItem.is_active ?? true)}
                        disabled={userItem.id === user.id} // 自分自身のステータスは変更不可
                        className={`px-2 py-1 text-xs rounded-full ${
                          userItem.is_active !== false
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        } transition-colors ${userItem.id === user.id ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        title={userItem.id === user.id ? '自分自身のステータスは変更できません' : 'クリックでステータス変更'}
                      >
                        {userItem.is_active !== false ? '有効' : '無効'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/users/${userItem.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          詳細
                        </Link>
                        <Link
                          href={`/admin/users/${userItem.id}/edit`}
                          className="text-secondary-600 hover:text-secondary-900"
                          title="詳細編集"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        {userItem.id !== user.id && (
                          <>
                            <button
                              onClick={() => handleResetPassword(userItem.id, userItem.full_name || userItem.username)}
                              className="text-orange-600 hover:text-orange-900"
                              title="パスワードをpassword123にリセット"
                            >
                              <KeyIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(userItem.id)}
                              className="text-red-600 hover:text-red-900"
                              title="ユーザー削除"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
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