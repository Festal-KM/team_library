'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { booksApi } from '@/lib/api'
import { 
  FunnelIcon, 
  XMarkIcon, 
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { debounce } from 'lodash'

type FiltersType = {
  title: string;
  author: string;
  category: string;
  availableOnly: boolean;
}

type BookSearchFiltersProps = {
  filters: FiltersType;
  onFilterChange: (filters: Partial<FiltersType>) => void;
}

export default function BookSearchFilters({ filters, onFilterChange }: BookSearchFiltersProps) {
  // モバイル表示時のフィルター表示状態（デフォルトで表示）
  const [isOpen, setIsOpen] = useState(true)
  // 入力中の値を一時的に保存
  const [localFilters, setLocalFilters] = useState(filters)
  
  // 利用可能なカテゴリー一覧を取得
  const { data: books } = useQuery({
    queryKey: ['books'],
    queryFn: () => booksApi.getBooks(),
  })

  // 一意のカテゴリーリストを作成
  const categories = books
    ? Array.from(new Set(books.filter(book => book.category).map(book => book.category)))
    : []

  // 検索の遅延適用（デバウンス処理）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((searchFilters: Partial<FiltersType>) => {
      onFilterChange(searchFilters);
    }, 300),
    []
  );

  // ローカルフィルターが変更されたら検索を実行
  useEffect(() => {
    debouncedSearch(localFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFilters]);

  // 画面幅に応じてフィルターパネルの表示状態を制御
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setIsOpen(true)
      }
    }

    // 初期状態を設定
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 親コンポーネントからのフィルター変更を同期
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // フィルター値を更新する関数
  const updateFilter = (key: keyof FiltersType, value: string | boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      {/* モバイル用ヘッダー */}
      <div className="lg:hidden p-4 flex justify-between items-center border-b bg-gray-50">
        <h2 className="font-semibold flex items-center">
          <FunnelIcon className="h-5 w-5 mr-2" />
          検索フィルター
        </h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-md hover:bg-gray-100"
        >
          {isOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <AdjustmentsHorizontalIcon className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* デスクトップ用ヘッダー */}
      <div className="hidden lg:block p-4 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-lg flex items-center">
          <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
          書籍を検索
        </h2>
      </div>

      {/* フィルターコンテンツ */}
      {isOpen && (
        <div className="p-4">
          {/* タイトル検索 */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <div className="relative">
              <input
                type="text"
                id="title"
                value={localFilters.title}
                onChange={(e) => updateFilter('title', e.target.value)}
                placeholder="タイトルを入力"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* 著者検索 */}
          <div className="mb-6">
            <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
              著者
            </label>
            <input
              type="text"
              id="author"
              value={localFilters.author}
              onChange={(e) => updateFilter('author', e.target.value)}
              placeholder="著者名を入力"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* カテゴリー選択 */}
          <div className="mb-6">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリー
            </label>
            <select
              id="category"
              value={localFilters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">すべてのカテゴリー</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* 利用可能のみ表示 */}
          <div className="mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="availableOnly"
                checked={localFilters.availableOnly}
                onChange={(e) => updateFilter('availableOnly', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="availableOnly" className="ml-2 block text-sm text-gray-700">
                利用可能な書籍のみ表示
              </label>
            </div>
          </div>

          {/* フィルターリセットボタン */}
          <button
            onClick={() => {
              const resetFilters = {
                title: '',
                author: '',
                category: '',
                availableOnly: false,
              };
              setLocalFilters(resetFilters);
              onFilterChange(resetFilters);
            }}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            フィルターをクリア
          </button>
        </div>
      )}
    </div>
  )
} 