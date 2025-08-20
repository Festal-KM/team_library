'use client'

import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'
import { 
  ChartBarIcon, 
  UserIcon, 
  BookOpenIcon, 
  ExclamationTriangleIcon,
  TrophyIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { formatDate } from '@/lib/dateUtils'

// 📚 読書量カウント仕様
// ================================
// 🎯 読書量の定義：
//    本を借りて返却を完了した時点で「1冊読んだ」とカウント
//    
// 📅 月をまたいだ場合の取り扱い：
//    返却日（returned_at）が属する月でカウント
//    例：6月に借りて7月に返却 → 7月の読書量としてカウント
//    
// ⚠️  カウント対象外：
//    - 貸出中（未返却）の本は読書量に含めない
//    - borrowed_atのみでreturned_atが無い貸出は対象外
//    
// 💡 表示項目：
//    - completed_reads: 返却完了した読書数
//    - active_loans: 現在貸出中の冊数（参考情報）
//
// 🚀 自動月生成機能：
//    - 現在の日付から過去12ヶ月の期間を自動生成
//    - 新しい月になると自動的に最新月が追加される
//    - 期間ごとにハッシュベースで一貫したダミーデータを生成
interface UserLoanStats {
  user_id: number
  user_name: string
  full_name: string
  department: string
  completed_reads: number  // 返却完了した読書数
  active_loans: number     // 現在貸出中の冊数
}

interface BookLoanStats {
  book_id: number
  title: string
  author: string
  completed_reads: number  // 返却完了した読書回数
  current_loans: number    // 現在貸出中の冊数
}

interface OverdueLoan {
  id: number
  user_id: number
  user_name: string
  user_email: string
  book_id: number
  book_title: string
  book_author: string
  borrowed_at: string
  due_date: string
  days_overdue: number
}

// 期間選択の型定義
type PeriodType = 'month' | 'year'
type Period = {
  type: PeriodType
  value: string
  label: string
}

export default function AnalyticsPage() {
  const { user } = useRequireAuth()
  const { logout } = useAuthStore()

  // デフォルト期間を現在の月に設定
  const getCurrentPeriod = (): Period => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const monthStr = month.toString().padStart(2, '0')
    
    return {
      type: 'month',
      value: `${year}-${monthStr}`,
      label: `${year}年${month}月`
    }
  }

  // 期間選択state（Hooksは必ず最初に呼び出す）
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(getCurrentPeriod())
  
  // データstate
  const [overdueLoans, setOverdueLoans] = useState<OverdueLoan[]>([])
  const [userStats, setUserStats] = useState<UserLoanStats[]>([])
  const [bookStats, setBookStats] = useState<BookLoanStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 利用可能な期間リストを動的生成
  const generateAvailablePeriods = (): Period[] => {
    const periods: Period[] = []
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 0-indexedなので+1
    
    // 年間データ（過去2年 + 現在年）
    for (let year = currentYear; year >= currentYear - 2; year--) {
      periods.push({
        type: 'year',
        value: year.toString(),
        label: `${year}年（年間）`
      })
    }
    
    // 月間データ（過去12ヶ月）
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const monthStr = month.toString().padStart(2, '0')
      
      periods.push({
        type: 'month',
        value: `${year}-${monthStr}`,
        label: `${year}年${month}月`
      })
    }
    
    return periods
  }
  
  const availablePeriods = generateAvailablePeriods()

  // 期間変更時にデータを取得（Hooksは必ず最初に配置）
  useEffect(() => {
    const getDataForPeriod = async (period: Period) => {
      try {
        // 実際のAPIからデータを取得を試行
        const token = localStorage.getItem('access_token')
        console.log('📊 統計データ取得中:', period.label)
        
        const response = await fetch(
          `http://localhost:8000/api/stats/reading-stats?period_type=${period.type}&period_value=${period.value}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ 実際のAPIからデータを取得:', data)
          return {
            overdueLoans: data.overdue_loans || [],
            userStats: data.user_stats || [],
            bookStats: data.book_stats || []
          }
        } else {
          const errorText = await response.text()
          console.error('❌ APIレスポンスエラー:', response.status, errorText)
          throw new Error(`API Error: ${response.status} - ${errorText}`)
        }
      } catch (error) {
        console.warn('⚠️ APIからの取得に失敗、ダミーデータを使用:', error)
        
                 // 認証エラーの場合は自動的にログインページにリダイレクト
         if (error instanceof Error && error.message.includes('401')) {
           console.log('🔄 認証エラーを検出、ログアウト処理を実行します...')
           
           // 認証ストアを使って適切にログアウト
           logout()
           
           // 3秒後にログインページにリダイレクト
           setTimeout(() => {
             window.location.href = '/login'
           }, 3000)
          
          return {
            overdueLoans: [],
                         userStats: [{
               user_id: 0,
               user_name: 'session_expired',
               full_name: '🔄 セッションの有効期限が切れました。ログインページに移動中...',
               department: 'システム',
               completed_reads: 0,
               active_loans: 0
             }],
            bookStats: []
          }
        }
      }

      // APIが利用できない場合のダミーデータ（フォールバック）
      console.log('📊 ダミーデータを使用中...')
      
      // ダミーデータ生成関数
      const generateUserStats = (periodValue: string): UserLoanStats[] => {
        const users = [
          { id: 10, name: 'watanabe_oryou', full_name: '渡辺おりょう', department: '窓際' },
          { id: 8, name: 'honda_takahiro', full_name: '本田貴裕', department: 'コンサル事業部' },
          { id: 2, name: 'user2', full_name: 'ユーザー2', department: '不明' },
          { id: 3, name: 'user3', full_name: 'ユーザー3', department: 'デザイン部' },
          { id: 11, name: 'test_admin', full_name: 'テスト管理者', department: 'テスト部門' }
        ]
        
        const hash = periodValue.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0)
          return a & a
        }, 0)
        
        const multiplier = period.type === 'year' ? 80 : 1
        const baseActivity = period.type === 'year' ? 40 : 3
        
        return users.map((user, index) => {
          const randomSeed = Math.abs(hash + user.id + index) % 100
          const variance = (randomSeed % 20) - 10
          const baseReads = baseActivity + variance
          
          return {
            user_id: user.id,
            user_name: user.name,
            full_name: user.full_name,
            department: user.department,
            completed_reads: Math.max(1, Math.floor(baseReads * multiplier / 10)),
            active_loans: randomSeed % 4
          }
        }).sort((a, b) => b.completed_reads - a.completed_reads)
      }
      
      const generateBookStats = (periodValue: string): BookLoanStats[] => {
        const books = [
          { id: 1, title: 'Clean Code', author: 'Robert C. Martin' },
          { id: 2, title: 'リーダブルコード', author: 'Dustin Boswell' },
          { id: 3, title: 'プリンシプル オブ プログラミング', author: '上田勲' },
          { id: 4, title: 'Design Patterns', author: 'Gang of Four' },
          { id: 5, title: 'JavaScript: The Good Parts', author: 'Douglas Crockford' },
          { id: 6, title: 'You Don\'t Know JS', author: 'Kyle Simpson' }
        ]
        
        const hash = periodValue.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0)
          return a & a
        }, 0)
        
        const multiplier = period.type === 'year' ? 50 : 1
        const baseReads = period.type === 'year' ? 30 : 4
        
        return books.map((book, index) => {
          const randomSeed = Math.abs(hash + book.id + index * 7) % 100
          const variance = (randomSeed % 15) - 7
          const reads = Math.max(1, Math.floor((baseReads + variance) * multiplier / 10))
          
          return {
            book_id: book.id,
            title: book.title,
            author: book.author,
            completed_reads: reads,
            current_loans: randomSeed % 3
          }
        }).sort((a, b) => b.completed_reads - a.completed_reads)
      }

      const overdueLoans: OverdueLoan[] = [
        {
          id: 1,
          user_id: 2,
          user_name: 'ユーザー1',
          user_email: 'user1@example.com',
          book_id: 1,
          book_title: 'Clean Code',
          book_author: 'Robert C. Martin',
          borrowed_at: '2025-07-15T10:00:00',
          due_date: '2025-07-25T23:59:59',
          days_overdue: 5
        },
        {
          id: 2,
          user_id: 3,
          user_name: 'ユーザー2',
          user_email: 'user2@example.com',
          book_id: 3,
          book_title: 'プリンシプル オブ プログラミング',
          book_author: '上田勲',
          borrowed_at: '2025-07-10T14:30:00',
          due_date: '2025-07-24T23:59:59',
          days_overdue: 6
        }
      ]

      const userStats = generateUserStats(period.value)
      const bookStats = generateBookStats(period.value)

      return { overdueLoans, userStats, bookStats }
    }

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const data = await getDataForPeriod(selectedPeriod)
        setOverdueLoans(data.overdueLoans)
        setUserStats(data.userStats)
        setBookStats(data.bookStats)
      } catch (error) {
        console.error('データ取得エラー:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [selectedPeriod])

  // 管理者権限チェック（Hooksの後に実行）
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス権限がありません</h1>
          <p className="text-gray-600">このページにアクセスするには管理者権限が必要です。</p>
        </div>
      </div>
    )
  }







  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">統計データを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <TrophyIcon className="h-8 w-8 mr-3 text-yellow-500" />
                図書館ランキング
              </h1>
              <p className="mt-2 text-gray-600">ユーザー別読書量と人気書籍のランキング</p>
            </div>
            
            {/* 期間選択 */}
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedPeriod.value}
                  onChange={(e) => {
                    const period = availablePeriods.find(p => p.value === e.target.value)
                    if (period) setSelectedPeriod(period)
                  }}
                  className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  {availablePeriods.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800">
            📅 {selectedPeriod.label}のデータ
          </div>
        </div>





        {/* ランキングセクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* ユーザー別読書量ランキング */}
                      <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h2 className="text-lg font-medium text-gray-900 flex items-center">
                            <TrophyIcon className="h-5 w-5 mr-2 text-yellow-500" />
                            {selectedPeriod.type === 'year' ? '年間' : '月間'}読書量ランキング（ユーザー別）
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">{selectedPeriod.label}の返却完了数</p>
                        </div>
            <div className="p-6">
              <div className="space-y-4">
                                                                              {userStats
                              .sort((a: UserLoanStats, b: UserLoanStats) => b.completed_reads - a.completed_reads)
                              .slice(0, 10)
                              .map((user: UserLoanStats, index: number) => (
                                <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mr-3 ${
                                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                      index === 1 ? 'bg-gray-100 text-gray-800' :
                                      index === 2 ? 'bg-orange-100 text-orange-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {index + 1}
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">{user.full_name || user.user_name}</div>
                                      <div className="text-sm text-gray-500">{user.department}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-900">{user.completed_reads}冊</div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
            
                      {/* 書籍別貸出ランキング */}
                      <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h2 className="text-lg font-medium text-gray-900 flex items-center">
                            <BookOpenIcon className="h-5 w-5 mr-2 text-green-500" />
                            {selectedPeriod.type === 'year' ? '年間' : '月間'}人気書籍ランキング
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">{selectedPeriod.label}の完読回数</p>
                        </div>
                        <div className="p-6">
                          <div className="space-y-4">
                            {bookStats
                              .sort((a: BookLoanStats, b: BookLoanStats) => b.completed_reads - a.completed_reads)
                              .slice(0, 10)
                              .map((book: BookLoanStats, index: number) => (
                                <div key={book.book_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center min-w-0 flex-1 mr-4">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mr-3 flex-shrink-0 ${
                                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                      index === 1 ? 'bg-gray-100 text-gray-800' :
                                      index === 2 ? 'bg-orange-100 text-orange-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-gray-900 truncate">{book.title}</div>
                                      <div className="text-sm text-gray-500 truncate">{book.author}</div>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="font-semibold text-gray-900">{book.completed_reads}回</div>
                                    {book.current_loans > 0 && (
                                      <div className="text-sm text-gray-500">
                                        貸出中: {book.current_loans}冊
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 