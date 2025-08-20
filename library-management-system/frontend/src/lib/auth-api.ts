import axios from 'axios';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '@/types/auth';

const API_BASE_URL = 'http://localhost:8000';

// 認証専用のAPIクライアント
const authApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// レスポンスインターセプターでエラーハンドリング
authApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 認証エラーの場合、ローカルストレージをクリア
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  // ログイン
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await authApiClient.post('/login', credentials);
    return response.data;
  },

  // ユーザー登録
  register: async (userData: RegisterRequest): Promise<User> => {
    const response = await authApiClient.post('/register', userData);
    return response.data;
  },

  // 現在のユーザー情報を取得
  getCurrentUser: async (token: string): Promise<User> => {
    const response = await authApiClient.get('/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // トークンをリフレッシュ
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await authApiClient.post('/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // ログアウト
  logout: async (token: string): Promise<void> => {
    await authApiClient.post('/logout', {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
}; 