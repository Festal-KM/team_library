'use client'

import axios from 'axios'
import { Book, Loan, Reservation } from '@/types/book'
import { User, UserStats } from '@/types/user'
import { PurchaseRequest, AmazonBookInfo } from '@/types/purchase'

// APIクライアントの設定
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ダッシュボード統計のAPI
export const statsApi = {
  getDashboardStats: async (): Promise<{
    total_books: number;
    available_books: number;
    overdue_books: number;
    pending_requests: number;
  }> => {
    const response = await axios.get('http://localhost:8001/api/stats/dashboard');
    return response.data;
  },
  
  getDebugBookStatus: async (): Promise<any[]> => {
    const response = await axios.get('http://localhost:8001/api/debug/book-status');
    return response.data;
  }
}

// 書籍関連のAPI
export const booksApi = {
  // 書籍一覧を取得
  getBooks: async (params?: { 
    title?: string; 
    author?: string; 
    category?: string; 
    available_only?: boolean 
  }): Promise<Book[]> => {
    const response = await apiClient.get('/books', { params })
    return response.data
  },

  // 書籍詳細を取得
  getBook: async (id: number): Promise<Book> => {
    const response = await apiClient.get(`/books/${id}`)
    return response.data
  },

  // ISBNから書籍情報を検索
  searchByIsbn: async (isbn: string): Promise<{
    source: string;
    book_data: {
      title: string;
      author: string;
      publisher: string;
      isbn: string;
      publication_date: string;
      category: string;
      description: string;
      cover_image: string;
    }
  }> => {
    try {
      const response = await apiClient.get(`/books/search/isbn/${isbn}`)
      return response.data
    } catch (error) {
      console.error('ISBN検索エラー:', error)
      // エラーの場合は空のデータを返す
      return {
        source: "error",
        book_data: {
          title: "",
          author: "",
          publisher: "",
          isbn: isbn,
          publication_date: "",
          category: "",
          description: "",
          cover_image: ""
        }
      }
    }
  },

  // 書籍IDから詳細を取得する
  async getBookById(id: number): Promise<any> {
    try {
      const response = await apiClient.get(`/books/${id}`);
      return response.data;
    } catch (error) {
      console.error('書籍詳細の取得に失敗しました:', error);
      throw error;
    }
  },

  // 書籍の予約数を取得する
  async getBookReservationCount(bookId: number): Promise<number> {
    try {
      // 予約専用APIを使用
      const response = await fetch(`http://localhost:8002/api/books/${bookId}/reservations/count`);
      const data = await response.json();
      return data.reservation_count || 0;
    } catch (error) {
      console.error('予約数取得エラー:', error);
      return 0;
    }
  },

  // 書籍をインポート（寄贈登録）
  importBook: async (bookData: {
    title: string;
    author: string;
    publisher?: string;
    isbn?: string;
    publication_date?: string;
    category?: string;
    description?: string;
    cover_image?: string;
    location?: string;
    tags?: string[];
    donated_by?: number;
    donation_note?: string;
  }): Promise<Book> => {
    try {
      // JSON形式のエンドポイントを使用
      const response = await axios.post('http://localhost:8000/api/books/import/json', bookData, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error) {
      console.error('書籍インポートエラー:', error)
      throw error
    }
  },

  // 新しい書籍を作成（管理者のみ）
  createBook: async (bookData: Omit<Book, 'id' | 'added_at' | 'is_available' | 'current_borrower_id'>): Promise<Book> => {
    const response = await apiClient.post('/books', bookData)
    return response.data
  },

  // 書籍情報を更新（管理者のみ）
  updateBook: async (id: number, bookData: Partial<Book>): Promise<Book> => {
    const response = await apiClient.put(`/books/${id}`, bookData)
    return response.data
  },

  // 書籍を削除（管理者のみ）
  deleteBook: async (id: number): Promise<{ message: string, id: number }> => {
    const response = await apiClient.delete(`/books/${id}`)
    return response.data
  },

  // 書籍を予約する
  async reserveBook(bookId: number, userId: number): Promise<any> {
    try {
      // 予約専用APIを使用
      const response = await fetch(`http://localhost:8002/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          book_id: bookId,
          user_id: userId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '予約に失敗しました');
      }
      
      return await response.json();
    } catch (error) {
      console.error('書籍予約エラー:', error);
      throw error;
    }
  },

  // 全ての購入リクエストを取得
  getAllPurchaseRequests: async (): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get('/purchase-requests')
    return response.data
  },

  // 保留中の購入リクエストを取得
  getPendingPurchaseRequests: async (): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get('/purchase-requests/pending')
    return response.data
  },

  // ユーザーの購入リクエストを取得
  getUserPurchaseRequests: async (userId: number): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get(`/purchase-requests/user/${userId}`)
    return response.data
  },

  // 購入リクエストを承認
  approvePurchaseRequest: async (requestId: number, adminId: number): Promise<PurchaseRequest> => {
    const response = await apiClient.put(`/purchase-requests/${requestId}/approve`, { admin_id: adminId })
    return response.data
  },

  // 購入リクエストを却下
  rejectPurchaseRequest: async (requestId: number, adminId: number): Promise<PurchaseRequest> => {
    const response = await apiClient.put(`/purchase-requests/${requestId}/reject`, { admin_id: adminId })
    return response.data
  },
  
  // ユーザー一覧を取得
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/users')
    return response.data
  },

  // 全ての貸出履歴を取得
  getAllLoans: async (): Promise<Loan[]> => {
    const response = await apiClient.get('/loans')
    return response.data
  },
  
  // アクティブな貸出のみを取得
  getActiveLoans: async (): Promise<Loan[]> => {
    const response = await apiClient.get('/loans/active')
    return response.data
  },
  
  // 期限切れの貸出を取得
  getOverdueLoans: async (): Promise<Loan[]> => {
    const response = await apiClient.get('/loans/overdue')
    return response.data
  },
}

// 貸出関連のAPI
export const loansApi = {
  // ユーザーの現在の貸出を取得
  getUserActiveLoans: async (userId: number): Promise<Loan[]> => {
    const response = await apiClient.get(`/loans/user/${userId}/active`)
    return response.data
  },

  // 書籍を借りる
  borrowBook: async (bookId: number, userId: number, days: number = 14): Promise<Loan> => {
    // ユーザーIDをリクエストボディとして送信
    try {
      console.log(`貸出リクエスト送信: book_id=${bookId}, user_id=${userId}`)
      const response = await apiClient.post(`/books/${bookId}/borrow`, userId)
      console.log('貸出レスポンス:', response.data)
      return response.data
    } catch (error) {
      console.error('貸出APIエラー:', error)
      throw error
    }
  },

  // 書籍を返却
  returnBook: async (loanId: number): Promise<{ message: string, loan_id: number }> => {
    try {
      console.log(`返却リクエスト送信: loan_id=${loanId}`)
      const response = await apiClient.post('/loans/return', { loan_id: loanId })
      console.log('返却レスポンス:', response.data)
      return response.data
    } catch (error) {
      console.error('返却APIエラー:', error)
      throw error
    }
  },

  // 貸出期限を延長する
  extendLoan: async (loanId: number, additionalDays: number = 7): Promise<{ message: string, loan_id: number, new_due_date: string }> => {
    try {
      console.log(`延長リクエスト送信: loan_id=${loanId}, additionalDays=${additionalDays}`)
      const response = await apiClient.post('/loans/extend', { loan_id: loanId, additional_days: additionalDays })
      console.log('延長レスポンス:', response.data)
      return response.data
    } catch (error) {
      console.error('貸出延長APIエラー:', error)
      throw error
    }
  },

  // 貸出期限切れの貸出を取得（管理者用）
  getOverdueLoans: async (): Promise<Loan[]> => {
    const response = await apiClient.get('/loans/overdue')
    return response.data
  }
}

// 予約関連のAPI
export const reservationsApi = {
  // ユーザーの予約一覧を取得
  getUserReservations: async (userId: number): Promise<Reservation[]> => {
    const response = await apiClient.get(`/reservations/user/${userId}`)
    return response.data
  },

  // 書籍を予約
  reserveBook: async (bookId: number, userId: number): Promise<Reservation> => {
    // 予約専用APIを使用
    try {
      const response = await axios.post('http://localhost:8002/api/reservations', { book_id: bookId, user_id: userId })
      return response.data
    } catch (error: any) {
      console.error('予約APIエラー:', error);
      // メインAPIにフォールバック
      if (error.code === 'ECONNREFUSED' || error.message.includes('Connection refused')) {
        console.log('予約専用APIに接続できないため、メインAPIを使用します');
        const mainResponse = await apiClient.post('/reservations', { book_id: bookId, user_id: userId });
        return mainResponse.data;
      }
      throw error;
    }
  },

  // 予約をキャンセル
  cancelReservation: async (reservationId: number): Promise<{ message: string, reservation_id: number }> => {
    // 予約専用APIを使用
    try {
      const response = await axios.post('http://localhost:8002/api/reservations/cancel', { reservation_id: reservationId })
      return response.data
    } catch (error: any) {
      console.error('予約キャンセルAPIエラー:', error);
      // メインAPIにフォールバック
      if (error.code === 'ECONNREFUSED' || error.message.includes('Connection refused')) {
        console.log('予約専用APIに接続できないため、メインAPIを使用します');
        const mainResponse = await apiClient.post('/reservations/cancel', { reservation_id: reservationId });
        return mainResponse.data;
      }
      
      // パスパラメータのエンドポイントを試す
      if (error.response && error.response.status === 404) {
        console.log('別のエンドポイント形式を試します');
        const pathResponse = await axios.post(`http://localhost:8002/api/reservations/cancel/${reservationId}`);
        return pathResponse.data;
      }
      
      throw error;
    }
  },

  // 書籍の予約キューを取得
  getBookReservationQueue: async (bookId: number): Promise<Reservation[]> => {
    // 予約専用APIを使用
    try {
      const response = await axios.get(`http://localhost:8002/api/reservations/book/${bookId}/queue`)
      return response.data
    } catch (error: any) {
      console.error('予約キューAPIエラー:', error);
      // メインAPIにフォールバック
      if (error.code === 'ECONNREFUSED' || error.message.includes('Connection refused')) {
        console.log('予約専用APIに接続できないため、メインAPIを使用します');
        const mainResponse = await apiClient.get(`/reservations/book/${bookId}/queue`);
        return mainResponse.data;
      }
      throw error;
    }
  }
}

// 購入申請関連のAPI
export const purchaseRequestsApi = {
  // ユーザーの購入申請一覧を取得
  getUserRequests: async (userId: number): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get(`/purchase-requests/user/${userId}`)
    return response.data
  },

  // AmazonのURLから書籍情報を取得
  getAmazonBookInfo: async (amazonUrl: string): Promise<AmazonBookInfo> => {
    const response = await apiClient.post('/purchase-requests/amazon/info', { url: amazonUrl })
    return response.data
  },

  // 新しい購入申請を作成
  createRequest: async (requestData: {
    user_id: number;
    amazon_url: string;
    reason: string;
    title?: string;
    author?: string;
    publisher?: string;
    isbn?: string;
    price?: number;
    cover_image?: string;
    description?: string;
  }): Promise<PurchaseRequest> => {
    const response = await apiClient.post('/purchase-requests', requestData)
    return response.data
  },

  // 承認待ちの購入申請一覧を取得（承認者・管理者用）
  getPendingRequests: async (): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get('/purchase-requests/pending')
    return response.data
  },

  // 購入申請を承認または却下（承認者・管理者用）
  processRequest: async (
    requestId: number, 
    approverId: number, 
    approve: boolean,
    comment?: string
  ): Promise<{ message: string, status: string }> => {
    const response = await apiClient.post('/purchase-requests/process', {
      request_id: requestId,
      approver_id: approverId,
      approve,
      comment
    })
    return response.data
  },

  // 承認された申請を購入済みに設定（管理者用）
  markAsPurchased: async (requestId: number): Promise<{ message: string, status: string }> => {
    const response = await apiClient.post('/purchase-requests/purchased', { request_id: requestId })
    return response.data
  }
}

// ユーザー関連のAPI
export const usersApi = {
  // ユーザー一覧を取得（管理者用）
  getUsers: async (role?: string): Promise<User[]> => {
    const response = await apiClient.get('/users', { params: { role } })
    return response.data
  },

  // ユーザー詳細を取得
  getUser: async (id: number): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  },

  // ユーザーの統計情報を取得
  getUserStats: async (id: number): Promise<UserStats> => {
    const response = await apiClient.get(`/users/${id}/stats`)
    return response.data
  },

  // 新しいユーザーを作成（管理者用）
  createUser: async (userData: { name: string, email: string, role?: string }): Promise<User> => {
    const response = await apiClient.post('/users', userData)
    return response.data
  },

  // ユーザー情報を更新（管理者用）
  updateUser: async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, userData)
    return response.data
  },

  // ユーザーを削除（管理者用）
  deleteUser: async (id: number): Promise<{ message: string, id: number }> => {
    const response = await apiClient.delete(`/users/${id}`)
    return response.data
  }
} 