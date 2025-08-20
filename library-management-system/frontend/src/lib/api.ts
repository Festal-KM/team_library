'use client'

import axios from 'axios'
import { Book, Loan, Reservation, CategoryListResponse } from '@/types/book'
import { User, UserStats } from '@/types/user'
import { PurchaseRequest, AmazonBookInfo } from '@/types/purchase'

// 統合APIサーバーのベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://52.194.188.193';

// APIクライアントの設定
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// リクエストインターセプターで認証トークンを自動追加
apiClient.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', {
      url: `${config.baseURL}${config.url}`,
      method: config.method,
      params: config.params
    });
    
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Token added to request');
    } else {
      console.log('⚠️ No token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプターで認証エラーをハンドリング
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response Success:', {
      url: response.config.url,
      status: response.status,
      dataLength: JSON.stringify(response.data).length
    });
    return response;
  },
  async (error) => {
    console.error('❌ API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data
    });
    
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // リフレッシュトークンを試行
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token: newRefreshToken } = response.data;
          
          // 新しいトークンを保存
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);
          
          // 元のリクエストを再試行
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // リフレッシュに失敗した場合はログアウト
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        // リフレッシュトークンがない場合はログイン画面へ
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// 画像URLのベースURL
export const imageBaseUrl = API_BASE_URL;

// 画像URLが有効か確認して、無効ならプレースホルダーを返す関数
export const getValidImageUrl = (url: string | undefined): string => {
  if (!url) return '/images/book-placeholder.svg';
  
  // バックエンドの画像は相対パスの場合、ベースURLを追加
  if (url && !url.startsWith('http') && !url.startsWith('/')) {
    return `${imageBaseUrl}/${url}`;
  } else if (url && !url.startsWith('http') && url.startsWith('/')) {
    return `${imageBaseUrl}${url}`;
  }
  
  return url;
};

// ダッシュボード統計のAPI
export const statsApi = {
  getDashboardStats: async (): Promise<{
    total_books: number;
    available_books: number;
    overdue_books: number;
    pending_requests: number;
  }> => {
    const response = await apiClient.get('/stats/dashboard');
    const data = response.data;
    
    console.log('Raw stats response:', data); // デバッグ用
    
    // バックエンドのレスポンス形式をフロントエンドが期待する形式に変換
    return {
      total_books: data.books?.total || 0,
      available_books: data.books?.available || 0,
      overdue_books: data.loans?.overdue || 0,
      pending_requests: data.purchase_requests?.pending || 0,
    };
  },
  
  getUserStats: async (userId: number): Promise<{
    user_id: number;
    loans: {
      active: number;
      overdue: number;
      total: number;
    };
    reservations: {
      active: number;
      total: number;
    };
    purchase_requests: {
      pending: number;
      approved: number;
      total: number;
    };
  }> => {
    const response = await apiClient.get(`/stats/user/${userId}`);
    return response.data;
  },
  
  getDebugBookStatus: async (): Promise<any[]> => {
    const response = await apiClient.get('/stats/debug/book-status');
    return response.data;
  }
}

