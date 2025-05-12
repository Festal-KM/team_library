export enum UserRole {
  USER = "user",
  APPROVER = "approver",
  ADMIN = "admin"
}

export type User = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  department: string;
  role: 'user' | 'approver' | 'admin';
};

export interface UserStats {
  user_id: number;
  name: string;
  current_loans: number;
  past_loans: number;
  active_reservations: number;
  purchase_requests: number;
} 