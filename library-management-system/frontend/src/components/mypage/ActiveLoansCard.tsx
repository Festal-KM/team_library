'use client'

import { useState } from 'react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { ja } from 'date-fns/locale'
import { BookOpenIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'

interface ActiveLoansCardProps {
  loans: any[]
}

export default function ActiveLoansCard({ loans }: ActiveLoansCardProps) {
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
        {loans.map((loan) => (
          <div 
            key={loan.loan_id} 
            className={`border rounded-lg p-4 ${isOverdue(loan.due_date) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
          >
            <div className="flex items-start">
              <div className="w-1/4 pr-4">
                <div className="relative w-full h-32 bg-gray-100 rounded overflow-hidden">
                  {loan.book_image ? (
                    <Image
                      src={loan.book_image}
                      alt={loan.book_title}
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
                    {loan.book_title}
                  </h3>
                </Link>
                
                <div className="mt-2 space-y-1">
                  <div className="flex items-start">
                    <ClockIcon className="h-4 w-4 text-gray-500 mt-0.5 mr-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">
                        借りた日: {formatDate(loan.borrowed_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    {isOverdue(loan.due_date) ? (
                      <ExclamationCircleIcon className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                    ) : (
                      <ClockIcon className="h-4 w-4 text-gray-500 mt-0.5 mr-1 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`text-sm ${isOverdue(loan.due_date) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        返却期限: {formatDueDate(loan.due_date)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex">
                  <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700">
                    返却する
                  </button>
                  {!isOverdue(loan.due_date) && (
                    <button className="ml-2 px-3 py-1 text-sm border border-primary-600 text-primary-600 rounded hover:bg-primary-50">
                      延長する
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 