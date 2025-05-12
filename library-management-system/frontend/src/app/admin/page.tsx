'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { booksApi } from '@/lib/api'
import Link from 'next/link'
import { 
  CheckIcon, 
  XMarkIcon, 
  UserIcon, 
  DocumentTextIcon, 
  BookOpenIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { PurchaseRequest } from '@/types/request'
import { User } from '@/types/user'
import { Book } from '@/types/book'

export default function AdminDashboardPage() {
  // 現在選択されているタブ
  const [activeTab, setActiveTab] = useState('requests')
  
  // レポートの期間フィルター
  const [periodFilter, setPeriodFilter] = useState({
    type: 'all', // 'all', 'year', 'month'
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  })
  
  // フィルター表示の切り替え
  const [showFilters, setShowFilters] = useState(false)
  
  // 購入リクエストのデータを取得
  const { data: purchaseRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: () => booksApi.getAllPurchaseRequests(),
  })
  
  // 保留中のリクエストのみをフィルタリング
  const pendingRequests = purchaseRequests?.filter(req => req.status === 'pending') || []
  
  // 承認済みのリクエストのみをフィルタリング
  const approvedRequests = purchaseRequests?.filter(req => req.status === 'approved') || []
  
  // 拒否されたリクエストのみをフィルタリング 
  const rejectedRequests = purchaseRequests?.filter(req => req.status === 'rejected') || []
  
  // ユーザーのデータを取得
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => booksApi.getUsers(),
  })
  
  // 書籍のデータを取得
  const { data: books, isLoading: isLoadingBooks } = useQuery({
    queryKey: ['books'],
    queryFn: () => booksApi.getBooks(),
  })
  
  // 貸出データを取得
  const { data: loansData, isLoading: isLoadingLoans } = useQuery({
    queryKey: ['loans'],
    queryFn: () => booksApi.getAllLoans(),
    enabled: activeTab === 'reports' // レポートタブが選択されている場合のみ取得
  })
  
  // 選択された期間に基づいてデータをフィルタリングする関数
  const filterDataByPeriod = (data: any[], dateField: string) => {
    if (!data || periodFilter.type === 'all') return data
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField])
      const itemYear = itemDate.getFullYear()
      const itemMonth = itemDate.getMonth() + 1
      
      if (periodFilter.type === 'year') {
        return itemYear === periodFilter.year
      } else if (periodFilter.type === 'month') {
        return itemYear === periodFilter.year && itemMonth === periodFilter.month
      }
      
      return true
    })
  }
  
  // 期間に基づいてフィルタリングされたデータ
  const filteredLoans = loansData ? filterDataByPeriod(loansData, 'borrowed_at') : []
  const filteredRequests = purchaseRequests ? filterDataByPeriod(purchaseRequests, 'created_at') : []
  
  // 期間表示のフォーマット
  const getDisplayPeriod = () => {
    if (periodFilter.type === 'all') return '全期間'
    if (periodFilter.type === 'year') return `${periodFilter.year}年`
    return `${periodFilter.year}年${periodFilter.month}月`
  }
  
  // ステータスに応じたバッジの色を返す
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">保留中</span>
      case 'approved':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">承認済み</span>
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">却下</span>
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">不明</span>
    }
  }
  
  // リクエストを承認する関数（モック）
  const approveRequest = async (requestId: number) => {
    try {
      // API呼び出しを行う
      await booksApi.approvePurchaseRequest(requestId, 3) // ユーザーID 3 は管理者
      // リフェッチをトリガー
      // const result = await queryClient.invalidateQueries(['purchase-requests'])
      alert('リクエストを承認しました')
    } catch (error) {
      console.error('リクエスト承認エラー:', error)
      alert('リクエストの承認に失敗しました')
    }
  }
  
  // リクエストを却下する関数（モック）
  const rejectRequest = async (requestId: number) => {
    try {
      // API呼び出しを行う
      await booksApi.rejectPurchaseRequest(requestId, 3) // ユーザーID 3 は管理者
      // リフェッチをトリガー
      // const result = await queryClient.invalidateQueries(['purchase-requests'])
      alert('リクエストを却下しました')
    } catch (error) {
      console.error('リクエスト却下エラー:', error)
      alert('リクエストの却下に失敗しました')
    }
  }
  
  // ユーザーの貸出履歴の統計を計算
  const getUserLoanStats = () => {
    if (!filteredLoans || !users) return []
    
    const userStats = users.map(user => {
      // このユーザーの貸出データをフィルタリング
      const userLoans = filteredLoans.filter(loan => loan.user_id === user.id)
      
      // カテゴリー別の統計
      const categoryCounts: Record<string, number> = {}
      userLoans.forEach(loan => {
        const book = books?.find(b => b.id === loan.book_id)
        if (book?.category) {
          categoryCounts[book.category] = (categoryCounts[book.category] || 0) + 1
        }
      })
      
      // 多く借りられたカテゴリーの上位3つを取得
      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, count]) => ({ category, count }))
      
      return {
        id: user.id,
        name: user.full_name,
        totalLoans: userLoans.length,
        topCategories
      }
    })
    
    // 貸出回数でソート
    return userStats.sort((a, b) => b.totalLoans - a.totalLoans)
  }
  
  // ユーザーの購入リクエスト統計を計算
  const getUserRequestStats = () => {
    if (!filteredRequests || !users) return []
    
    const userStats = users.map(user => {
      // このユーザーの購入リクエストをフィルタリング
      const userRequests = filteredRequests.filter(req => req.user_id === user.id)
      
      // ステータス別にカウント
      const pendingCount = userRequests.filter(req => req.status === 'pending').length
      const approvedCount = userRequests.filter(req => req.status === 'approved').length
      const rejectedCount = userRequests.filter(req => req.status === 'rejected').length
      
      return {
        id: user.id,
        name: user.full_name,
        totalRequests: userRequests.length,
        pendingCount,
        approvedCount,
        rejectedCount,
        approvalRate: userRequests.length > 0 ? (approvedCount / userRequests.length) * 100 : 0
      }
    })
    
    // リクエスト数でソート
    return userStats.sort((a, b) => b.totalRequests - a.totalRequests)
  }
  
  // 書籍の人気統計を計算
  const getBookPopularityStats = () => {
    if (!filteredLoans || !books) return []
    
    const bookStats = books.map(book => {
      // この書籍の貸出回数をカウント
      const loanCount = filteredLoans.filter(loan => loan.book_id === book.id).length
      
      return {
        id: book.id,
        title: book.title,
        loanCount,
        isAvailable: book.is_available
      }
    })
    
    // 貸出回数でソート
    return bookStats.sort((a, b) => b.loanCount - a.loanCount)
  }
  
  // 年の選択肢を生成（過去5年から現在まで）
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i)
    }
    return years
  }
  
  // 月の選択肢
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">管理者ダッシュボード</h1>
      
      {/* 管理タブ */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'requests' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            購入リクエスト
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'users' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserIcon className="w-5 h-5 mr-2" />
            ユーザー管理
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'books' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpenIcon className="w-5 h-5 mr-2" />
            書籍管理
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'reports' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 mr-2" />
            レポート
          </button>
        </nav>
      </div>
      
      {/* 購入リクエストタブ */}
      {activeTab === 'requests' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">購入リクエスト一覧</h2>
            <div className="text-sm text-gray-600">
              保留中: {pendingRequests.length} | 
              承認済み: {approvedRequests.length} | 
              却下: {rejectedRequests.length}
            </div>
          </div>
          
          {isLoadingRequests ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">データを読込中...</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイトル
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      リクエスト者
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      日時
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseRequests && purchaseRequests.map((request) => {
                    // リクエスト者の情報を取得
                    const requester = users?.find((user) => user.id === request.user_id)
                    
                    return (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{request.title}</div>
                          <div className="text-sm text-gray-500">{request.author}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{requester?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{requester?.department || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {request.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => approveRequest(request.id)}
                                className="text-green-600 hover:text-green-900 flex items-center"
                              >
                                <CheckIcon className="h-5 w-5 mr-1" />
                                承認
                              </button>
                              <button
                                onClick={() => rejectRequest(request.id)}
                                className="text-red-600 hover:text-red-900 flex items-center"
                              >
                                <XMarkIcon className="h-5 w-5 mr-1" />
                                却下
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* ユーザー管理タブ */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">ユーザー管理</h2>
            <button className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
              新規ユーザー追加
            </button>
          </div>
          
          {isLoadingUsers ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">データを読込中...</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      名前
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      部署
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      役割
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users && users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === 'admin' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">管理者</span>
                        ) : user.role === 'approver' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">承認者</span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">一般</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-primary-600 hover:text-primary-900">
                            編集
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* 書籍管理タブ */}
      {activeTab === 'books' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">書籍管理</h2>
            <Link href="/books/import" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
              新規書籍追加
            </Link>
          </div>
          
          {isLoadingBooks ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">データを読込中...</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイトル
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      著者
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      カテゴリー
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状態
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      場所
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {books && books.map((book) => (
                    <tr key={book.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {book.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/books/${book.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                          {book.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {book.author}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {book.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {book.is_available ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">利用可能</span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">貸出中</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {book.location || '未設定'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-primary-600 hover:text-primary-900">
                            編集
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* レポートタブ */}
      {activeTab === 'reports' && (
        <div>
          {/* 期間フィルター */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-medium">期間: {getDisplayPeriod()}</h3>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center text-sm text-primary-600 hover:text-primary-800"
              >
                <FunnelIcon className="h-4 w-4 mr-1" />
                {showFilters ? 'フィルターを閉じる' : 'フィルターを表示'}
              </button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    期間タイプ
                  </label>
                  <select
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={periodFilter.type}
                    onChange={(e) => setPeriodFilter({...periodFilter, type: e.target.value})}
                  >
                    <option value="all">全期間</option>
                    <option value="year">年別</option>
                    <option value="month">月別</option>
                  </select>
                </div>
                
                {periodFilter.type !== 'all' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      年
                    </label>
                    <select
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={periodFilter.year}
                      onChange={(e) => setPeriodFilter({...periodFilter, year: parseInt(e.target.value)})}
                    >
                      {getYearOptions().map(year => (
                        <option key={year} value={year}>{year}年</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {periodFilter.type === 'month' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      月
                    </label>
                    <select
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={periodFilter.month}
                      onChange={(e) => setPeriodFilter({...periodFilter, month: parseInt(e.target.value)})}
                    >
                      {monthOptions.map(month => (
                        <option key={month} value={month}>{month}月</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">ユーザー読書分析</h2>
            {isLoadingLoans || isLoadingUsers ? (
              <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-500">データを読込中...</p>
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">選択された期間のデータがありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ユーザー
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        貸出総数
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        よく読むカテゴリー
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        詳細
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getUserLoanStats().map((stat) => (
                      <tr key={stat.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{stat.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{stat.totalLoans} 冊</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {stat.topCategories.length > 0 ? (
                              <ul>
                                {stat.topCategories.map((cat, index) => (
                                  <li key={index} className="mb-1">
                                    {cat.category}: {cat.count} 冊
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-gray-500">データなし</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-primary-600 hover:text-primary-900">
                            詳細を見る
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">購入リクエスト分析</h2>
            {isLoadingRequests || isLoadingUsers ? (
              <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-500">データを読込中...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">選択された期間のデータがありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ユーザー
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        リクエスト総数
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        承認率
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        リクエスト状況
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getUserRequestStats().map((stat) => (
                      <tr key={stat.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{stat.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{stat.totalRequests} 件</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                              <div 
                                className="bg-primary-600 h-2.5 rounded-full" 
                                style={{ width: `${stat.approvalRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-900">{stat.approvalRate.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-900 space-y-1">
                            <div className="flex items-center">
                              <span className="w-3 h-3 rounded-full bg-yellow-300 mr-2"></span>
                              <span>保留中: {stat.pendingCount} 件</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                              <span>承認済み: {stat.approvedCount} 件</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                              <span>却下: {stat.rejectedCount} 件</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">人気書籍ランキング</h2>
            {isLoadingLoans || isLoadingBooks ? (
              <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-500">データを読込中...</p>
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">選択された期間のデータがありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        順位
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        書籍タイトル
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        貸出回数
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状態
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getBookPopularityStats().slice(0, 10).map((stat, index) => (
                      <tr key={stat.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {index + 1}
                            {index === 0 && <span className="ml-1 text-yellow-500">🏆</span>}
                            {index === 1 && <span className="ml-1 text-gray-400">🥈</span>}
                            {index === 2 && <span className="ml-1 text-amber-600">🥉</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/books/${stat.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                            {stat.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {stat.loanCount} 回
                            {index > 0 && getBookPopularityStats()[index-1].loanCount > stat.loanCount && (
                              <ArrowDownIcon className="h-4 w-4 inline-block ml-1 text-red-500" />
                            )}
                            {index > 0 && getBookPopularityStats()[index-1].loanCount < stat.loanCount && (
                              <ArrowUpIcon className="h-4 w-4 inline-block ml-1 text-green-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stat.isAvailable ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">利用可能</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">貸出中</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 