import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '@/lib/api';
import { Reservation } from '@/types/book';

// ユーザーの予約一覧
export const useUserReservations = (userId: number) => {
  return useQuery({
    queryKey: ['user-reservations', userId],
    queryFn: () => reservationsApi.getUserReservations(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });
};

// 書籍の予約キュー
export const useBookReservationQueue = (bookId: number) => {
  return useQuery({
    queryKey: ['book-reservation-queue', bookId],
    queryFn: () => reservationsApi.getBookReservationQueue(bookId),
    enabled: !!bookId,
    staleTime: 1 * 60 * 1000, // 1分間キャッシュ
    gcTime: 3 * 60 * 1000, // 3分間保持
  });
};

// 書籍を予約
export const useReserveBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ bookId, userId }: { bookId: number; userId: number }) => 
      reservationsApi.reserveBook(bookId, userId),
    onSuccess: (_, { bookId, userId }) => {
      // 関連するキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['user-reservations', userId] });
      queryClient.invalidateQueries({ queryKey: ['book-reservation-queue', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

// 予約をキャンセル
export const useCancelReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (reservationId: number) => reservationsApi.cancelReservation(reservationId),
    onSuccess: () => {
      // 全ての予約関連キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['user-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['book-reservation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}; 