'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { booksApi } from '@/lib/api'
import { BookOpenIcon, TagIcon, BuildingLibraryIcon, MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

const CATEGORIES = [
  'プログラミング',
  'ソフトウェア設計',
  'ネットワーク',
  'データベース',
  'セキュリティ',
  'AI/機械学習',
  'ビジネス',
  '小説',
  'その他'
]

interface BookImportFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  userId?: number
}

export default function BookImportForm({ onSuccess, onCancel, userId = 1 }: BookImportFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isbnSearching, setIsbnSearching] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    publication_date: '',
    category: '',
    description: '',
    tags: '',
    location: '寄贈書籍棚',
    donated_by: userId,
    donation_note: '',
    cover_image: ''
  })
  const [error, setError] = useState('')
  const [isbnSearchResult, setIsbnSearchResult] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (formData.cover_image) {
      setImagePreview(formData.cover_image);
    } else {
      setImagePreview(null);
    }
  }, [formData.cover_image]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // ISBN入力フィールドの場合、13桁または10桁になったら自動検索
    if (name === 'isbn' && (value.length === 13 || value.length === 10)) {
      searchByIsbn(value)
    }
  }

  const searchByIsbn = async (isbn: string) => {
    if (!isbn || isbn.length < 10) return
    
    try {
      setIsbnSearching(true)
      setIsbnSearchResult(null)
      setError('')
      
      const isbnValue = isbn.replace(/-/g, '').trim()
      console.log(`ISBNで検索: ${isbnValue}`)
      
      const result = await booksApi.searchByIsbn(isbnValue)
      console.log('ISBN検索結果:', result)
      
      if (result.source !== 'error' && result.source !== 'not_found') {
        // 検索結果があれば、フォームに自動入力
        const bookData = result.book_data
        setFormData(prev => ({
          ...prev,
          title: bookData.title || prev.title,
          author: bookData.author || prev.author,
          publisher: bookData.publisher || prev.publisher,
          publication_date: bookData.publication_date || prev.publication_date,
          category: bookData.category || prev.category,
          description: bookData.description || prev.description,
          cover_image: bookData.cover_image || prev.cover_image  // 表紙画像URLも設定
        }))
        
        // 検索成功メッセージを表示
        setIsbnSearchResult(`${result.source}から書籍情報を取得しました`)
      } else {
        setIsbnSearchResult('書籍情報が見つかりませんでした')
      }
    } catch (err) {
      console.error('ISBN検索エラー:', err)
      setIsbnSearchResult('検索中にエラーが発生しました')
    } finally {
      setIsbnSearching(false)
    }
  }

  const handleIsbnSearch = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (formData.isbn) {
      await searchByIsbn(formData.isbn)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // タグを配列に変換
      const tags = formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []

      // 送信データをコンソールに表示（デバッグ用）
      const submitData = {
        ...formData,
        tags
      }
      console.log('送信データ:', submitData)

      // 書籍インポートAPIを呼び出し
      const result = await booksApi.importBook(submitData)
      console.log('インポート成功:', result)

      // 成功
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/books')
        router.refresh()
      }
    } catch (err: any) {
      console.error('書籍インポートエラー:', err)
      let errorMessage = '書籍のインポートに失敗しました'
      
      if (err.response) {
        console.log('エラーレスポンス:', err.response)
        errorMessage = `エラー ${err.response.status}: ${err.response.data?.detail || err.message || errorMessage}`
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <BuildingLibraryIcon className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-xl font-semibold">書籍インポート (寄贈登録)</h2>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ISBN <span className="text-green-500">(入力すると自動検索)</span>
            </label>
            <div className="flex">
              <input
                type="text"
                name="isbn"
                value={formData.isbn}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="例：9784873115658"
              />
              <button
                type="button"
                onClick={handleIsbnSearch}
                disabled={isbnSearching || !formData.isbn}
                className="px-4 py-2 bg-secondary-600 text-white rounded-r-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 disabled:opacity-50"
              >
                {isbnSearching ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    検索中...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                    検索
                  </span>
                )}
              </button>
            </div>
            {isbnSearchResult && (
              <p className={`text-sm mt-1 ${isbnSearchResult.includes('見つかりません') || isbnSearchResult.includes('エラー') ? 'text-amber-600' : 'text-green-600'}`}>
                {isbnSearchResult}
              </p>
            )}
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              書籍タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例：リーダブルコード"
            />
          </div>

          <div className="col-span-full md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              著者 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例：Dustin Boswell, Trevor Foucher"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              出版社
            </label>
            <input
              type="text"
              name="publisher"
              value={formData.publisher}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例：オライリージャパン"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              出版日
            </label>
            <input
              type="date"
              name="publication_date"
              value={formData.publication_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリ
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">カテゴリを選択</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タグ（カンマ区切り）
            </label>
            <div className="flex items-center">
              <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="例：プログラミング, コードレビュー, ベストプラクティス"
              />
            </div>
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              書籍の説明
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="書籍の説明を入力（省略可）"
            ></textarea>
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              寄贈に関する備考
            </label>
            <textarea
              name="donation_note"
              value={formData.donation_note}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="寄贈に関する備考を入力（省略可）"
            ></textarea>
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              表紙画像URL
            </label>
            <div className="flex items-center">
              <PhotoIcon className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="text"
                name="cover_image"
                value={formData.cover_image}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="表紙画像のURL（省略可）"
              />
            </div>
            {imagePreview && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-1">表紙プレビュー:</p>
                <div className="relative w-32 h-48 border border-gray-300 rounded-md overflow-hidden">
                  <Image 
                    src={imagePreview} 
                    alt="表紙プレビュー" 
                    layout="fill"
                    objectFit="cover"
                    onError={() => {
                      console.error('画像の読み込みに失敗しました');
                      setImagePreview(null);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              キャンセル
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                処理中...
              </span>
            ) : (
              '書籍をインポート'
            )}
          </button>
        </div>
      </form>
    </div>
  )
} 