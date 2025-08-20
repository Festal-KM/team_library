'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { loansApi } from '@/lib/api'
import { format, isPast, addDays, isValid } from 'date-fns'
import { ja } from 'date-fns/locale'
import { BookOpenIcon, ArrowRightIcon, ClockIcon, ArrowPathIcon, CalendarIcon } from '@heroicons/react/24/outline'
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

export default function MyBooksSection() {
  // 認証ストアから現在のユーザー情報を取得
  const { user, isReady } = useRequireAuth();
  const queryClient = useQueryClient();
  const [returningBooks, setReturningBooks] = useState<Record<number, boolean>>({});
  const [extendingBooks, setExtendingBooks] = useState<Record<number, boolean>>({});

  const { data: loansResponse, isLoading, error } = useQuery({
    queryKey: ['loans', 'active', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const result = await loansApi.getUserActiveLoans(user.id);
      console.log('API Response:', result);
      return result;
    },
    enabled: isReady && !!user?.id,
  })

  // APIレスポンスから配列を取得
  const loans = Array.isArray(loansResponse) ? loansResponse : (loansResponse as any)?.loans || [];

  const handleReturnBook = async (loanId: number) => {
    try {
      // 返却中の状態を設定
      setReturningBooks(prev => ({ ...prev, [loanId]: true }));
      
      // 本を返却するAPIを呼び出す
      await loansApi.returnBook(loanId);
      
      // キャッシュを更新して再取得
      await queryClient.invalidateQueries({ queryKey: ['loans'] });
      
      // 成功メッセージを表示
      alert('本を返却しました');
      
    } catch (error) {
      console.error('返却エラー:', error);
      alert('返却処理中にエラーが発生しました');
    } finally {
      // 返却中の状態を解除
      setReturningBooks(prev => ({ ...prev, [loanId]: false }));
    }
  };

  const handleExtendLoan = async (loanId: number, additionalDays: number = 7) => {
    try {
      // 延長中の状態を設定
      setExtendingBooks(prev => ({ ...prev, [loanId]: true }));
      
      // 貸出期限を延長するAPIを呼び出す
      const result = await loansApi.extendLoan(loanId, additionalDays);
      
      // キャッシュを更新して再取得
      await queryClient.invalidateQueries({ queryKey: ['loans'] });
      
      // 成功メッセージを表示
      alert(`貸出期限を${additionalDays}日延長しました。\n新しい返却期限: ${formatDate(result.new_due_date)}`);
      
    } catch (error) {
      console.error('延長エラー:', error);
      alert('延長処理中にエラーが発生しました');
    } finally {
      // 延長中の状態を解除
      setExtendingBooks(prev => ({ ...prev, [loanId]: false }));
    }
  };

  // ユーザーが認証されていない場合
  if (!isReady || !user) {
    return (
      <section className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold">借りている本</h3>
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
          <BookOpenIcon className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold">借りている本</h3>
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
      ) : !loans || loans.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>現在借りている本はありません</p>
          <Link href="/books" className="mt-2 inline-block text-primary-600 hover:text-primary-800">
            書籍を探す
          </Link>
        </div>
      ) : (
        <div className="divide-y">
          {loans.slice(0, 3).map((loan: any) => {
            // 新しいデータ構造に対応
            const bookTitle = loan.book?.title || loan.book_title || `書籍ID: ${loan.book_id}`
            const bookImage = loan.book?.image_url || loan.book_image
            const loanId = loan.id || loan.loan_id
            const borrowedAt = loan.loan_date || loan.borrowed_at
            
            // 安全な日付処理
            const dueDate = loan.due_date ? new Date(loan.due_date) : new Date();
            const isValidDueDate = isValid(dueDate);
            const isOverdue = isValidDueDate && isPast(dueDate);
            const daysLeft = isValidDueDate ? Math.ceil(
              (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            ) : 0;
            
            const isReturning = returningBooks[loanId];
            const isExtending = extendingBooks[loanId];
            
            return (
              <div key={loanId} className="py-3 flex items-start">
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
                    <BookOpenIcon className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <Link 
                    href={`/books/${loan.book_id}`} 
                    className="font-medium hover:text-primary-600 line-clamp-1"
                  >
                    {bookTitle}
                  </Link>
                  <div className="text-sm text-gray-500">
                    貸出日: {formatDate(borrowedAt)}
                  </div>
                  <div className={`flex items-center mt-1 text-sm ${
                    isOverdue ? 'text-red-600' : daysLeft <= 3 ? 'text-amber-600' : 'text-gray-600'
                  }`}>
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {isValidDueDate ? (
                      isOverdue ? (
                        <span>返却期限が{Math.abs(daysLeft)}日過ぎています</span>
                      ) : (
                        <span>返却期限まであと{daysLeft}日</span>
                      )
                    ) : (
                      <span>返却期限情報なし</span>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleReturnBook(loanId)}
                      disabled={isReturning || isExtending}
                      className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isReturning ? (
                        <>
                          <ArrowPathIcon className="h-3 w-3 mr-1 animate-spin" />
                          返却処理中...
                        </>
                      ) : (
                        '返却する'
                      )}
                    </button>
                    <button
                      onClick={() => handleExtendLoan(loanId)}
                      disabled={isReturning || isExtending}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isExtending ? (
                        <>
                          <ArrowPathIcon className="h-3 w-3 mr-1 animate-spin" />
                          延長中...
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          7日延長
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