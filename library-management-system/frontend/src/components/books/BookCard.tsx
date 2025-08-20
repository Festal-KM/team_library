'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Book, getBookCategories, getBookMajorCategory, getBookMinorCategories, getBookCategoryDisplay, isBookAvailable } from '@/types/book'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { getValidImageUrl } from '@/lib/api'

type BookCardProps = {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  // 画像URLの処理 - image_urlフィールドを使用
  const imageUrl = getValidImageUrl(book.image_url);

  // フォールバック用の画像URL
  const fallbackImageUrl = '/images/book-placeholder.svg'

  // 追加日の表示形式
  const formattedDate = (() => {
    try {
      if (!book.added_at && !book.created_at) return '日付不明'
      const dateString = book.added_at || book.created_at
      return format(new Date(dateString), 'yyyy年MM月dd日', { locale: ja })
    } catch (error) {
      return '日付不明'
    }
  })()

  // 階層カテゴリ情報を取得
  const majorCategory = getBookMajorCategory(book)
  const minorCategories = getBookMinorCategories(book)
  const hasHierarchicalCategory = book.category_structure?.major_category

  return (
    <Link href={`/books/${book.id}`} className="block group">
      <div className="card h-full transition-shadow duration-300 hover:shadow-lg">
        <div className="relative h-32 sm:h-40 lg:h-48 bg-gray-100">
          {book.image_url ? (
            <Image
              src={imageUrl}
              alt={book.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
              className="object-contain"
              onError={(e) => {
                // 画像読み込みエラー時にフォールバック画像を使用
                e.currentTarget.src = fallbackImageUrl
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-400 text-xs">No Cover Image</span>
            </div>
          )}
          
          {/* 利用可能状態のバッジ */}
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
            {isBookAvailable(book) ? (
              <span className="inline-flex items-center px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">利用可能</span>
                <span className="sm:hidden">可</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <XCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">貸出中</span>
                <span className="sm:hidden">貸</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="p-2 sm:p-3 lg:p-4">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold line-clamp-2 group-hover:text-primary-600">
            {book.title}
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-1">{book.author}</p>
          
          <div className="mt-1 sm:mt-2 flex flex-wrap gap-1">
            {/* 階層カテゴリ対応表示 */}
            {hasHierarchicalCategory ? (
              <>
                {/* 大項目カテゴリ */}
                <span className="inline-block px-1 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full bg-primary-100 text-primary-800 line-clamp-1">
                  {majorCategory}
                </span>
                {/* 中項目カテゴリ（最大2個表示） */}
                {minorCategories.slice(0, 2).map((category, index) => (
                  <span key={index} className="inline-block px-1 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full bg-blue-100 text-blue-800 line-clamp-1">
                    {category}
                  </span>
                ))}
                {minorCategories.length > 2 && (
                  <span className="inline-block px-1 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                    +{minorCategories.length - 2}
                  </span>
                )}
              </>
            ) : (
              <>
                {/* 旧形式の場合（後方互換性） */}
                {getBookCategories(book).slice(0, 2).map((category, index) => (
                  <span key={index} className="inline-block px-1 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full bg-primary-100 text-primary-800 line-clamp-1">
                    {category}
                  </span>
                ))}
                {getBookCategories(book).length > 2 && (
                  <span className="inline-block px-1 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                    +{getBookCategories(book).length - 2}
                  </span>
                )}
              </>
            )}
            
            <span className="inline-block px-1 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full bg-gray-100 text-gray-800 hidden sm:inline-block">
              {formattedDate}追加
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
} 