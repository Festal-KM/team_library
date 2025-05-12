'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { format, isValid } from 'date-fns'
import { ja } from 'date-fns/locale'
import { 
  BookOpenIcon, 
  ClockIcon, 
  CurrencyYenIcon, 
  BookmarkIcon,
  IdentificationIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  UserIcon,
  MapPinIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { booksApi, loansApi, reservationsApi } from '@/lib/api'
import BorrowButton from '@/components/books/BorrowButton'
import ReserveButton from '@/components/books/ReserveButton'
import ReservationQueue from '@/components/books/ReservationQueue'
import axios from 'axios'
import ReservationButton from '@/components/books/ReservationButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import TagBadge from '@/components/ui/TagBadge'

// 安全な日付フォーマット関数
const formatDate = (dateString: string | null | undefined, formatStr: string = 'yyyy年MM月dd日') => {
  if (!dateString) return '日付不明';
  
  const date = new Date(dateString);
  if (!isValid(date)) return '日付不明';
  
  try {
    return format(date, formatStr, { locale: ja });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '日付不明';
  }
};

export default function BookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = Number(params.id)
  const [isBorrowing, setIsBorrowing] = useState(false)
  const [isReserving, setIsReserving] = useState(false)
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reservationCount, setReservationCount] = useState(0)
  const [error, setError] = useState('')
  
  // デモ用のユーザーID
  const currentUserId = 1

  useEffect(() => {
    const fetchBookData = async () => {
      if (!params.id) return
      
      try {
        setLoading(true)
        const bookData = await booksApi.getBookById(Number(params.id))
        setBook(bookData)
        
        // 書籍の予約数も取得
        try {
          const count = await booksApi.getBookReservationCount(Number(params.id))
          setReservationCount(count)
        } catch (error) {
          console.error('予約数の取得に失敗しました:', error)
        }
      } catch (err: any) {
        console.error('書籍詳細の取得に失敗しました:', err)
        setError('書籍の詳細を読み込めませんでした')
      } finally {
        setLoading(false)
      }
    }
    
    fetchBookData()
  }, [params.id])

  // 予約キューを取得
  const { 
    data: reservationQueue, 
    isLoading: isLoadingReservationQueue 
  } = useQuery({
    queryKey: ['book', bookId, 'reservation-queue'],
    queryFn: () => reservationsApi.getBookReservationQueue(bookId),
    enabled: !!bookId && !!book && !book.is_available,
  })

  // 書籍を借りる処理
  const handleBorrow = async () => {
    if (!book || !book.is_available) return
    
    setIsBorrowing(true)
    try {
      await loansApi.borrowBook(bookId, currentUserId)
      alert('書籍を借りました')
      window.location.reload() // 簡易的な更新
    } catch (error) {
      console.error('貸出エラー:', error)
      alert('貸出処理に失敗しました')
    } finally {
      setIsBorrowing(false)
    }
  }

  // 書籍を予約する処理
  const handleReserve = async () => {
    if (!book) return
    
    // 利用可能な本は予約できない - 追加のチェック
    if (book.is_available) {
      alert('この本は現在利用可能です。予約ではなく貸出を行ってください。')
      return
    }
    
    setIsReserving(true)
    try {
      console.log('Reserving book:', { bookId, userId: currentUserId, isAvailable: book.is_available })
      await reservationsApi.reserveBook(bookId, currentUserId)
      alert('書籍を予約しました')
      window.location.reload() // 簡易的な更新
    } catch (error: any) {
      console.error('予約エラー:', error)
      // エラーメッセージをより具体的に表示
      if (error.response && error.response.data && error.response.data.detail) {
        alert(`予約処理に失敗しました: ${error.response.data.detail}`)
      } else {
        alert('予約処理に失敗しました。既に予約済みか、貸出可能な状態の可能性があります。')
      }
    } finally {
      setIsReserving(false)
    }
  }

  // 追加日のフォーマット
  const formattedDate = formatDate(book?.added_at);

  if (loading) {
    return <LoadingSpinner />
  }

  if (error || !book) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-4 text-red-600">エラー</h2>
        <p className="text-gray-700 mb-6">{error || '書籍が見つかりませんでした'}</p>
        <button
          onClick={() => router.push('/books')}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          書籍一覧へ戻る
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        
        {/* 書籍タイトルと著者 */}
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
          <p className="text-xl text-gray-600">{book.author}</p>
        </div>
        
        <div className="p-6 flex flex-col md:flex-row">
          
          {/* 表紙画像を表示 */}
          <div className="md:w-1/3 mb-6 md:mb-0 md:pr-6">
            {book.cover_image ? (
              <div className="relative w-full h-64 md:h-80 rounded-md overflow-hidden shadow-md">
                <Image
                  src={book.cover_image}
                  alt={`${book.title}の表紙`}
                  layout="fill"
                  objectFit="cover"
                  onError={(e) => {
                    // 画像読み込みエラー時のフォールバック
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/book-placeholder.png';
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-64 md:h-80 bg-gray-200 rounded-md flex items-center justify-center shadow-md">
                <BookOpenIcon className="h-20 w-20 text-gray-400" />
              </div>
            )}
            
            {/* 予約ボタン */}
            <div className="mt-6">
              {/* 貸出ボタン - 本が利用可能な場合 */}
              {book.is_available && (
                <BorrowButton 
                  isAvailable={book.is_available} 
                  isLoading={isBorrowing}
                  onBorrow={handleBorrow}
                  currentUserId={currentUserId}
                  currentBorrowerId={book.current_borrower_id}
                />
              )}
              
              {/* 予約ボタン - 本が貸出中の場合 */}
              {!book.is_available && (
                <ReservationButton 
                  bookId={book.id} 
                  isAvailable={book.is_available} 
                  reservationCount={reservationCount} 
                />
              )}
            </div>
          </div>

          {/* 書籍詳細情報 */}
          <div className="md:w-2/3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 出版社 */}
              <div className="flex items-start">
                <BuildingLibraryIcon className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">出版社</p>
                  <p className="text-gray-800">{book.publisher || '情報なし'}</p>
                </div>
              </div>
              
              {/* ISBN */}
              <div className="flex items-start">
                <BookOpenIcon className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">ISBN</p>
                  <p className="text-gray-800">{book.isbn || '情報なし'}</p>
                </div>
              </div>
              
              {/* 出版日 */}
              <div className="flex items-start">
                <ClockIcon className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">出版日</p>
                  <p className="text-gray-800">{book.publication_date || '情報なし'}</p>
                </div>
              </div>
              
              {/* 場所 */}
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">配架場所</p>
                  <p className="text-gray-800">{book.location || '情報なし'}</p>
                </div>
              </div>
              
              {/* カテゴリ */}
              <div className="flex items-start">
                <TagIcon className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">カテゴリ</p>
                  <p className="text-gray-800">{book.category || '情報なし'}</p>
                </div>
              </div>
              
              {/* 寄贈者 */}
              <div className="flex items-start">
                <UserIcon className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">寄贈者</p>
                  <p className="text-gray-800">{book.donated_by ? `ユーザーID: ${book.donated_by}` : '情報なし'}</p>
                </div>
              </div>
            </div>

            {/* タグ */}
            {book.tags && book.tags.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-500 mb-2">タグ</p>
                <div className="flex flex-wrap gap-2">
                  {book.tags.map((tag: string, index: number) => (
                    <TagBadge key={index} tag={tag} />
                  ))}
                </div>
              </div>
            )}
            
            {/* 説明 */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-500 mb-2">説明</p>
              <p className="text-gray-800 whitespace-pre-line">{book.description || '説明はありません'}</p>
            </div>
            
            {/* 寄贈に関する備考 */}
            {book.donation_note && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-500 mb-2">寄贈に関する備考</p>
                <p className="text-gray-800 whitespace-pre-line">{book.donation_note}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 