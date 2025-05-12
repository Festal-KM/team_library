'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Book } from '@/types/book'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'

type BookCardProps = {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  // フォールバック用の画像URL
  const fallbackImageUrl = '/book-placeholder.png'

  // 追加日の表示形式
  const formattedDate = (() => {
    try {
      return format(new Date(book.added_at), 'yyyy年MM月dd日', { locale: ja })
    } catch (error) {
      return '日付不明'
    }
  })()

  return (
    <Link href={`/books/${book.id}`} className="block group">
      <div className="card h-full transition-shadow duration-300 hover:shadow-lg">
        <div className="relative h-48 bg-gray-100">
          {book.cover_image ? (
            <Image
              src={book.cover_image || fallbackImageUrl}
              alt={book.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain"
              onError={(e) => {
                // 画像読み込みエラー時にフォールバック画像を使用
                e.currentTarget.src = fallbackImageUrl
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-400 text-sm">No Cover Image</span>
            </div>
          )}
          
          {/* 利用可能状態のバッジ */}
          <div className="absolute top-2 right-2">
            {book.is_available ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                利用可能
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <XCircleIcon className="h-4 w-4 mr-1" />
                貸出中
              </span>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary-600">
            {book.title}
          </h3>
          <p className="text-gray-600 text-sm mt-1">{book.author}</p>
          
          <div className="mt-2 flex flex-wrap gap-2">
            {book.category && (
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-800">
                {book.category}
              </span>
            )}
            <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
              {formattedDate}追加
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
} 