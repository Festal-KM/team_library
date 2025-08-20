'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { booksApi } from '@/lib/api'
import { useRequireAuth } from '@/hooks/useAuth'
import { Book, getBookCategories, CategoryStructure, getBookMajorCategory, getBookMinorCategories } from '@/types/book'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CategorySelector from '@/components/books/CategorySelector'

export default function EditBookPage() {
  const { user, isReady } = useRequireAuth()
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const bookId = Number(params.id)

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    categories: [] as string[], // 後方互換性のため保持
    category_structure: { major_category: '', minor_categories: [] } as CategoryStructure, // 新形式
    description: '',
    image_url: ''
  })

  // 書籍詳細を取得
  const { data: book, isLoading, error } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => booksApi.getBook(bookId),
    enabled: isReady && user?.role === 'admin' && !!bookId
  })

  // 書籍更新ミューテーション
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Book>) => booksApi.updateBook(bookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', bookId] })
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
      alert('書籍情報を更新しました')
      router.push('/admin/books')
    },
    onError: (error: any) => {
      console.error('書籍更新エラー:', error)
      alert('書籍の更新に失敗しました: ' + (error.response?.data?.detail || error.message))
    }
  })

  // 書籍データが取得されたらフォームに設定
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        publisher: book.publisher || '',
        isbn: book.isbn || '',
        categories: getBookCategories(book),
        category_structure: {
          major_category: getBookMajorCategory(book),
          minor_categories: getBookMinorCategories(book)
        },
        description: book.description || '',
        image_url: book.image_url || ''
      })
    }
  }, [book])

  // 管理者権限チェック
  if (!isReady || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス権限がありません</h1>
          <p className="text-gray-600">管理者権限が必要です。</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">エラー</h1>
          <p className="text-gray-600 mb-4">書籍が見つかりませんでした</p>
          <button
            onClick={() => router.push('/admin/books')}
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            書籍管理に戻る
          </button>
        </div>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.author.trim()) {
      alert('タイトルと著者は必須です')
      return
    }

    // 階層カテゴリ構造を含むデータを準備
    const updateData = {
      ...formData,
      category_structure: formData.category_structure,
      // 後方互換性のため旧形式も送信
      categories: formData.category_structure.minor_categories || []
    }

    updateMutation.mutate(updateData)
  }

  const handleCancel = () => {
    router.push('/admin/books')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">書籍編集</h1>
          <p className="text-gray-600 mt-2">書籍情報を編集します</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* タイトル */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="書籍のタイトルを入力"
              />
            </div>

            {/* 著者 */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
                著者 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="著者名を入力"
              />
            </div>

            {/* 出版社 */}
            <div>
              <label htmlFor="publisher" className="block text-sm font-medium text-gray-700 mb-2">
                出版社
              </label>
              <input
                type="text"
                id="publisher"
                name="publisher"
                value={formData.publisher}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="出版社名を入力"
              />
            </div>

            {/* ISBN */}
            <div>
              <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 mb-2">
                ISBN
              </label>
              <input
                type="text"
                id="isbn"
                name="isbn"
                value={formData.isbn}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="ISBN番号を入力"
              />
            </div>

            {/* カテゴリー */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリー（階層選択）
              </label>
              <CategorySelector
                selectedCategory={formData.category_structure}
                onChange={(categoryStructure) => setFormData(prev => ({ 
                  ...prev, 
                  category_structure: categoryStructure,
                  // 後方互換性のため旧形式も更新
                  categories: categoryStructure.minor_categories || []
                }))}
              />
            </div>

            {/* 画像URL */}
            <div>
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-2">
                画像URL
              </label>
              <input
                type="url"
                id="image_url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="書籍の画像URLを入力"
              />
            </div>

            {/* 説明 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="書籍の説明を入力"
              />
            </div>

            {/* ボタン */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? '更新中...' : '更新'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 