'use client'

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

type BorrowButtonProps = {
  isAvailable: boolean;
  isLoading: boolean;
  onBorrow: () => void;
  currentUserId: number;
  currentBorrowerId?: number | null;
}

export default function BorrowButton({
  isAvailable,
  isLoading,
  onBorrow,
  currentUserId,
  currentBorrowerId
}: BorrowButtonProps) {
  // 自分が借りている場合
  const isCurrentUserBorrower = currentBorrowerId === currentUserId

  if (isCurrentUserBorrower) {
    return (
      <button
        disabled
        className="flex w-full items-center justify-center px-4 py-3 bg-green-100 text-green-800 rounded-md"
      >
        <CheckCircleIcon className="h-5 w-5 mr-2" />
        あなたが借りています
      </button>
    )
  }

  if (!isAvailable) {
    return (
      <button
        disabled
        className="flex w-full items-center justify-center px-4 py-3 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed"
      >
        <XCircleIcon className="h-5 w-5 mr-2" />
        貸出中
      </button>
    )
  }

  return (
    <button
      onClick={onBorrow}
      disabled={isLoading}
      className={`flex w-full items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${
        isLoading ? 'opacity-70 cursor-wait' : ''
      }`}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          処理中...
        </>
      ) : (
        '借りる'
      )}
    </button>
  )
} 