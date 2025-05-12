'use client'

import { useQuery } from '@tanstack/react-query'
import { booksApi } from '@/lib/api'
import BookCard from '@/components/books/BookCard'

export default function RecentlyAddedBooks() {
  const { data: books, isLoading, error } = useQuery({
    queryKey: ['books', 'recent'],
    queryFn: async () => {
      const allBooks = await booksApi.getBooks()
      console.log('Fetched books:', allBooks); // デバッグログ追加
      return allBooks.slice(0, 6); // 最初の6冊を表示
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">書籍情報の取得に失敗しました</div>
  }

  if (!books || books.length === 0) {
    return <div className="text-gray-500">書籍がありません</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
} 