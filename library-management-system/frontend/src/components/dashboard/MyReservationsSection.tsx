'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { reservationsApi } from '@/lib/api'
import { format, isValid } from 'date-fns'
import { ja } from 'date-fns/locale'
import { BookmarkIcon, ArrowRightIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useRequireAuth } from '@/hooks/useAuth'

// 安全な日付フォーマット関数
const formatDate = (dateString: string | null | undefined, formatStr: string = 'yyyy/MM/dd') => {
  if (!dateString) return '日付なし';
  
  const date = new Date(dateString);
  if (!isValid(date)) return '無効な日付';
  
  try {
    return format(date, formatStr, { locale: ja });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '日付エラー';
  }
};

export default function MyReservationsSection() {
  // 認証ストアから現在のユーザー情報を取得
  const { user, isReady } = useRequireAuth();
  const queryClient = useQueryClient();
  const [cancelingReservations, setCancelingReservations] = useState<Record<number, boolean>>({});

  const { data: reservationsResponse, isLoading, error } = useQuery({
    queryKey: ['reservations', user?.id, 'dashboard'],
    queryFn: async () => {
      if (!user?.id) return [];
      // アクティブな予約のみを取得
      const result = await reservationsApi.getUserReservations(user.id, true);
      console.log('Dashboard Reservations API Response:', result);
      return result;
    },
    enabled: isReady && !!user?.id,
  })

  // APIレスポンスから配列を取得し、最新の3件に制限
  const allReservations = Array.isArray(reservationsResponse) ? reservationsResponse : (reservationsResponse as any)?.reservations || [];
  // アクティブな予約のみをフィルタリングし、予約日の降順でソートして最新3件を取得
  const reservations = allReservations
    .filter((reservation: any) => {
      const status = reservation.status || 'pending';
      return status === 'pending' || status === 'ready';
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.reserved_at || a.reservation_date || 0);
      const dateB = new Date(b.reserved_at || b.reservation_date || 0);
      return dateB.getTime() - dateA.getTime(); // 降順（新しい順）
    })
    .slice(0, 3); // 最新3件に制限

  const handleCancelReservation = async (reservationId: number) => {
    try {
      // キャンセル中の状態を設定
      setCancelingReservations(prev => ({ ...prev, [reservationId]: true }));
      
      // 予約をキャンセルするAPIを呼び出す
      await reservationsApi.cancelReservation(reservationId);
      
      // キャッシュを更新して再取得
      await queryClient.invalidateQueries({ queryKey: ['reservations'] });
      
      // 成功メッセージを表示
      alert('予約をキャンセルしました');
      
    } catch (error) {
      console.error('キャンセルエラー:', error);
      alert('キャンセル処理中にエラーが発生しました');
    } finally {
      // キャンセル中の状態を解除
      setCancelingReservations(prev => ({ ...prev, [reservationId]: false }));
    }
  };

  // ユーザーが認証されていない場合
  if (!isReady || !user) {
    return (
      <section className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold">予約中の本</h3>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>ログインしてください</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="h-5 w-5 text-primary-600" />
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
          <p>現在予約中の本はありません</p>
          <Link href="/books" className="mt-2 inline-block text-primary-600 hover:text-primary-800">
            書籍を探す
          </Link>
        </div>
      ) : (
        <div className="divide-y">
          {reservations.map((reservation: any) => {
            // 新しいデータ構造に対応
            const bookTitle = reservation.book?.title || reservation.book_title || `書籍ID: ${reservation.book_id}`
            const bookImage = reservation.book?.image_url || reservation.book_image
            const reservationId = reservation.id || reservation.reservation_id
            const reservedAt = reservation.reserved_at || reservation.reservation_date
            const status = reservation.status || 'pending'
            
            const isCanceling = cancelingReservations[reservationId];
            
            return (
              <div key={reservationId} className="py-3 flex items-start">
                <div className="flex-shrink-0 w-12 h-16 bg-gray-100 mr-3 relative">
                  {bookImage ? (
                    <Image 
                      src={bookImage} 
                      alt={bookTitle}
                      width={48}
                      height={64}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center text-gray-400 ${bookImage ? 'hidden' : ''}`}>
                    <BookmarkIcon className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <Link 
                    href={`/books/${reservation.book_id}`} 
                    className="font-medium hover:text-primary-600 line-clamp-1"
                  >
                    {bookTitle}
                  </Link>
                  <div className="text-sm text-gray-500">
                    予約日: {formatDate(reservedAt)}
                  </div>
                  <div className="flex items-center mt-1 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      status === 'active' ? 'bg-green-100 text-green-800' :
                      status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {status === 'active' ? '予約中' :
                       status === 'pending' ? '待機中' :
                       status}
                    </span>
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleCancelReservation(reservationId)}
                      disabled={isCanceling}
                      className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isCanceling ? (
                        <>
                          <ArrowPathIcon className="h-3 w-3 mr-1 animate-spin" />
                          キャンセル中...
                        </>
                      ) : (
                        <>
                          <XMarkIcon className="h-3 w-3 mr-1" />
                          予約キャンセル
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
} 