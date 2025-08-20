'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AiOutlineLoading3Quarters, AiOutlinePlus, AiOutlineCheck, AiOutlineClose } from 'react-icons/ai';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseRequestsApi, usersApi } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';

interface PurchaseRequest {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  url: string | null;
  reason: string;
  user_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  approved_by: number | null;
  approved_at: string | null;
  amazon_info: {
    price: number;
    image_url: string;
    availability: string;
  } | null;
}

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  department: string;
  role: 'user' | 'admin';
}

const PurchaseRequestsPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';

  // ユーザー一覧を取得（管理者のみ）
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const result = await usersApi.getUsers();
      console.log('Users API Response:', result); // デバッグ用
      return result;
    },
    enabled: isAdmin,
  });

  // 自分の購入申請を取得
  const { data: myRequests = [], isLoading: myRequestsLoading, error: myRequestsError } = useQuery({
    queryKey: ['purchase-requests', 'user', user?.id],
    queryFn: () => purchaseRequestsApi.getUserRequests(user!.id),
    enabled: !!user?.id,
  });

  // 管理者の場合、保留中の申請を取得
  const { data: pendingRequests = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['purchase-requests', 'pending'],
    queryFn: () => purchaseRequestsApi.getPendingRequests(),
    enabled: isAdmin,
  });

  // ユーザーIDをキーとするマップを作成
  const usersMap = React.useMemo(() => {
    const map: Record<number, User> = {};
    if (Array.isArray(users)) {
      users.forEach((user: any) => {
        map[user.id] = {
          id: user.id,
          username: user.name || user.username,
          email: user.email,
          full_name: user.name || user.full_name,
          department: user.department,
          role: user.role,
        };
      });
    }
    return map;
  }, [users]);

  const isLoading = myRequestsLoading || (isAdmin && (usersLoading || pendingLoading));

  const handleApprove = async (requestId: number) => {
    if (!user?.id) return;
    
    try {
      await purchaseRequestsApi.processRequest(requestId, user.id, true);
      // キャッシュを無効化してデータを再取得
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    } catch (err) {
      console.error('Error approving request:', err);
      alert('申請の承認中にエラーが発生しました');
    }
  };
  
  const handleReject = async (requestId: number) => {
    if (!user?.id) return;
    
    try {
      await purchaseRequestsApi.processRequest(requestId, user.id, false);
      // キャッシュを無効化してデータを再取得
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('申請の却下中にエラーが発生しました');
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">審査中</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">承認済</span>;
      case 'ordered':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">発注済み</span>;
      case 'received':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">受領済み</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">完了</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">却下</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">不明</span>;
    }
  };
  
  // formatDate関数は @/lib/dateUtils からインポートするように変更

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">ユーザー情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <AiOutlineLoading3Quarters className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">購入申請管理</h1>
        <Link 
          href="/purchase-requests/new"
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <AiOutlinePlus className="mr-2" />
          新規申請
        </Link>
      </div>
      
      {myRequestsError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{myRequestsError instanceof Error ? myRequestsError.message : '申請データの取得中にエラーが発生しました'}</p>
        </div>
      )}
      
      {/* 管理者の場合、承認待ちの申請を表示 */}
      {isAdmin && pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">承認待ちの申請</h2>
          <div className="bg-white shadow rounded overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">書籍情報</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請者</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請日</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        {request.amazon_info?.image_url && (
                          <img 
                            src={request.amazon_info.image_url}
                            alt={request.title}
                            className="w-12 h-16 object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{request.title}</div>
                          {request.author && <div className="text-sm text-gray-500">{request.author}</div>}
                          {request.amazon_info?.price && (
                            <div className="text-sm text-gray-500">¥{request.amazon_info.price.toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{usersMap[request.user_id]?.full_name || `ID: ${request.user_id}`}</div>
                      <div className="text-sm text-gray-500">{usersMap[request.user_id]?.department}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusLabel(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="text-green-600 hover:text-green-900 flex items-center"
                        >
                          <AiOutlineCheck className="mr-1" />
                          承認
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <AiOutlineClose className="mr-1" />
                          却下
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* 自分の申請一覧 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">あなたの申請一覧</h2>
        {myRequests.length > 0 ? (
          <div className="bg-white shadow rounded overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">書籍情報</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請理由</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請日</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        {request.amazon_info?.image_url && (
                          <img 
                            src={request.amazon_info.image_url}
                            alt={request.title}
                            className="w-12 h-16 object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{request.title}</div>
                          {request.author && <div className="text-sm text-gray-500">{request.author}</div>}
                          {request.amazon_info?.price && (
                            <div className="text-sm text-gray-500">¥{request.amazon_info.price.toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">{request.reason}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {getStatusLabel(request.status)}
                        {request.status === 'approved' && request.approved_at && (
                          <span className="text-xs text-gray-500">
                            承認日: {formatDate(request.approved_at)}
                          </span>
                        )}
                        {request.approved_by && (
                          <span className="text-xs text-gray-500">
                            承認者: {usersMap[request.approved_by]?.full_name || `ID: ${request.approved_by}`}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded text-center">
            <p className="text-gray-500">申請履歴はありません</p>
            <Link 
              href="/purchase-requests/new"
              className="inline-block mt-4 text-blue-600 hover:text-blue-800"
            >
              新しい書籍を申請する
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseRequestsPage; 