'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AiOutlineLoading3Quarters, AiOutlineSearch } from 'react-icons/ai';
import { useAuthStore } from '@/lib/auth-store';
import { purchaseRequestsApi } from '@/lib/api';
import { AmazonBookInfo } from '@/types/purchase';
import BookImage from '@/components/ui/BookImage';

const NewPurchaseRequestPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [amazonUrl, setAmazonUrl] = useState('');
  const [bookInfo, setBookInfo] = useState<AmazonBookInfo | null>(null);
  const [reason, setReason] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAmazonSearch = async () => {
    if (!amazonUrl.trim()) {
      setError('Amazon URLを入力してください');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const info = await purchaseRequestsApi.getAmazonBookInfo(amazonUrl);
      setBookInfo(info);
    } catch (err: any) {
      console.error('Amazon情報取得エラー:', err);
      setError('書籍情報の自動取得に失敗しました。URLを確認するか、下記のフォームに手動で入力してください。');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('ユーザー情報が取得できません');
      return;
    }

    if (!reason.trim()) {
      setError('申請理由を入力してください');
      return;
    }

    if (!bookInfo) {
      setError('書籍情報を取得してください');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const requestData = {
        user_id: user.id,
        amazon_url: amazonUrl,
        reason: reason.trim(),
        title: bookInfo.title,
        author: bookInfo.author,
        publisher: bookInfo.publisher,
        isbn: bookInfo.isbn,
        price: bookInfo.price,
        estimated_price: bookInfo.price,
        cover_image: bookInfo.cover_image,
        image_url: bookInfo.image_url,
        description: bookInfo.description,
      };

      await purchaseRequestsApi.createRequest(requestData);
      
      // 成功時は購入申請一覧ページにリダイレクト
      router.push('/purchase-requests');
    } catch (err: any) {
      console.error('購入申請作成エラー:', err);
      setError('申請の作成に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">ユーザー情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">新規購入申請</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amazon URL入力 */}
          <div>
            <label htmlFor="amazonUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Amazon URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                id="amazonUrl"
                value={amazonUrl}
                onChange={(e) => setAmazonUrl(e.target.value)}
                placeholder="https://www.amazon.co.jp/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={handleAmazonSearch}
                disabled={isSearching}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSearching ? (
                  <AiOutlineLoading3Quarters className="animate-spin mr-2" />
                ) : (
                  <AiOutlineSearch className="mr-2" />
                )}
                検索
              </button>
            </div>
          </div>

          {/* 書籍情報表示 */}
          {bookInfo && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">書籍情報</h3>
              <div className="flex space-x-4">
                                <div className="flex-shrink-0">
                  <BookImage
                    src={bookInfo.cover_image}
                    alt={bookInfo.title}
                    width={96}
                    height={128}
                    className="w-24 h-32"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{bookInfo.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">著者: {bookInfo.author}</p>
                  <p className="text-sm text-gray-600">出版社: {bookInfo.publisher}</p>
                  <p className="text-sm text-gray-600">ISBN: {bookInfo.isbn}</p>
                  <p className="text-sm text-gray-600">価格: ¥{bookInfo.price?.toLocaleString()}</p>
                  {bookInfo.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">{bookInfo.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 申請理由 */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              申請理由 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="この書籍が必要な理由を詳しく記載してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* 送信ボタン */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !bookInfo}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <AiOutlineLoading3Quarters className="animate-spin mr-2" />
                  申請中...
                </>
              ) : (
                '申請する'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPurchaseRequestPage; 