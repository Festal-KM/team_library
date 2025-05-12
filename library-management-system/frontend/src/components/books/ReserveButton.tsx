'use client'

import { BookmarkIcon } from '@heroicons/react/24/outline'

type ReserveButtonProps = {
  isLoading: boolean;
  onReserve: () => void;
  currentUserId: number;
  currentBorrowerId?: number | null;
  reservationsCount: number;
}

export default function ReserveButton({
  isLoading,
  onReserve,
  currentUserId,
  currentBorrowerId,
  reservationsCount
}: ReserveButtonProps) {
  // 自分が借りている場合、予約不可
  const isCurrentUserBorrower = currentBorrowerId === currentUserId

  if (isCurrentUserBorrower) {
    return null; // 自分が借りている場合は表示しない
  }

  return (
    <button
      onClick={onReserve}
      disabled={isLoading}
      className={`flex w-full items-center justify-center px-4 py-3 border border-secondary-500 text-secondary-700 bg-white rounded-md hover:bg-secondary-50 transition-colors ${
        isLoading ? 'opacity-70 cursor-wait' : ''
      }`}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-secondary-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          処理中...
        </>
      ) : (
        <>
          <BookmarkIcon className="h-5 w-5 mr-2" />
          予約する {reservationsCount > 0 && `(${reservationsCount}人待ち)`}
        </>
      )}
    </button>
  )
} 