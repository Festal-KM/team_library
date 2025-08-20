import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '@/lib/api';
import { Book } from '@/types/book';

// 書籍一覧取得
export const useBooks = (params?: { 
  title?: string; 
  author?: string; 
  category?: string; 
  available_only?: boolean 
}) => {
  return useQuery({
    queryKey: ['books', params],
    queryFn: () => booksApi.getBooks(params),
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
  });
};

// 書籍詳細取得
export const useBook = (id: number) => {
  return useQuery({
    queryKey: ['book', id],
    queryFn: () => booksApi.getBook(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ISBN検索
export const useIsbnSearch = (isbn: string) => {
  return useQuery({
    queryKey: ['isbn-search', isbn],
    queryFn: () => booksApi.searchByIsbn(isbn),
    enabled: !!isbn && isbn.length >= 10,
    staleTime: 30 * 60 * 1000, // ISBN検索結果は30分キャッシュ
    gcTime: 60 * 60 * 1000, // 1時間保持
  });
};

// 書籍作成
export const useCreateBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bookData: Omit<Book, 'id' | 'created_at' | 'status' | 'total_copies' | 'available_copies'>) => 
      booksApi.createBook(bookData),
    onSuccess: () => {
      // 書籍一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

// 書籍更新
export const useUpdateBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Book> }) => 
      booksApi.updateBook(id, data),
    onSuccess: (updatedBook) => {
      // 関連するキャッシュを更新
      queryClient.setQueryData(['book', updatedBook.id], updatedBook);
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

// 書籍削除
export const useDeleteBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => booksApi.deleteBook(id),
    onSuccess: (_, deletedId) => {
      // 削除された書籍のキャッシュを削除
      queryClient.removeQueries({ queryKey: ['book', deletedId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

// 書籍インポート
export const useImportBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bookData: {
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
    }) => booksApi.importBook(bookData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}; 