// 書籍関連のAPI
export const booksApi = {
  // 書籍一覧を取得
  getBooks: async (params?: { 
    title?: string; 
    author?: string; 
    major_category?: string;
    minor_categories?: string[];
    available_only?: boolean;
    per_page?: number;
  }): Promise<Book[]> => {
    // デフォルトで全件表示（per_page=100）
    const searchParams = {
      ...params,
      per_page: params?.per_page || 100
    }
    const response = await apiClient.get('/books', { params: searchParams })
    // バックエンドのレスポンス形式に対応
    return response.data.books || response.data || []
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
      price?: number;
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
          cover_image: "",
          price: 0
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
      const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/reservations/count`);
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
    image_url?: string;
    location?: string;
    tags?: string[];
    donated_by?: number;
    donation_note?: string;
    estimated_price?: number;
    reason?: string;
  }): Promise<Book> => {
    try {
      // 購入リクエストと同じ形式でデータを送信
      const requestData = {
        title: bookData.title,
        author: bookData.author,
        publisher: bookData.publisher || '',
        isbn: bookData.isbn || '',
        publication_date: bookData.publication_date || '',
        category: bookData.category || 'その他',
        reason: bookData.description || bookData.reason || '',  // descriptionまたはreasonを使用
        image_url: bookData.image_url || '',
        cover_image: bookData.cover_image || '',  // 両方のフィールドをサポート
        location: bookData.location || '',
        estimated_price: bookData.estimated_price || null
      }
      
      console.log('送信データ:', requestData)
      const response = await apiClient.post('/books/import/json', requestData)
      return response.data
    } catch (error: any) {
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
  async reserveBook(bookId: number, userId: number): Promise<Reservation> {
    try {
      const response = await apiClient.post('/reservations', { book_id: bookId, user_id: userId })
      // バックエンドのレスポンス形式に対応
      return response.data.reservation || response.data
    } catch (error) {
      console.error('予約APIエラー:', error);
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

  // 管理者向け：延滞情報を含む詳細書籍一覧を取得
  getAdminBooksDetailed: async (params?: {
    page?: number;
    per_page?: number;
    status_filter?: 'all' | 'available' | 'borrowed' | 'overdue';
    title?: string;
    author?: string;
  }) => {
    const response = await apiClient.get('/books/admin/detailed', { params })
    return response.data
  },

  // 延滞中の貸出一覧を取得
  getOverdueLoansDetailed: async (params?: {
    page?: number;
    per_page?: number;
  }) => {
    const response = await apiClient.get('/books/admin/overdue', { params })
    return response.data
  },
}

// 貸出関連のAPI
export const loansApi = {
  // ユーザーの現在の貸出を取得
  getUserActiveLoans: async (userId: number): Promise<Loan[]> => {
    const response = await apiClient.get(`/loans/user/${userId}/active`)
    // バックエンドのレスポンス形式に対応
    return response.data.loans || response.data || []
  },

  // 書籍を借りる
  borrowBook: async (bookId: number, userId: number, days: number = 14): Promise<Loan> => {
    // 正しいリクエストボディ形式で送信
    try {
      console.log(`貸出リクエスト送信: book_id=${bookId}, user_id=${userId}, loan_period=${days}`)
      const response = await apiClient.post(`/books/${bookId}/borrow`, {
        user_id: userId,
        loan_period: days
      })
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
      const response = await apiClient.post(`/loans/${loanId}/return`, { notes: '' })
      console.log('返却レスポンス:', response.data)
      return {
        message: response.data.message,
        loan_id: loanId
      }
    } catch (error) {
      console.error('返却APIエラー:', error)
      throw error
    }
  },

  // 貸出期間を延長
  extendLoan: async (loanId: number, extensionDays: number = 7): Promise<{ message: string, loan: any, new_due_date: string }> => {
    try {
      const response = await apiClient.post(`/loans/${loanId}/extend`, { extension_days: extensionDays })
      return response.data
    } catch (error) {
      console.error('延長APIエラー:', error)
      throw error
    }
  },

  // 貸出期限切れの貸出を取得（管理者用）
  getOverdueLoans: async (): Promise<any[]> => {
    const response = await apiClient.get('/loans/overdue')
    return response.data
  },

  // ユーザー別貸出統計を取得（管理者用）
  getUserLoanStats: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/admin/stats/user-loans')
      return response.data
    } catch (error) {
      // APIエンドポイントが存在しない場合はダミーデータを返す
      console.warn('User loan stats API not available, using dummy data')
      return []
    }
  },

  // 書籍別貸出統計を取得（管理者用）
  getBookLoanStats: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/admin/stats/book-loans')
      return response.data
    } catch (error) {
      // APIエンドポイントが存在しない場合はダミーデータを返す
      console.warn('Book loan stats API not available, using dummy data')
      return []
    }
  }
}

// 予約関連のAPI
export const reservationsApi = {
  // ユーザーの予約一覧を取得
  getUserReservations: async (userId: number, activeOnly: boolean = false): Promise<Reservation[]> => {
    const params = activeOnly ? '?active_only=true' : ''
    const response = await apiClient.get(`/reservations/user/${userId}${params}`)
    // バックエンドのレスポンス形式に対応
    return response.data.reservations || response.data || []
  },

  // 書籍を予約
  reserveBook: async (bookId: number, userId: number): Promise<Reservation> => {
    try {
      const response = await apiClient.post('/reservations', { book_id: bookId, user_id: userId })
      return response.data
    } catch (error) {
      console.error('予約APIエラー:', error);
      throw error;
    }
  },

  // 予約をキャンセル
  cancelReservation: async (reservationId: number): Promise<{ message: string, reservation_id: number }> => {
    try {
      const response = await apiClient.post(`/reservations/${reservationId}/cancel`, { reason: '' })
      return {
        message: response.data.message,
        reservation_id: reservationId
      }
    } catch (error: any) {
      console.error('予約キャンセルAPIエラー:', error);
      throw error;
    }
  },

  // 予約を完了（貸出実行時）
  completeReservation: async (reservationId: number): Promise<{ message: string, reservation_id: number }> => {
    try {
      const response = await apiClient.post(`/reservations/${reservationId}/complete`)
      return {
        message: response.data.message,
        reservation_id: reservationId
      }
    } catch (error: any) {
      console.error('予約完了APIエラー:', error);
      throw error;
    }
  },

  // 書籍の予約キューを取得
  getBookReservationQueue: async (bookId: number): Promise<Reservation[]> => {
    try {
      const response = await apiClient.get(`/reservations/book/${bookId}/queue`)
      return response.data
    } catch (error) {
      console.error('予約キューAPIエラー:', error);
      throw error;
    }
  }
}

// 購入申請関連のAPI
export const purchaseRequestsApi = {
  // ユーザーの購入申請一覧を取得
  getUserRequests: async (userId: number): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get(`/purchase-requests/user/${userId}`)
    // バックエンドのレスポンス形式に対応
    return response.data.requests || response.data.purchase_requests || response.data || []
  },

  // AmazonのURLから書籍情報を取得
  getAmazonBookInfo: async (amazonUrl: string): Promise<AmazonBookInfo> => {
    try {
      const response = await apiClient.get(`/purchase-requests/amazon-info?amazon_url=${encodeURIComponent(amazonUrl)}`)
      
      // バックエンドのレスポンス形式に対応
      const bookInfo = response.data.book_info || response.data;
      
      // 基本的な情報が取得できない場合のみエラーとして扱う
      if (!bookInfo.title || 
          (bookInfo.title === 'タイトル不明' && 
           (!bookInfo.author || bookInfo.author === '著者不明'))) {
        throw new Error('書籍情報を取得できませんでした。URLを確認するか、手動で入力してください。');
      }
      
      return {
        title: bookInfo.title || "",
        author: bookInfo.author || "",
        publisher: bookInfo.publisher || "",
        isbn: bookInfo.isbn || "",
        price: bookInfo.price || 0,
        description: bookInfo.description || "",
        image_url: bookInfo.cover_image || "/images/book-placeholder.svg",
        cover_image: bookInfo.cover_image || "/images/book-placeholder.svg",
        url: amazonUrl
      };
    } catch (error) {
      console.error('Amazon情報取得エラー:', error)
      throw error
    }
  },

  // 新しい購入申請を作成
  createRequest: async (requestData: {
    user_id: number;
    amazon_url?: string;
    reason: string;
    title?: string;
    author?: string;
    publisher?: string;
    isbn?: string;
    price?: number;
    estimated_price?: number;
    cover_image?: string;
    image_url?: string;
    description?: string;
  }): Promise<PurchaseRequest> => {
    try {
      const response = await apiClient.post('/purchase-requests/', requestData)
      return response.data
    } catch (error) {
      console.error('購入申請作成エラー:', error)
      throw error
    }
  },

  // 承認待ちの購入申請一覧を取得（承認者・管理者用）
  getPendingRequests: async (): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get('/purchase-requests/pending')
    // バックエンドのレスポンス形式に対応
    return response.data.requests || response.data || []
  },

  // 全ての購入申請一覧を取得（管理者用）
  getAllPurchaseRequests: async (): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get('/purchase-requests/')
    // バックエンドのレスポンス形式に対応
    return response.data.requests || response.data || []
  },

  // 購入申請詳細を取得
  getPurchaseRequest: async (requestId: number): Promise<PurchaseRequest> => {
    const response = await apiClient.get(`/purchase-requests/${requestId}`)
    return response.data
  },

  // 購入申請を承認または却下（承認者・管理者用）
  processRequest: async (
    requestId: number, 
    approverId: number, 
    approve: boolean,
    comment?: string
  ): Promise<{ message: string, status: string }> => {
    const endpoint = approve ? `/purchase-requests/${requestId}/approve` : `/purchase-requests/${requestId}/reject`;
    const response = await apiClient.post(endpoint, {
      admin_notes: comment || ''
    });
    return {
      message: response.data.message,
      status: approve ? 'approved' : 'rejected'
    };
  },

  // 承認された申請を購入済みに設定（管理者用）
  markAsPurchased: async (requestId: number): Promise<{ message: string, status: string }> => {
    const response = await apiClient.post('/purchase-requests/purchased', { request_id: requestId })
    return response.data
  },

  // 購入申請を発注済みに設定（管理者用）
  markAsOrdered: async (requestId: number, notes?: string): Promise<{ message: string, status: string }> => {
    const response = await apiClient.post(`/purchase-requests/${requestId}/mark-ordered`, {
      admin_notes: notes || '発注済みにしました'
    });
    return response.data;
  },

  // 購入申請を受領済みに設定（管理者用）
  markAsReceived: async (requestId: number, notes?: string): Promise<{ message: string, status: string }> => {
    console.log('markAsReceived called with:', { requestId, notes })
    try {
      const response = await apiClient.post(`/purchase-requests/${requestId}/mark-received`, {
        admin_notes: notes || '受領完了・図書館追加済み'
      });
      console.log('markAsReceived response:', response.data)
      return response.data;
    } catch (error) {
      console.error('markAsReceived error:', error)
      throw error
    }
  },

  // 受領済み申請から書籍を図書館に追加（管理者用）
  addBookFromRequest: async (requestId: number, bookData?: {
    location?: string;
    category?: string;
    tags?: string[];
  }): Promise<{ message: string, book: any }> => {
    const response = await apiClient.post(`/purchase-requests/${requestId}/add-to-library`, bookData || {});
    return response.data;
  }
}

// ユーザー関連のAPI
export const usersApi = {
  // ユーザー一覧を取得（管理者用）
  getUsers: async (role?: string): Promise<User[]> => {
    const response = await apiClient.get('/users', { params: { role } })
    // バックエンドのレスポンス形式に対応
    return response.data.users || response.data || []
  },

  // ユーザー詳細を取得
  getUser: async (id: number): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  },

  // 新しいユーザーを作成（管理者用）
  createUser: async (userData: { 
    username: string; 
    email: string; 
    full_name: string; 
    password: string; 
    role?: string; 
    department?: string; 
  }): Promise<User> => {
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

// 認証関連のAPI
export const authApi = {
  // ログイン
  login: async (email: string, password: string): Promise<{ access_token: string, refresh_token: string, user: User }> => {
    const response = await apiClient.post('/auth/login', { email, password })
    return response.data
  },

  // ログアウト
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.error('ログアウトAPIエラー:', error)
    } finally {
      // ローカルストレージからトークンを削除
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  },

  // 現在のユーザー情報を取得
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

  // トークンをリフレッシュ
  refreshToken: async (refreshToken: string): Promise<{ access_token: string, refresh_token: string }> => {
    const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken })
    return response.data
  },

  async refreshAccessToken(refreshToken: string) {
    const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken })
    return response.data
  },

  // パスワード変更
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
    return response.data
  },

  // パスワードリセット（管理者用）
  resetPassword: async (userId: number): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/reset-password', {
      user_id: userId
    })
    return response.data
  }
}

// カテゴリ関連のAPI
export const categoryApi = {
  // カテゴリ構造を取得
  async getCategories() {
    const response = await apiClient.get('/books/categories')
    return response.data
  },

  // 指定した大項目の中項目一覧を取得
  async getMinorCategories(majorCategory: string) {
    const response = await apiClient.get(`/books/categories/${encodeURIComponent(majorCategory)}/minors`)
    return response.data
  },

  // カテゴリ別統計情報を取得
  async getCategoryStatistics() {
    const response = await apiClient.get('/books/statistics')
    return response.data
  },

  // 大項目カテゴリによる書籍一覧取得
  async getBooksByMajorCategory(
    majorCategory: string, 
    minorCategories?: string[], 
    limit: number = 50, 
    offset: number = 0
  ) {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())
    
    if (minorCategories && minorCategories.length > 0) {
      params.append('minor_categories', minorCategories.join(','))
    }
    
    const response = await apiClient.get(`/books/category/${encodeURIComponent(majorCategory)}?${params}`)
    return response.data
  }
} 