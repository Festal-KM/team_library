'use client'

import { BookmarkIcon, CheckCircleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ReservationsCardProps {
  reservations: any[]
}

export default function ReservationsCard({ reservations }: ReservationsCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日', { locale: ja })
    } catch (error) {
      return '日付不明'
    }
  }

  if (!reservations || reservations.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <BookmarkIcon className="h-5 w-5 text-primary-600 mr-2" />
          予約状況
        </h2>
        <div className="text-gray-500 py-4 text-center">
          現在予約している本はありません
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <BookmarkIcon className="h-5 w-5 text-primary-600 mr-2" />
        予約状況 <span className="ml-2 text-sm font-normal text-gray-500">{reservations.length}冊</span>
      </h2>

      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                書籍
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                予約日
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reservations.map((reservation) => (
              <tr key={reservation.reservation_id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 relative">
                      {reservation.book_image ? (
                        <Image
                          src={reservation.book_image}
                          alt={reservation.book_title}
                          layout="fill"
                          objectFit="cover"
                          className="rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                          <BookmarkIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <Link href={`/books/${reservation.book_id}`}>
                        <div className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline">
                          {reservation.book_title}
                        </div>
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(reservation.reserved_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {reservation.status === 'ready' ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" /> 受取可能
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      <ClockIcon className="h-4 w-4 mr-1" /> 予約待ち
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="text-red-600 hover:text-red-900 flex items-center justify-end"
                    onClick={() => console.log('予約キャンセル', reservation.reservation_id)}
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    キャンセル
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 