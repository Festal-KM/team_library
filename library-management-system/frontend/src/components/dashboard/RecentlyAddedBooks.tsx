'use client'

import { useQuery } from '@tanstack/react-query'
import { booksApi } from '@/lib/api'
import BookCard from '@/components/books/BookCard'
import { useAuthStore } from '@/lib/auth-store'

export default function RecentlyAddedBooks() {
  const { user, isAuthenticated } = useAuthStore()
  
  const { data: books, isLoading, error } = useQuery({
    queryKey: ['books', 'recent'],
    queryFn: async () => {
      try {
        console.log('📚 書籍データ取得開始...', {
          isAuthenticated,
          hasUser: !!user,
          token: localStorage.getItem('access_token') ? 'exists' : 'missing'
        })
        
        const allBooks = await booksApi.getBooks()
        console.log('✅ 書籍データ取得成功:', allBooks); 
        return allBooks.slice(0, 12); // 最初の12冊を表示
      } catch (error: any) {
        console.error('❌ 書籍データ取得エラー:', error)
        console.error('エラー詳細:', error.response?.data || error.message)
        console.error('ネットワークエラー:', error.code, error.errno)
        throw error
      }
    },
    enabled: isAuthenticated,  // 認証されている場合のみクエリを実行
  })

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>ログインすると書籍が表示されます</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (error) {
    console.error('書籍取得エラー（UI表示）:', error)
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        <p className="font-semibold">📚 書籍情報の取得に失敗しました</p>
        <p className="text-sm mt-2">
          エラー詳細: {error instanceof Error ? error.message : '不明なエラー'}
        </p>
        <p className="text-xs mt-1 text-gray-600">
          コンソールで詳細を確認してください
        </p>
      </div>
    )
  }

  if (!books || books.length === 0) {
    return <div className="text-gray-500">書籍がありません</div>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
} 