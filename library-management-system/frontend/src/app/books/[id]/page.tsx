'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { format, isValid } from 'date-fns'
import { ja } from 'date-fns/locale'
import { 
  BookOpenIcon, 
  CalendarIcon, 
  UserIcon, 
  BuildingOfficeIcon,
  TagIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { booksApi, loansApi, reservationsApi } from '@/lib/api'
import { isBookAvailable } from '@/types/book'
import BorrowButton from '@/components/books/BorrowButton'
import ReservationQueue from '@/components/books/ReservationQueue'
import axios from 'axios'
import ReservationButton from '@/components/books/ReservationButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import TagBadge from '@/components/ui/TagBadge'
import { useAuthStore } from '@/lib/auth-store'
import { getBookCategories, getBookMajorCategory, getBookMinorCategories, getBookCategoryDisplay } from '@/types/book'

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
  const { user } = useAuthStore() // 認証ストアから現在のユーザー情報を取得
  const [isBorrowing, setIsBorrowing] = useState(false)
  const [isReserving, setIsReserving] = useState(false)
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reservationCount, setReservationCount] = useState(0)
  const [userReservation, setUserReservation] = useState<any>(null) // ユーザーの予約状況
  const [error, setError] = useState('')
  
  useEffect(() => {
    const fetchBookData = async () => {
      if (!params.id || !user?.id) return
      
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
        
        // ユーザーの予約状況を取得
        try {
          const userReservations = await reservationsApi.getUserReservations(user.id)
          const bookReservation = userReservations.find(r => 
            r.book_id === Number(params.id) && 
            (r.status === 'pending' || r.status === 'ready')
          )
          setUserReservation(bookReservation)
        } catch (error) {
          console.error('ユーザー予約状況の取得に失敗しました:', error)
        }
      } catch (err: any) {
        console.error('書籍詳細の取得に失敗しました:', err)
        setError('書籍の詳細を読み込めませんでした')
      } finally {
        setLoading(false)
      }
    }
    
    fetchBookData()
  }, [params.id, user?.id])

  // 予約キューを取得
  const { 
    data: reservationQueue, 
  } = useQuery({
    queryKey: ['book', bookId, 'reservation-queue'],
    queryFn: () => reservationsApi.getBookReservationQueue(bookId),
    enabled: !!bookId && !!book && !isBookAvailable(book),
  })

  // 書籍を借りる処理（通常の貸出）
  const handleBorrow = async () => {
    if (!book || !user?.id) return
    
    setIsBorrowing(true)
    try {
      console.log('貸出処理開始:', { bookId, userId: user.id, userInfo: user })
      await loansApi.borrowBook(bookId, user.id)
      alert('書籍を借りました')
      window.location.reload() // 簡易的な更新
    } catch (error: any) {
      console.error('貸出エラー:', error)
      // バックエンドから返される詳細なエラーメッセージを表示
      let errorMessage = '貸出処理に失敗しました'
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = `貸出処理に失敗しました: ${error.message}`
      }
      alert(errorMessage)
    } finally {
      setIsBorrowing(false)
    }
  }

  // 予約準備完了の書籍を借りる処理
  const handleBorrowReservedBook = async () => {
    if (!book || !user?.id || !userReservation) return
    
    setIsBorrowing(true)
    try {
      // 予約を完了状態にしてから貸出
      await reservationsApi.completeReservation(userReservation.id)
      await loansApi.borrowBook(bookId, user.id)
      alert('予約していた書籍を借りました')
      window.location.reload() // 簡易的な更新
    } catch (error: any) {
      console.error('予約書籍貸出エラー:', error)
      let errorMessage = '貸出処理に失敗しました'
      if (error.response?.data?.detail) {
        errorMessage = `貸出処理に失敗しました: ${error.response.data.detail}`
      }
      alert(errorMessage)
    } finally {
      setIsBorrowing(false)
    }
  }

  // 書籍を予約する処理
  const handleReserve = async () => {
    if (!book || !user?.id) return
    
    // 利用可能な本は予約できない - 追加のチェック
    if (isBookAvailable(book)) {
      alert('この本は現在利用可能です。予約ではなく貸出を行ってください。')
      return
    }
    
    setIsReserving(true)
    try {
      console.log('Reserving book:', { bookId, userId: user.id, isAvailable: isBookAvailable(book) })
      await reservationsApi.reserveBook(bookId, user.id)
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

  // ユーザーが認証されていない場合
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-600">ログインが必要です</h2>
        <p className="text-gray-700 mb-6">書籍の詳細を表示するにはログインしてください</p>
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          ログインページへ
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
            {book.image_url ? (
              <div className="relative w-full h-64 md:h-80 rounded-md overflow-hidden shadow-md">
                <Image
                  src={book.image_url}
                  alt={`${book.title}の表紙`}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    // 画像読み込みエラー時のフォールバック
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/book-placeholder.svg';
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
              {/* 通常の貸出ボタン - 本が利用可能な場合 */}
              {isBookAvailable(book) && (
                <BorrowButton 
                  isAvailable={isBookAvailable(book)} 
                  isLoading={isBorrowing}
                  onBorrow={handleBorrow}
                  currentUserId={user.id}
                  currentBorrowerId={book.current_borrower_id}
                />
              )}
              
              {/* 予約準備完了の書籍を借りるボタン */}
              {!isBookAvailable(book) && userReservation && userReservation.status === 'ready' && (
                <button
                  onClick={handleBorrowReservedBook}
                  disabled={isBorrowing}
                  className={`flex w-full items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors ${
                    isBorrowing ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  {isBorrowing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      貸出処理中...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      予約書籍を借りる
                    </>
                  )}
                </button>
              )}
              
              {/* 予約ボタン - 本が貸出中で予約していない場合 */}
              {!isBookAvailable(book) && (!userReservation || userReservation.status !== 'ready') && (
                <ReservationButton 
                  bookId={book.id} 
                  isLoading={isReserving}
                  onReserve={handleReserve}
                  currentUserId={user.id}
                  reservationCount={reservationCount}
                />
              )}
              
              {/* 予約待機中の表示 */}
              {!isBookAvailable(book) && userReservation && userReservation.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">予約中</p>
                      <p className="text-sm text-yellow-600">
                        現在{userReservation.priority}番目の順番です。書籍が返却されるまでお待ちください。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 書籍詳細情報 */}
          <div className="md:w-2/3">
            
            {/* ステータス表示 */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                {isBookAvailable(book) ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-green-700 font-medium">利用可能</span>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700 font-medium">貸出中</span>
                  </>
                )}
              </div>
              
              {/* 予約数表示 */}
              {reservationCount > 0 && (
                <div className="flex items-center text-amber-600">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">{reservationCount}人が予約待ち</span>
                </div>
              )}
            </div>
            
            {/* 書籍情報 */}
            <div className="space-y-4">
              
              {/* ISBN */}
              {book.isbn && (
                <div className="flex items-start">
                  <TagIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">ISBN</p>
                    <p className="font-medium">{book.isbn}</p>
                  </div>
                </div>
              )}
              
              {/* 出版社 */}
              {book.publisher && (
                <div className="flex items-start">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">出版社</p>
                    <p className="font-medium">{book.publisher}</p>
                  </div>
                </div>
              )}
              
              {/* カテゴリ */}
              {(getBookCategories(book).length > 0 || book.category_structure?.major_category) && (
                <div className="flex items-start">
                  <TagIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">カテゴリ</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {/* 階層カテゴリ対応表示 */}
                      {book.category_structure?.major_category ? (
                        <>
                          {/* 大項目カテゴリ */}
                          <TagBadge tag={getBookMajorCategory(book)} />
                          {/* 中項目カテゴリ */}
                          {getBookMinorCategories(book).map((category, index) => (
                            <TagBadge key={index} tag={category} />
                          ))}
                        </>
                      ) : (
                        <>
                          {/* 旧形式の場合（後方互換性） */}
                          {getBookCategories(book).map((category, index) => (
                            <TagBadge key={index} tag={category} />
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* 配置場所 */}
              {book.location && (
                <div className="flex items-start">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">配置場所</p>
                    <p className="font-medium">{book.location}</p>
                  </div>
                </div>
              )}
              
              {/* 追加日 */}
              <div className="flex items-start">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">追加日</p>
                  <p className="font-medium">{formattedDate}</p>
                </div>
              </div>
              
              {/* 現在の借り手情報（管理者のみ表示） */}
              {!isBookAvailable(book) && book.current_borrower && user.role === 'admin' && (
                <div className="flex items-start">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">現在の借り手</p>
                    <p className="font-medium">{book.current_borrower}</p>
                  </div>
                </div>
              )}
              
              {/* 返却予定日 */}
              {!isBookAvailable(book) && book.due_date && (
                <div className="flex items-start">
                  <ClockIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">返却予定日</p>
                    <p className="font-medium">{formatDate(book.due_date)}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* 説明 */}
            {book.description && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">説明</h3>
                <p className="text-gray-700 leading-relaxed">{book.description}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 予約キュー */}
        {!isBookAvailable(book) && reservationQueue && reservationQueue.length > 0 && (
          <div className="border-t p-6">
            <ReservationQueue 
              reservations={reservationQueue} 
            />
          </div>
        )}
      </div>
    </div>
  )
} 