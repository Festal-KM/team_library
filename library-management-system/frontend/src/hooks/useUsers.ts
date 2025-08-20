import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { User, UserStats } from '@/types/user';

// ユーザー一覧取得（管理者用）
export const useUsers = (role?: string) => {
  return useQuery({
    queryKey: ['users', role],
    queryFn: () => usersApi.getUsers(role),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    gcTime: 10 * 60 * 1000, // 10分間保持
  });
};

// ユーザー詳細取得
export const useUser = (id: number) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getUser(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ユーザー統計情報取得
export const useUserStats = (id: number) => {
  return useQuery({
    queryKey: ['user-stats', id],
    queryFn: () => usersApi.getUserStats(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });
};

// ユーザー作成（管理者用）
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: { name: string; email: string; role?: string }) => 
      usersApi.createUser(userData),
    onSuccess: () => {
      // ユーザー一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// ユーザー更新（管理者用）
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => 
      usersApi.updateUser(id, data),
    onSuccess: (updatedUser) => {
      // 関連するキャッシュを更新
      queryClient.setQueryData(['user', updatedUser.id], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// ユーザー削除（管理者用）
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: (_, deletedId) => {
      // 削除されたユーザーのキャッシュを削除
      queryClient.removeQueries({ queryKey: ['user', deletedId] });
      queryClient.removeQueries({ queryKey: ['user-stats', deletedId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}; 