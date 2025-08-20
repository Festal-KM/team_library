/**
 * 日時ユーティリティ関数
 */

/**
 * UTC時刻文字列を日本時間で表示するためのフォーマット関数
 * @param dateString - UTC時刻文字列（例: "2025-07-27 22:34:20.98025"）
 * @param options - 表示オプション
 * @returns 日本時間でフォーマットされた文字列
 */
export const formatDate = (
  dateString: string, 
  options: {
    includeTime?: boolean;
    timeZone?: string;
  } = {}
): string => {
  if (!dateString) return '不明';



  try {
    // UTC時刻として明示的に解釈
    let date: Date;
    
    if (dateString.includes('T') || dateString.includes('+')) {
      // ISO 8601形式でタイムゾーン情報がない場合は、すでに日本時間として扱う
      if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
        // タイムゾーン情報がないISO形式は日本時間として扱う
        date = new Date(dateString);
      } else {
        // タイムゾーン情報がある場合はそのまま使用
        date = new Date(dateString);
      }
    } else {
      // タイムゾーン情報がない場合はUTCとして扱う
      date = new Date(dateString + ' UTC');
    }

    const { includeTime = true, timeZone = 'Asia/Tokyo' } = options;



    let result: string;
    // タイムゾーン情報がないISO形式の場合は、既に日本時間として扱い、タイムゾーン変換しない
    if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10) && dateString.includes('T')) {
      // バックエンドから来るデータは既に日本時間なので、9時間を加算
      const adjustedDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

      
      if (includeTime) {
        result = adjustedDate.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        result = adjustedDate.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    } else {
      // タイムゾーン情報がある場合は通常通りタイムゾーン変換
      if (includeTime) {
        result = date.toLocaleDateString('ja-JP', {
          timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        result = date.toLocaleDateString('ja-JP', {
          timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Date parsing error:', error, 'for date:', dateString);
    return '日時エラー';
  }
};

/**
 * 現在時刻を取得（テスト用）
 */
export const getCurrentJSTTime = (): string => {
  return new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * デバッグ用：UTC時刻とJST時刻を比較表示
 */
export const debugDateConversion = (dateString: string) => {
  console.log('=== Date Debug ===');
  console.log('Original string:', dateString);
  
  const utcDate = new Date(dateString + ' UTC');
  const localDate = new Date(dateString);
  
  console.log('UTC interpretation:', utcDate.toISOString());
  console.log('Local interpretation:', localDate.toISOString());
  console.log('JST from UTC:', formatDate(dateString));
  console.log('Current JST:', getCurrentJSTTime());
}; 