'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AiOutlineLoading3Quarters, AiOutlinePlus, AiOutlineCheck, AiOutlineClose } from 'react-icons/ai';

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
  const [myRequests, setMyRequests] = useState<PurchaseRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PurchaseRequest[]>([]);
  const [users, setUsers] = useState<Record<number, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user'); // 実際はログイン情報から取得
  const [userId, setUserId] = useState<number>(1); // 実際はログイン情報から取得
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // ユーザー一覧を取得
        const usersResponse = await fetch('http://localhost:8000/api/users');
        if (!usersResponse.ok) throw new Error('ユーザー情報の取得に失敗しました');
        const usersData = await usersResponse.json();
        
        // ユーザーIDをキーとするオブジェクトに変換
        const usersMap: Record<number, User> = {};
        usersData.forEach((user: User) => {
          usersMap[user.id] = user;
          // 現在のユーザー（ログインユーザー）を設定
          if (user.id === userId) {
            setUserRole(user.role);
          }
        });
        setUsers(usersMap);
        
        // 自分の申請一覧を取得
        const myRequestsResponse = await fetch(`http://localhost:8000/api/purchase-requests/user/${userId}`);
        if (!myRequestsResponse.ok) throw new Error('申請一覧の取得に失敗しました');
        const myRequestsData = await myRequestsResponse.json();
        setMyRequests(myRequestsData);
        
        // 管理者の場合、保留中の申請も取得
        if (userRole === 'admin' || usersMap[userId]?.role === 'admin') {
          const pendingResponse = await fetch('http://localhost:8000/api/purchase-requests/pending');
          if (!pendingResponse.ok) throw new Error('保留中の申請の取得に失敗しました');
          const pendingData = await pendingResponse.json();
          setPendingRequests(pendingData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : '申請データの取得中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [userId, userRole]);
  
  const handleApprove = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      const response = await fetch(`http://localhost:8000/api/purchase-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_id: userId }),
      });
      
      if (!response.ok) {
        throw new Error('申請の承認に失敗しました');
      }
      
      // 申請リストを更新
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      
      // 自分の申請リストも更新
      const updatedRequest = await response.json();
      setMyRequests(prev => 
        prev.map(req => req.id === requestId ? updatedRequest : req)
      );
      
    } catch (err) {
      console.error('Error approving request:', err);
      setError(err instanceof Error ? err.message : '申請の承認中にエラーが発生しました');
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleReject = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      const response = await fetch(`http://localhost:8000/api/purchase-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_id: userId }),
      });
      
      if (!response.ok) {
        throw new Error('申請の却下に失敗しました');
      }
      
      // 申請リストを更新
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      
      // 自分の申請リストも更新
      const updatedRequest = await response.json();
      setMyRequests(prev => 
        prev.map(req => req.id === requestId ? updatedRequest : req)
      );
      
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err instanceof Error ? err.message : '申請の却下中にエラーが発生しました');
    } finally {
      setActionLoading(null);
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">審査中</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">承認済</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">却下</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{status}</span>;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
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
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* 管理者の場合、承認待ちの申請を表示 */}
      {userRole === 'admin' && pendingRequests.length > 0 && (
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
                      <div className="text-sm text-gray-900">{users[request.user_id]?.full_name || `ID: ${request.user_id}`}</div>
                      <div className="text-sm text-gray-500">{users[request.user_id]?.department}</div>
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
                          disabled={actionLoading === request.id}
                          className="text-green-600 hover:text-green-900 flex items-center"
                        >
                          {actionLoading === request.id ? (
                            <AiOutlineLoading3Quarters className="animate-spin mr-1" />
                          ) : (
                            <AiOutlineCheck className="mr-1" />
                          )}
                          承認
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          {actionLoading === request.id ? (
                            <AiOutlineLoading3Quarters className="animate-spin mr-1" />
                          ) : (
                            <AiOutlineClose className="mr-1" />
                          )}
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
                            承認者: {users[request.approved_by]?.full_name || `ID: ${request.approved_by}`}
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