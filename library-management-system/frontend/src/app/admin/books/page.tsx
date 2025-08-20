'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { booksApi, categoryApi } from '@/lib/api'
import Link from 'next/link'
import Image from 'next/image'
import { 
  BookOpenIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { useRequireAuth } from '@/hooks/useAuth'
import { getBookCategories, getBookPrimaryCategory, getBookMajorCategory, getBookMinorCategories, getBookCategoryDisplay, isBookAvailable } from '@/types/book'

export default function AdminBooksPage() {
  const { user, isReady } = useRequireAuth()
  const queryClient = useQueryClient()
  
  // 検索・フィルター状態
  const [searchTerm, setSearchTerm] = useState('')
  const [majorCategoryFilter, setMajorCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'borrowed' | 'overdue'>('all')
  const [sortBy, setSortBy] = useState('title')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // 書籍データを取得（延滞情報含む）
  const { data: adminBooksData, isLoading, error } = useQuery({
    queryKey: ['admin-books-detailed', statusFilter],
    queryFn: () => booksApi.getAdminBooksDetailed({
      status_filter: statusFilter
    }),
    enabled: isReady && user?.role === 'admin'
  })

  const books = adminBooksData?.books || []
  const statistics = adminBooksData?.statistics

  // カテゴリ構造を取得
  const { data: categoryData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(),
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

  // フィルタリングとソート
  const filteredAndSortedBooks = books
    ?.filter((book: any) => {
      const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           book.author.toLowerCase().includes(searchTerm.toLowerCase())
      
      // 階層カテゴリのフィルタリング（新形式）
      const bookMajorCategory = getBookMajorCategory(book)
      const matchesMajorCategory = !majorCategoryFilter || bookMajorCategory === majorCategoryFilter
      
      // バックエンドでフィルタリング済みなので、フロントエンドでは追加フィルタリング不要
      const matchesStatus = true
      
      return matchesSearch && matchesMajorCategory && matchesStatus
    })
    ?.sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a] || ''
      let bValue = b[sortBy as keyof typeof b] || ''
      
      // カテゴリソートの場合は主要カテゴリで比較
      if (sortBy === 'category') {
        aValue = getBookPrimaryCategory(a)
        bValue = getBookPrimaryCategory(b)
      }
      
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

  const handleDeleteBook = async (bookId: number) => {
    if (!confirm('この書籍を削除しますか？この操作は取り消せません。')) return
    
    try {
      await booksApi.deleteBook(bookId)
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
      alert('書籍を削除しました')
    } catch (error: any) {
      console.error('書籍削除エラー:', error)
      
      // エラーメッセージを詳細に表示
      let errorMessage = '書籍の削除に失敗しました'
      
      if (error.response?.status === 400) {
        errorMessage = '書籍の削除に失敗しました。貸出中または予約がある可能性があります。'
      } else if (error.response?.status === 404) {
        errorMessage = '書籍が見つかりませんでした。'
      } else if (error.response?.status === 403) {
        errorMessage = '削除権限がありません。'
      } else if (error.response?.data?.detail) {
        errorMessage = `削除に失敗しました: ${error.response.data.detail}`
      }
      
      alert(errorMessage)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">書籍管理</h1>
          <p className="text-gray-600 mt-2">図書館の書籍を管理します</p>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/books/import"
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            書籍インポート
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
              placeholder="書籍名・著者で検索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* カテゴリーフィルター（階層カテゴリ） */}
          <select
            value={majorCategoryFilter}
            onChange={(e) => setMajorCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">全カテゴリー</option>
            {categoryData?.major_categories?.map((category: string) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* ステータスフィルター */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'available' | 'borrowed' | 'overdue')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">全ステータス</option>
            <option value="available">貸出可能</option>
            <option value="borrowed">貸出中</option>
            <option value="overdue">延滞中</option>
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
            <option value="title-asc">タイトル (昇順)</option>
            <option value="title-desc">タイトル (降順)</option>
            <option value="author-asc">著者 (昇順)</option>
            <option value="author-desc">著者 (降順)</option>
            <option value="created_at-desc">登録日 (新しい順)</option>
            <option value="created_at-asc">登録日 (古い順)</option>
          </select>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <BookOpenIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総書籍数</p>
              <p className="text-2xl font-bold text-gray-900">{statistics?.total_books || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <BookOpenIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">貸出可能</p>
              <p className="text-2xl font-bold text-gray-900">{statistics?.available_count || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <BookOpenIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">貸出中</p>
              <p className="text-2xl font-bold text-gray-900">{statistics?.borrowed_count || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <BookOpenIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">延滞中</p>
              <p className="text-2xl font-bold text-gray-900">{statistics?.overdue_count || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <FunnelIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">表示中</p>
              <p className="text-2xl font-bold text-gray-900">{filteredAndSortedBooks.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 書籍一覧 */}
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
        ) : filteredAndSortedBooks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BookOpenIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>条件に一致する書籍が見つかりません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    書籍情報
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      カテゴリー
                      {sortBy === 'category' && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4 ml-1" /> : <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    現在の場所
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-12">
                          {book.image_url ? (
                            <Image
                              src={book.image_url}
                              alt={book.title}
                              width={48}
                              height={64}
                              className="object-cover rounded"
                            />
                          ) : (
                            <div className="h-16 w-12 bg-gray-200 rounded flex items-center justify-center">
                              <BookOpenIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{book.title}</div>
                          <div className="text-sm text-gray-500">{book.author}</div>
                          {book.isbn && (
                            <div className="text-xs text-gray-400">ISBN: {book.isbn}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {/* 階層カテゴリ対応表示 */}
                        {book.category_structure?.major_category ? (
                          <>
                            {/* 大項目カテゴリ */}
                            <span className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-800">
                              {getBookMajorCategory(book)}
                            </span>
                            {/* 中項目カテゴリ（最大2個表示） */}
                            {getBookMinorCategories(book).slice(0, 2).map((category, index) => (
                              <span key={index} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                {category}
                              </span>
                            ))}
                            {getBookMinorCategories(book).length > 2 && (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                                +{getBookMinorCategories(book).length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {/* 旧形式の場合（後方互換性） */}
                            {getBookCategories(book).slice(0, 2).map((category, index) => (
                              <span key={index} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                {category}
                              </span>
                            ))}
                            {getBookCategories(book).length > 2 && (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                                +{getBookCategories(book).length - 2}
                              </span>
                            )}
                          </>
                        )}
                        
                        {/* カテゴリが全くない場合 */}
                        {!book.category_structure?.major_category && getBookCategories(book).length === 0 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                            未分類
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {/* 基本ステータス */}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          book.detailed_status?.is_overdue
                            ? 'bg-red-100 text-red-800'
                            : book.detailed_status?.is_borrowed
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {book.detailed_status?.is_overdue 
                            ? '延滞中' 
                            : book.detailed_status?.is_borrowed 
                            ? '貸出中' 
                            : '貸出可能'}
                        </span>
                        {/* 延滞日数表示 */}
                        {book.detailed_status?.is_overdue && book.detailed_status?.days_overdue > 0 && (
                          <span className="text-xs text-red-600 font-medium">
                            {book.detailed_status.days_overdue}日延滞
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {book.detailed_status?.borrower_info ? (
                        <div className="flex flex-col">
                          <span className={`font-medium ${
                            book.detailed_status.is_overdue ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {book.detailed_status.borrower_info.full_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ユーザー名: {book.detailed_status.borrower_info.username}
                          </span>
                          {book.detailed_status.borrower_info.due_date && (
                            <span className={`text-xs ${
                              book.detailed_status.is_overdue ? 'text-red-500' : 'text-gray-500'
                            }`}>
                              期限: {new Date(book.detailed_status.borrower_info.due_date).toLocaleDateString('ja-JP')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-green-600 font-medium">図書館</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/books/${book.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          詳細
                        </Link>
                        <Link
                          href={`/admin/books/${book.id}/edit`}
                          className="text-secondary-600 hover:text-secondary-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
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
    </div>
  )
} 