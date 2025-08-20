'use client'

import React from 'react'
import Image from 'next/image'
import { getValidImageUrl } from '@/lib/api'
import { BookOpenIcon } from '@heroicons/react/24/outline'

interface BookCoverProps {
  imageUrl?: string
  title: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function BookCover({ 
  imageUrl, 
  title, 
  size = 'medium',
  className = ''
}: BookCoverProps) {
  // 画像URLの処理
  const processedImageUrl = getValidImageUrl(imageUrl);

  // サイズに応じた高さクラスを設定
  const heightClass = 
    size === 'small' ? 'h-32' : 
    size === 'large' ? 'h-64' : 
    'h-48';
  
  return (
    <div className={`relative ${heightClass} w-full bg-gray-100 rounded overflow-hidden ${className}`}>
      {imageUrl ? (
        <Image
          src={processedImageUrl}
          alt={`${title}の表紙`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain p-2"
          onError={(e) => {
            // 画像読み込みエラー時にプレースホルダー画像を使用
            const target = e.target as HTMLImageElement;
            target.src = '/images/book-placeholder.svg';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <BookOpenIcon className="h-1/3 w-1/3 text-gray-400" />
        </div>
      )}
    </div>
  )
} 