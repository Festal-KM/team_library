export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  department?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'user' | 'approver' | 'admin';
  department?: string;
  is_active: boolean;
}

export interface CreateUserData {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role?: 'user' | 'approver' | 'admin';
  department?: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterRequest) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  setLoading: (loading: boolean) => void;
} 