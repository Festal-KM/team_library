'use client'

import Image from 'next/image'
import { BookOpenIcon } from '@heroicons/react/24/outline'

interface BookCoverProps {
  imageUrl?: string
  title: string
  width?: number
  height?: number
  className?: string
}

export default function BookCover({ 
  imageUrl, 
  title, 
  width = 120, 
  height = 180,
  className = ''
}: BookCoverProps) {
  return (
    <div 
      className={`relative overflow-hidden rounded-md shadow ${className}`}
      style={{ width, height }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`${title}の表紙`}
          layout="fill"
          objectFit="cover"
          className="rounded-md"
          onError={(e) => {
            // 画像読み込みエラー時のフォールバック
            const target = e.target as HTMLImageElement;
            target.src = '/images/book-placeholder.png';
          }}
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <BookOpenIcon className="h-1/3 w-1/3 text-gray-400" />
        </div>
      )}
    </div>
  )
} 