import React, { useState } from 'react';
import Image from 'next/image';

interface BookImageProps {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

const BookImage: React.FC<BookImageProps> = ({
  src,
  alt,
  width = 200,
  height = 280,
  className = '',
  priority = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  // 画像URLを処理する関数
  const getImageUrl = (originalSrc?: string): string => {
    if (!originalSrc) {
      return '/images/book-placeholder.svg';
    }

    // ローカル画像の場合はそのまま返す
    if (originalSrc.startsWith('/') || originalSrc.startsWith('data:')) {
      return originalSrc;
    }

    // Amazon画像の場合はプロキシを使用（バックエンドの完全URLを指定）
    if (originalSrc.includes('amazon.com') || originalSrc.includes('images-amazon')) {
      return `http://localhost:8000/api/image-proxy?url=${encodeURIComponent(originalSrc)}`;
    }

    // その他の外部画像もプロキシを使用
    if (originalSrc.startsWith('http')) {
      return `http://localhost:8000/api/image-proxy?url=${encodeURIComponent(originalSrc)}`;
    }

    return originalSrc;
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const imageUrl = imageError ? '/images/book-placeholder.svg' : getImageUrl(src);
      const isProxyImage = imageUrl.includes('localhost:8000/api/image-proxy');
  
  // Amazon画像をBase64で取得
  React.useEffect(() => {
    const fetchBase64Image = async () => {
      if (!src || !src.includes('amazon')) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:8000/api/image-base64?url=${encodeURIComponent(src)}`);
        const data = await response.json();
        
        if (data.success && data.data_url) {
          setBase64Image(data.data_url);
          console.log('Base64画像取得成功:', data.data_url.substring(0, 50) + '...');
        } else {
          console.error('Base64画像取得失敗:', data);
          setImageError(true);
        }
      } catch (error) {
        console.error('Base64画像取得エラー:', error);
        setImageError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (src && src.includes('amazon')) {
      fetchBase64Image();
    } else {
      setIsLoading(false);
    }
  }, [src]);

  // デバッグログ
  React.useEffect(() => {
    console.log('BookImage - Original src:', src);
    console.log('BookImage - Processed imageUrl:', imageUrl);
    console.log('BookImage - Is proxy image:', isProxyImage);
    console.log('BookImage - Base64 image:', base64Image ? 'Available' : 'Not available');
  }, [src, imageUrl, isProxyImage, base64Image]);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
          <div className="text-gray-400 text-sm">読み込み中...</div>
        </div>
      )}
      
      {base64Image ? (
        // Base64画像の場合
        <img
          src={base64Image}
          alt={alt}
          width={width}
          height={height}
          className={`rounded-lg object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={handleImageLoad}
          style={{ width, height }}
        />
      ) : isProxyImage ? (
        // プロキシ画像の場合は通常のimgタグを使用
        <img
          src={imageUrl}
          alt={alt}
          width={width}
          height={height}
          className={`rounded-lg object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{ width, height }}
        />
      ) : (
        // ローカル画像の場合はNext.js Imageを使用
        <Image
          src={imageUrl}
          alt={alt}
          width={width}
          height={height}
          className={`rounded-lg object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          priority={priority}
          unoptimized={false}
        />
      )}
      
      {imageError && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            画像を読み込めませんでした
          </div>
        </div>
      )}
    </div>
  );
};

export default BookImage; 