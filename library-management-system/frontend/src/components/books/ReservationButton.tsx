import { useState } from 'react'
import { booksApi } from '@/lib/api'

interface ReservationButtonProps {
  bookId: number
  isAvailable: boolean
  reservationCount: number
}

export default function ReservationButton({ 
  bookId, 
  isAvailable, 
  reservationCount 
}: ReservationButtonProps) {
  const [loading, setLoading] = useState(false)
  const [reserved, setReserved] = useState(false)
  const [error, setError] = useState('')

  const handleReservation = async () => {
    setLoading(true)
    setError('')
    
    try {
      // 予約リクエストを送信（ユーザーID 1 は固定）
      await booksApi.reserveBook(bookId, 1)
      setReserved(true)
    } catch (err: any) {
      console.error('予約エラー:', err)
      setError(err.message || '予約できませんでした')
    } finally {
      setLoading(false)
    }
  }

  if (reserved) {
    return (
      <div className="w-full bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
        <p className="font-medium">予約が完了しました！</p>
        <p className="text-sm">順番が来たらお知らせします。</p>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleReservation}
        disabled={loading || isAvailable}
        className={`w-full px-4 py-2 rounded-md font-medium ${
          isAvailable
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : loading
            ? 'bg-primary-300 text-white cursor-wait'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            予約処理中...
          </span>
        ) : isAvailable ? (
          '現在利用可能です'
        ) : (
          `予約する (${reservationCount}人待ち)`
        )}
      </button>
      
      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
      
      {isAvailable && (
        <p className="mt-2 text-sm text-gray-600">
          この本は現在貸出可能です。直接借りることができます。
        </p>
      )}
    </div>
  )
} 