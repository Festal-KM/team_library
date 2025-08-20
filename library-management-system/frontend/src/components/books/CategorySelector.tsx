'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { CategoryStructure } from '@/types/book'
import { categoryApi } from '@/lib/api'

interface HierarchicalCategorySelectorProps {
  selectedCategory: CategoryStructure
  onChange: (category: CategoryStructure) => void
  disabled?: boolean
}

export default function CategorySelector({
  selectedCategory,
  onChange,
  disabled = false
}: HierarchicalCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [majorCategories, setMajorCategories] = useState<string[]>([])
  const [categoryStructure, setCategoryStructure] = useState<Record<string, string[]>>({})
  const [availableMinors, setAvailableMinors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // カテゴリ構造を取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getCategories()
        setMajorCategories(response.major_categories)
        setCategoryStructure(response.category_structure)
        
        // 初期大項目が設定されている場合、対応する中項目を設定
        if (selectedCategory.major_category) {
          setAvailableMinors(response.category_structure[selectedCategory.major_category] || [])
        }
      } catch (error) {
        console.error('カテゴリ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [selectedCategory.major_category])

  // 大項目変更時の処理
  const handleMajorCategoryChange = (majorCategory: string) => {
    const newCategory: CategoryStructure = {
      major_category: majorCategory,
      minor_categories: [] // 大項目変更時は中項目をリセット
    }
    onChange(newCategory)
    setAvailableMinors(categoryStructure[majorCategory] || [])
  }

  // 中項目の選択/選択解除
  const handleMinorCategoryToggle = (minorCategory: string) => {
    const currentMinors = selectedCategory.minor_categories || []
    let newMinors: string[]

    if (currentMinors.includes(minorCategory)) {
      // 削除
      newMinors = currentMinors.filter(cat => cat !== minorCategory)
    } else {
      // 追加
      newMinors = [...currentMinors, minorCategory]
    }

    onChange({
      ...selectedCategory,
      minor_categories: newMinors
    })
  }

  // 中項目の削除
  const handleRemoveMinorCategory = (minorCategory: string) => {
    const newMinors = (selectedCategory.minor_categories || []).filter(cat => cat !== minorCategory)
    onChange({
      ...selectedCategory,
      minor_categories: newMinors
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
        <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 大項目選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          大項目カテゴリ <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedCategory.major_category || ''}
          onChange={(e) => handleMajorCategoryChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">大項目を選択してください</option>
          {majorCategories.map((major) => (
            <option key={major} value={major}>
              {major}
            </option>
          ))}
        </select>
      </div>

      {/* 中項目選択 */}
      {selectedCategory.major_category && availableMinors.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            中項目カテゴリ（複数選択可能）
          </label>
          
          {/* 選択された中項目の表示 */}
          <div className="min-h-[42px] w-full px-3 py-2 border border-gray-300 rounded-md bg-white mb-2">
            <div className="flex flex-wrap gap-2">
              {(selectedCategory.minor_categories || []).map((minorCategory) => (
                <span
                  key={minorCategory}
                  className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 text-sm rounded-md"
                >
                  {minorCategory}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMinorCategory(minorCategory)}
                      className="ml-1 hover:text-primary-600"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
              
              {(!selectedCategory.minor_categories || selectedCategory.minor_categories.length === 0) && (
                <span className="text-gray-500 text-sm py-1">中項目を選択してください（任意）</span>
              )}
              
              {!disabled && (
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className="inline-flex items-center text-gray-600 hover:text-gray-800 text-sm py-1"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 中項目選択のドロップダウン */}
          {isOpen && !disabled && (
            <div className="relative">
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {availableMinors
                  .filter(minor => !(selectedCategory.minor_categories || []).includes(minor))
                  .map((minorCategory) => (
                    <button
                      key={minorCategory}
                      type="button"
                      onClick={() => {
                        handleMinorCategoryToggle(minorCategory)
                        setIsOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                    >
                      {minorCategory}
                    </button>
                  ))}
                
                {availableMinors.filter(minor => !(selectedCategory.minor_categories || []).includes(minor)).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    選択可能な中項目がありません
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* カテゴリ表示プレビュー */}
      {selectedCategory.major_category && (
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">選択中のカテゴリ:</p>
          <p className="font-medium">
            {selectedCategory.major_category}
            {selectedCategory.minor_categories && selectedCategory.minor_categories.length > 0 && (
              <span className="text-gray-600"> &gt; {selectedCategory.minor_categories.join(', ')}</span>
            )}
          </p>
        </div>
      )}

      {/* 閉じるためのオーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// 後方互換性のための旧形式コンポーネント（レガシー用）
interface LegacyCategorySelectorProps {
  selectedCategories: string[]
  onChange: (categories: string[]) => void
  placeholder?: string
  maxSelections?: number
  disabled?: boolean
  availableCategories?: string[]
}

export function LegacyCategorySelector({
  selectedCategories,
  onChange,
  placeholder = "カテゴリを選択...",
  maxSelections = 5,
  disabled = false,
  availableCategories = []
}: LegacyCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter(cat => cat !== category))
    } else {
      if (selectedCategories.length < maxSelections) {
        onChange([...selectedCategories, category])
      }
    }
  }

  const handleRemoveCategory = (category: string) => {
    onChange(selectedCategories.filter(cat => cat !== category))
  }

  return (
    <div className="relative">
      <div className="min-h-[42px] w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((category) => (
            <span
              key={category}
              className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 text-sm rounded-md"
            >
              {category}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(category)}
                  className="ml-1 hover:text-primary-600"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          
          {selectedCategories.length === 0 && (
            <span className="text-gray-500 text-sm py-1">{placeholder}</span>
          )}
          
          {!disabled && selectedCategories.length < maxSelections && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center text-gray-600 hover:text-gray-800 text-sm py-1"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {availableCategories
            .filter(category => !selectedCategories.includes(category))
            .map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryToggle(category)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
              >
                {category}
              </button>
            ))}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 