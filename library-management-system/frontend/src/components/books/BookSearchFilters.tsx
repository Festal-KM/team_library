'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { booksApi, categoryApi } from '@/lib/api'
import { 
  FunnelIcon, 
  XMarkIcon, 
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

// デバウンス関数
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

interface FiltersType {
  title: string
  author: string
  major_category: string
  minor_categories: string[]
  availableOnly: boolean
}

interface BookSearchFiltersProps {
  filters: FiltersType
  onFilterChange: (filters: Partial<FiltersType>) => void
}

export default function BookSearchFilters({ filters, onFilterChange }: BookSearchFiltersProps) {
  // モバイル表示時のフィルター表示状態（デフォルトで表示）
  const [isOpen, setIsOpen] = useState(true)
  // 入力中の値を一時的に保存
  const [localFilters, setLocalFilters] = useState(filters)
  
  // カテゴリ構造を取得
  const { data: categoryData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(),
  })

  // 選択された大項目の中項目を取得
  const { data: minorCategoriesData } = useQuery({
    queryKey: ['minor-categories', localFilters.major_category],
    queryFn: () => categoryApi.getMinorCategories(localFilters.major_category),
    enabled: !!localFilters.major_category
  })

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
  const updateFilter = (key: keyof FiltersType, value: string | boolean | string[]) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 中項目カテゴリの選択/解除を処理
  const toggleMinorCategory = (category: string) => {
    const currentMinorCategories = localFilters.minor_categories || [];
    const newMinorCategories = currentMinorCategories.includes(category)
      ? currentMinorCategories.filter(c => c !== category)
      : [...currentMinorCategories, category];
    
    updateFilter('minor_categories', newMinorCategories);
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

          {/* フィルターリセットボタン */}
          <button
            onClick={() => {
              const resetFilters = {
                title: '',
                author: '',
                major_category: '',
                minor_categories: [],
                availableOnly: false,
              };
              setLocalFilters(resetFilters);
              onFilterChange(resetFilters);
            }}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            フィルターをクリア
          </button>

          {/* カテゴリー選択（階層カテゴリ対応） */}
          <div className="mb-6">
            <label htmlFor="major_category" className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリー
            </label>
            <select
              id="major_category"
              value={localFilters.major_category}
              onChange={(e) => {
                const newMajorCategory = e.target.value;
                updateFilter('major_category', newMajorCategory);
                // 大項目が変更されたら中項目をリセット
                if (newMajorCategory !== localFilters.major_category) {
                  updateFilter('minor_categories', []);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">すべてのカテゴリー</option>
              {categoryData?.major_categories?.map((category: string) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* 中項目カテゴリ選択（大項目が選択されている場合のみ表示） */}
          {localFilters.major_category && minorCategoriesData?.minor_categories && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                詳細カテゴリー（複数選択可）
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                {minorCategoriesData.minor_categories.map((category: string) => (
                  <div key={category} className="flex items-center mb-2 last:mb-0">
                    <input
                      type="checkbox"
                      id={`minor-${category}`}
                      checked={localFilters.minor_categories?.includes(category) || false}
                      onChange={() => toggleMinorCategory(category)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`minor-${category}`} className="ml-2 text-sm text-gray-700">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
              {localFilters.minor_categories && localFilters.minor_categories.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {localFilters.minor_categories.length}個のカテゴリーを選択中
                </p>
              )}
            </div>
          )}

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
        </div>
      )}
    </div>
  )
} 