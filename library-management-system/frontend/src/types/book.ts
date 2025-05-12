export interface Book {
  id: number;
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  price?: number;
  page_count?: number;
  cover_image?: string;
  description?: string;
  category?: string;
  added_at: string;
  is_available: boolean;
  current_borrower_id?: number;
  location?: string;
}

export interface Loan {
  id: number;
  loan_id?: number;
  book_id: number;
  book_title?: string;
  book_image?: string;
  user_id: number;
  borrowed_at: string;
  due_date: string;
  returned_at?: string;
  is_returned: boolean;
}

export interface Reservation {
  id: number;
  reservation_id?: number;
  book_id: number;
  book_title?: string;
  book_image?: string;
  user_id: number;
  reserved_at: string;
  position: number;
  is_active: boolean;
  status?: string;
} 