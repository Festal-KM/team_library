// 階層カテゴリ構造の型定義
export interface CategoryStructure {
  major_category: string;
  minor_categories: string[];
}

// カテゴリ一覧レスポンスの型
export interface CategoryListResponse {
  major_categories: string[];
  category_structure: Record<string, string[]>;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publication_date?: string;
  category?: string; // 後方互換性のため保持（非推奨）
  categories?: string[]; // 複数カテゴリ対応（後方互換性）
  category_structure?: CategoryStructure; // 新形式：階層カテゴリ構造
  description?: string;
  location?: string;
  status: string;
  is_available?: boolean; // バックエンドのis_availableフィールド
  total_copies?: number;
  available_copies?: number;
  image_url?: string;
  price?: number;
  current_borrower_id?: number;
  current_borrower_name?: string;
  added_at?: string;
  created_at: string;
  updated_at?: string;
}

// 書籍の利用可能性を判定するヘルパー関数
export function isBookAvailable(book: Book): boolean {
  // is_availableフィールドがある場合はそれを使用
  if (typeof book.is_available === 'boolean') {
    return book.is_available;
  }
  // フォールバック: statusフィールドから判定（大文字小文字を考慮）
  return book.status?.toLowerCase() === 'available';
}

export interface BookCreate {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publication_date?: string;
  categories?: string[]; // 複数カテゴリ対応（後方互換性）
  category_structure?: CategoryStructure; // 新形式：階層カテゴリ構造
  description?: string;
  location?: string;
  image_url?: string;
  price?: number;
}

export interface BookUpdate {
  title?: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  publication_date?: string;
  categories?: string[]; // 複数カテゴリ対応（後方互換性）
  category_structure?: CategoryStructure; // 新形式：階層カテゴリ構造
  description?: string;
  location?: string;
  image_url?: string;
  price?: number;
}

export interface BookFilter {
  category?: string;
  categories?: string[]; // 複数カテゴリでのフィルター対応（後方互換性）
  major_category?: string; // 大項目カテゴリフィルター
  minor_categories?: string[]; // 中項目カテゴリフィルター
  author?: string;
  status?: string;
  location?: string;
}

export interface BookSearchParams {
  query?: string;
  category?: string;
  categories?: string[]; // 複数カテゴリ検索対応（後方互換性）
  major_category?: string; // 大項目カテゴリ検索
  minor_categories?: string[]; // 中項目カテゴリ検索
  author?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ユーティリティ関数
export const getBookCategories = (book: Book): string[] => {
  // 新しいcategoriesフィールドがあれば使用
  if (book.categories && Array.isArray(book.categories)) {
    return book.categories;
  }
  // 旧形式のcategoryフィールドがあれば配列に変換
  if (book.category) {
    return [book.category];
  }
  return [];
};

export const getBookPrimaryCategory = (book: Book): string => {
  const categories = getBookCategories(book);
  return categories.length > 0 ? categories[0] : 'その他';
};

// 新しいユーティリティ関数：階層カテゴリ対応
export const getBookMajorCategory = (book: Book): string => {
  if (book.category_structure?.major_category) {
    return book.category_structure.major_category;
  }
  // 後方互換性：旧形式から推測
  const categories = getBookCategories(book);
  if (categories.length > 0) {
    const firstCategory = categories[0];
    // 簡単な推測ロジック（実際のマッピングは必要に応じて調整）
    if (firstCategory.includes('プログラミング') || firstCategory.includes('技術') || firstCategory.includes('開発')) {
      return '技術書';
    } else if (firstCategory.includes('ビジネス') || firstCategory.includes('経営')) {
      return 'ビジネス書';
    } else {
      return '一般書';
    }
  }
  return '技術書'; // デフォルト
};

export const getBookMinorCategories = (book: Book): string[] => {
  if (book.category_structure?.minor_categories) {
    return book.category_structure.minor_categories;
  }
  // 後方互換性：旧形式をそのまま返す
  return getBookCategories(book);
};

export const getBookCategoryDisplay = (book: Book): string => {
  const major = getBookMajorCategory(book);
  const minors = getBookMinorCategories(book);
  
  if (minors.length > 0) {
    return `${major} > ${minors.join(', ')}`;
  }
  return major;
};

export interface Loan {
  id: number;
  loan_id?: number;
  book_id: number;
  book_title?: string;
  book_author?: string;
  book_image?: string;
  user_id: number;
  borrowed_at: string;
  loan_date?: string;
  due_date: string;
  returned_at?: string;
  return_date?: string;
  is_returned: boolean;
  status?: string;
  // ネストされた書籍情報
  book?: {
    id: number;
    title: string;
    author: string;
    image_url?: string;
  };
}

export interface Reservation {
  id: number;
  user_id: number;
  book_id: number;
  reservation_date: string;
  expiry_date: string;
  status: 'pending' | 'ready' | 'completed' | 'cancelled' | 'expired';
  priority: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // 後方互換性のため
  reservation_id?: number;
  book_title?: string;
  book_author?: string;
  book_image?: string;
  reserved_at?: string;
  position?: number;
  is_active?: boolean;
  
  // ネストされた関連データ
  user?: {
    id: number;
    username: string;
    full_name: string;
    email: string;
  };
  book?: {
    id: number;
    title: string;
    author: string;
    isbn?: string;
    status: string;
  };
} 