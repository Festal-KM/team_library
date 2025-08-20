'use client'

import { useState } from 'react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { ja } from 'date-fns/locale'
import { BookOpenIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'
import { loansApi } from '@/lib/api'

interface ActiveLoansCardProps {
  loans: any[]
  onLoanUpdate?: () => void
}

export default function ActiveLoansCard({ loans, onLoanUpdate }: ActiveLoansCardProps) {
  const [loading, setLoading] = useState<number | null>(null)

  const isOverdue = (dueDate: string) => {
    return isPast(new Date(dueDate))
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'yyyy年MM月dd日', { locale: ja })
    } catch (error) {
      return '日付不明'
    }
  }

  const formatDueDate = (dueDate: string) => {
    try {
      const date = new Date(dueDate)
      const formattedDate = format(date, 'yyyy年MM月dd日', { locale: ja })
      const distance = formatDistanceToNow(date, { locale: ja, addSuffix: true })
      return `${formattedDate} (${distance})`
    } catch (error) {
      return '日付不明'
    }
  }

  const handleReturn = async (loanId: number) => {
    try {
      setLoading(loanId)
      await loansApi.returnBook(loanId)
      alert('書籍を返却しました')
      if (onLoanUpdate) {
        onLoanUpdate()
      }
    } catch (error) {
      console.error('返却エラー:', error)
      alert('返却に失敗しました。管理者にお問い合わせください。')
    } finally {
      setLoading(null)
    }
  }

  const handleExtend = async (loanId: number) => {
    try {
      setLoading(loanId)
      await loansApi.extendLoan(loanId, 7)
      alert('貸出期間を7日延長しました')
      if (onLoanUpdate) {
        onLoanUpdate()
      }
    } catch (error) {
      console.error('延長エラー:', error)
      alert('延長に失敗しました。管理者にお問い合わせください。')
    } finally {
      setLoading(null)
    }
  }

  if (!loans || loans.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <BookOpenIcon className="h-5 w-5 text-primary-600 mr-2" />
          現在の貸出
        </h2>
        <div className="text-gray-500 py-4 text-center">
          現在借りている本はありません
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <BookOpenIcon className="h-5 w-5 text-primary-600 mr-2" />
        現在の貸出 <span className="ml-2 text-sm font-normal text-gray-500">{loans.length}冊</span>
      </h2>

      <div className="space-y-4">
        {loans.map((loan) => {
          // 新しいデータ構造に対応
          const bookTitle = loan.book?.title || loan.book_title || `書籍ID: ${loan.book_id}`
          const bookImage = loan.book?.image_url || loan.book_image
          const loanId = loan.id || loan.loan_id
          const dueDate = loan.due_date
          const borrowedAt = loan.loan_date || loan.borrowed_at

          return (
            <div 
              key={loanId} 
              className={`border rounded-lg p-4 ${isOverdue(dueDate) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
            >
              <div className="flex items-start">
                <div className="w-1/4 pr-4">
                  <div className="relative w-full h-32 bg-gray-100 rounded overflow-hidden">
                    {bookImage ? (
                      <Image
                        src={bookImage}
                        alt={bookTitle}
                        layout="fill"
                        objectFit="cover"
                        className="rounded"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <BookOpenIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="w-3/4">
                  <Link href={`/books/${loan.book_id}`}>
                    <h3 className="text-lg font-medium text-primary-700 hover:text-primary-800 hover:underline">
                      {bookTitle}
                    </h3>
                  </Link>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-start">
                      <ClockIcon className="h-4 w-4 text-gray-500 mt-0.5 mr-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">
                          借りた日: {formatDate(borrowedAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      {isOverdue(dueDate) ? (
                        <ExclamationCircleIcon className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                      ) : (
                        <ClockIcon className="h-4 w-4 text-gray-500 mt-0.5 mr-1 flex-shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm ${isOverdue(dueDate) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          返却期限: {formatDueDate(dueDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex">
                    <button 
                      onClick={() => handleReturn(loanId)}
                      disabled={loading === loanId}
                      className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                      {loading === loanId ? '処理中...' : '返却する'}
                    </button>
                    {!isOverdue(dueDate) && (
                      <button 
                        onClick={() => handleExtend(loanId)}
                        disabled={loading === loanId}
                        className="ml-2 px-3 py-1 text-sm border border-primary-600 text-primary-600 rounded hover:bg-primary-50 disabled:opacity-50"
                      >
                        {loading === loanId ? '処理中...' : '延長する'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 