import { BookmarkIcon } from '@heroicons/react/24/outline'

interface ReservationButtonProps {
  bookId: number
  isLoading: boolean
  onReserve: () => void
  currentUserId: number
  reservationCount?: number
}

export default function ReservationButton({ 
  bookId, 
  isLoading,
  onReserve,
  currentUserId,
  reservationCount = 0
}: ReservationButtonProps) {
  return (
    <button
      onClick={onReserve}
      disabled={isLoading}
      className={`flex w-full items-center justify-center px-4 py-3 border border-primary-500 text-primary-700 bg-white rounded-md hover:bg-primary-50 transition-colors ${
        isLoading ? 'opacity-70 cursor-wait' : ''
      }`}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          予約処理中...
        </>
      ) : (
        <>
          <BookmarkIcon className="h-5 w-5 mr-2" />
          予約する {reservationCount > 0 && `(${reservationCount}人待ち)`}
        </>
      )}
    </button>
  )
} 