import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi } from '@/lib/api';
import { Loan } from '@/types/book';

// ユーザーのアクティブな貸出一覧
export const useUserActiveLoans = (userId: number) => {
  return useQuery({
    queryKey: ['user-active-loans', userId],
    queryFn: () => loansApi.getUserActiveLoans(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });
};

// 全ての貸出履歴（管理者用）
export const useAllLoans = () => {
  return useQuery({
    queryKey: ['all-loans'],
    queryFn: () => loansApi.getOverdueLoans(), // 実際のAPIに合わせて調整
    staleTime: 1 * 60 * 1000, // 1分間キャッシュ
    gcTime: 3 * 60 * 1000, // 3分間保持
  });
};

// 期限切れ貸出一覧（管理者用）
export const useOverdueLoans = () => {
  return useQuery({
    queryKey: ['overdue-loans'],
    queryFn: () => loansApi.getOverdueLoans(),
    staleTime: 1 * 60 * 1000, // 1分間キャッシュ
    gcTime: 3 * 60 * 1000, // 3分間保持
  });
};

// 書籍を借りる
export const useBorrowBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ bookId, userId, days = 14 }: { bookId: number; userId: number; days?: number }) => 
      loansApi.borrowBook(bookId, userId, days),
    onSuccess: (_, { userId }) => {
      // 関連するキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['user-active-loans', userId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['all-loans'] });
    },
  });
};

// 書籍を返却
export const useReturnBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (loanId: number) => loansApi.returnBook(loanId),
    onSuccess: () => {
      // 全ての貸出関連キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['user-active-loans'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['all-loans'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-loans'] });
    },
  });
};

// 貸出期限を延長
export const useExtendLoan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ loanId, additionalDays = 7 }: { loanId: number; additionalDays?: number }) => 
      loansApi.extendLoan(loanId, additionalDays),
    onSuccess: () => {
      // 貸出関連キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['user-active-loans'] });
      queryClient.invalidateQueries({ queryKey: ['all-loans'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-loans'] });
    },
  });
}; 