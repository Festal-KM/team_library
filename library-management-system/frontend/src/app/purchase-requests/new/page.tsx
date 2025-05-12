'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { FaAmazon } from 'react-icons/fa';

interface AmazonInfo {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  price: number;
  image_url: string;
  availability: string;
}

const PurchaseRequestPage = () => {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    url: '',
    reason: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [amazonInfo, setAmazonInfo] = useState<AmazonInfo | null>(null);
  const [amazonLoading, setAmazonLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const fetchAmazonInfo = async () => {
    if (!formData.url || !formData.url.includes('amazon')) {
      setErrorMessage('AmazonのURLを入力してください');
      return;
    }
    
    setAmazonLoading(true);
    setErrorMessage('');
    try {
      console.log(`Amazon情報取得リクエスト: ${formData.url}`);
      const response = await fetch(`http://localhost:8000/api/amazon/info?url=${encodeURIComponent(formData.url)}`);
      
      if (!response.ok) {
        throw new Error('Amazon情報の取得に失敗しました');
      }
      
      const data = await response.json();
      console.log('取得したAmazon情報:', data);
      
      if (!data || !data.title || data.title.includes('エラー') || data.title.includes('取得できません')) {
        throw new Error('有効な書籍情報を取得できませんでした');
      }
      
      setAmazonInfo(data);
      
      // Amazonから取得した情報をフォームに自動入力
      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        author: data.author || prev.author,
        publisher: data.publisher || prev.publisher,
        isbn: data.isbn || prev.isbn
      }));
      
    } catch (error) {
      console.error('Error fetching Amazon info:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Amazon情報の取得中にエラーが発生しました');
      setAmazonInfo(null);
    } finally {
      setAmazonLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.reason) {
      setErrorMessage('書籍名と申請理由は必須項目です');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const submitData = {
        ...formData,
        user_id: 1, // 実際のシステムではログインユーザーのIDを使用
        // Amazonから取得した情報も追加
        price: amazonInfo?.price,
        cover_image: amazonInfo?.image_url,
      };
      
      console.log('送信データ:', submitData);
      
      const response = await fetch('http://localhost:8000/api/purchase-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      if (!response.ok) {
        throw new Error('購入申請の送信に失敗しました');
      }
      
      const data = await response.json();
      
      setSuccessMessage('購入申請が正常に送信されました');
      setTimeout(() => {
        router.push('/purchase-requests');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting purchase request:', error);
      setErrorMessage(error instanceof Error ? error.message : '購入申請の送信中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">新規購入申請</h1>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{errorMessage}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{successMessage}</p>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <label htmlFor="url" className="block text-gray-700 font-medium">AmazonのURL:</label>
          <div className="flex-1 flex">
            <input
              type="text"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="https://www.amazon.co.jp/dp/XXXXXXXXXX"
              className="flex-1 border rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={fetchAmazonInfo}
              disabled={amazonLoading}
              className="flex items-center bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-r"
            >
              {amazonLoading ? (
                <AiOutlineLoading3Quarters className="animate-spin mr-2" />
              ) : (
                <FaAmazon className="mr-2" />
              )}
              情報取得
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          AmazonのURLを入力すると、書籍情報を自動取得できます
        </p>
      </div>
      
      {amazonInfo && (
        <div className="mb-6 bg-yellow-50 p-4 rounded border border-yellow-200">
          <h3 className="font-medium mb-2 text-yellow-800">Amazon情報を取得しました</h3>
          <div className="flex gap-4">
            {amazonInfo.image_url && (
              <img 
                src={amazonInfo.image_url} 
                alt={amazonInfo.title} 
                className="w-24 h-auto object-cover bg-white p-1 border"
                onError={(e) => {
                  // 画像が読み込めない場合の処理
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/book-placeholder.png';
                }}
              />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-800">{amazonInfo.title}</p>
              <p><span className="font-medium">著者:</span> {amazonInfo.author}</p>
              <p><span className="font-medium">出版社:</span> {amazonInfo.publisher}</p>
              <p><span className="font-medium">ISBN:</span> {amazonInfo.isbn}</p>
              <p><span className="font-medium">価格:</span> {amazonInfo.price > 0 ? `¥${amazonInfo.price.toLocaleString()}` : '情報なし'}</p>
              <p><span className="font-medium">在庫状況:</span> {amazonInfo.availability}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label htmlFor="title" className="block text-gray-700 font-medium mb-1">
            書籍名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="author" className="block text-gray-700 font-medium mb-1">
            著者
          </label>
          <input
            type="text"
            id="author"
            name="author"
            value={formData.author}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="publisher" className="block text-gray-700 font-medium mb-1">
            出版社
          </label>
          <input
            type="text"
            id="publisher"
            name="publisher"
            value={formData.publisher}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="isbn" className="block text-gray-700 font-medium mb-1">
            ISBN
          </label>
          <input
            type="text"
            id="isbn"
            name="isbn"
            value={formData.isbn}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="reason" className="block text-gray-700 font-medium mb-1">
            申請理由 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={4}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            {isLoading && <AiOutlineLoading3Quarters className="animate-spin mr-2" />}
            申請する
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseRequestPage; 