'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { booksApi } from '@/lib/api'
import BookGrid from '@/components/books/BookGrid'
import BookSearchFilters from '@/components/books/BookSearchFilters'
import { GiftIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function BooksPage() {
  // 検索フィルター状態
  const [filters, setFilters] = useState({
    title: '',
    author: '',
    major_category: '',
    minor_categories: [] as string[],
    availableOnly: false,
  })
  
  // モバイル表示時のフィルター表示状態（デフォルトで表示する）
  const [showFilters, setShowFilters] = useState(true)

  // 検索クエリを実行
  const { data: books, isLoading, error } = useQuery({
    queryKey: ['books', filters],
    queryFn: () => booksApi.getBooks({
      title: filters.title || undefined,
      author: filters.author || undefined,
      major_category: filters.major_category || undefined,
      minor_categories: filters.minor_categories.length > 0 ? filters.minor_categories : undefined,
      available_only: filters.availableOnly,
    }),
  })

  // フィルター変更ハンドラー
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">書籍一覧</h1>
        
        <div className="flex flex-col md:flex-row gap-3">
          {/* 寄贈ボタン */}
          <Link 
            href="/books/import" 
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
          >
            <GiftIcon className="h-5 w-5 mr-2" />
            書籍を寄贈する
          </Link>
        </div>
      </div>

      {/* モバイルフィルターボタン */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
          <span>{showFilters ? 'フィルターを閉じる' : 'フィルターを表示'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* サイドバーフィルター - モバイルでは条件付き表示 */}
        <div className={`lg:col-span-1 ${showFilters || 'hidden lg:block'}`}>
          <BookSearchFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* 書籍一覧 */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">書籍情報を読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p>書籍情報の取得に失敗しました</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                再読み込み
              </button>
            </div>
          ) : books && books.length > 0 ? (
            <>
              <p className="text-gray-600 mb-4">全 {books.length} 件</p>
              <BookGrid books={books} />
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">条件に一致する書籍が見つかりませんでした</p>
              <button
                onClick={() => {
                  setFilters({
                    title: '',
                    author: '',
                    major_category: '',
                    minor_categories: [],
                    availableOnly: false,
                  });
                }}
                className="mt-4 px-4 py-2 text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
              >
                絞り込みをクリア
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 