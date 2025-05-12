'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { reservationsApi } from '@/lib/api'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowPathIcon, ArrowRightIcon, BookmarkIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function MyReservationsSection() {
  // ユーザーID（実際にはコンテキストから取得）
  const userId = 1;  // デモ用に固定
  const queryClient = useQueryClient();

  const { data: reservations, isLoading, error } = useQuery({
    queryKey: ['reservations', 'user', userId],
    queryFn: () => reservationsApi.getUserReservations(userId),
  })

  const handleCancelReservation = async (reservation: any) => {
    if (!window.confirm('予約をキャンセルしますか？')) return;
    
    try {
      // reservation_id 又は id を使用（APIの互換性のため）
      const reservationId = reservation.reservation_id || reservation.id;
      if (!reservationId) {
        throw new Error('予約IDが見つかりません');
      }
      
      await reservationsApi.cancelReservation(reservationId);
      alert('予約をキャンセルしました');
      
      // データを再取得
      queryClient.invalidateQueries({ queryKey: ['reservations', 'user', userId] });
    } catch (err) {
      console.error('予約キャンセルエラー:', err);
      alert('予約のキャンセルに失敗しました');
    }
  };

  return (
    <section className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="h-5 w-5 text-secondary-600" />
          <h3 className="text-lg font-semibold">予約中の本</h3>
        </div>
        <Link href="/mypage" className="text-sm text-primary-600 hover:text-primary-800 flex items-center">
          すべて見る
          <ArrowRightIcon className="ml-1 h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          データの取得に失敗しました
        </div>
      ) : !reservations || reservations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>現在予約している本はありません</p>
          <Link href="/books" className="mt-2 inline-block text-primary-600 hover:text-primary-800">
            書籍を探す
          </Link>
        </div>
      ) : (
        <div className="divide-y">
          {reservations.slice(0, 3).map(reservation => (
            <div key={reservation.reservation_id || reservation.id} className="py-3 flex items-start">
              <div className="flex-shrink-0 w-12 h-16 bg-gray-100 mr-3 relative">
                {reservation.book_image ? (
                  <Image 
                    src={reservation.book_image} 
                    alt={reservation.book_title || `書籍ID: ${reservation.book_id}`}
                    width={48}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <BookmarkIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <Link 
                  href={`/books/${reservation.book_id}`} 
                  className="font-medium hover:text-primary-600 line-clamp-1"
                >
                  {reservation.book_title || `書籍ID: ${reservation.book_id}`}
                </Link>
                <div className="text-sm text-gray-500">
                  予約日: {format(new Date(reservation.reserved_at), 'yyyy/MM/dd', { locale: ja })}
                </div>
                <div className="flex items-center mt-1">
                  <span className="px-2 py-0.5 bg-secondary-100 text-secondary-800 rounded-full text-xs">
                    予約中
                  </span>
                </div>
              </div>
              <button 
                className="ml-3 p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors"
                title="予約をキャンセル"
                onClick={() => handleCancelReservation(reservation)}
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
} 