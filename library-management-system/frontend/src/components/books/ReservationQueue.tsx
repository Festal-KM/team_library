import { format, isValid } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Reservation } from '@/types/book'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'

type ReservationQueueProps = {
  reservations: Reservation[];
}

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

export default function ReservationQueue({ reservations }: ReservationQueueProps) {
  // 現在のユーザーID（デモ用）
  const currentUserId = 1

  // ソート済みの予約リスト
  const sortedReservations = [...reservations].sort((a, b) => a.position - b.position)

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-4 py-3 bg-secondary-100 border-b border-secondary-200">
        <h3 className="font-medium text-secondary-800">
          予約順位 ({sortedReservations.length}人待ち)
        </h3>
      </div>
      
      <ul className="divide-y divide-gray-200">
        {sortedReservations.map((reservation) => (
          <ReservationItem 
            key={reservation.id} 
            reservation={reservation} 
            isCurrentUser={reservation.user_id === currentUserId}
          />
        ))}
      </ul>
    </div>
  )
}

function ReservationItem({ 
  reservation, 
  isCurrentUser 
}: { 
  reservation: Reservation; 
  isCurrentUser: boolean 
}) {
  // ユーザー情報を取得
  const { data: user } = useQuery({
    queryKey: ['user', reservation.user_id],
    queryFn: () => usersApi.getUser(reservation.user_id),
  })

  return (
    <li className={`px-4 py-3 ${isCurrentUser ? 'bg-secondary-50' : ''}`}>
      <div className="flex justify-between items-center">
        <div>
          <span className="font-medium">
            {isCurrentUser ? 'あなた' : (user?.name || `ユーザーID: ${reservation.user_id}`)}
          </span>
          
          {isCurrentUser && (
            <span className="ml-2 inline-block px-2 py-0.5 bg-secondary-100 text-secondary-800 rounded-full text-xs">
              あなたの予約
            </span>
          )}
          
          <div className="text-sm text-gray-500 mt-1">
            予約日: {formatDate(reservation.reserved_at)}
          </div>
        </div>
        
        <div className="text-center">
          <span className={`inline-block px-3 py-1 rounded-full text-white ${
            reservation.position === 1 
              ? 'bg-green-500' 
              : reservation.position === 2 
                ? 'bg-yellow-500' 
                : 'bg-gray-500'
          }`}>
            {reservation.position}番目
          </span>
          {reservation.position === 1 && (
            <div className="text-xs text-green-600 mt-1">次の貸出対象</div>
          )}
        </div>
      </div>
    </li>
  )
} 