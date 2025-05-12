'use client'

import { useState, useEffect } from 'react'
import { loansApi, reservationsApi, purchaseRequestsApi, usersApi } from '@/lib/api'
import { 
  BookOpenIcon, 
  ClockIcon, 
  UserIcon, 
  BellIcon, 
  ShoppingCartIcon 
} from '@heroicons/react/24/outline'
import BookCover from '@/components/books/BookCover'
import ActiveLoansCard from '@/components/mypage/ActiveLoansCard'
import ReservationsCard from '@/components/mypage/ReservationsCard'
import PurchaseRequestsCard from '@/components/mypage/PurchaseRequestsCard'
import UserProfileCard from '@/components/mypage/UserProfileCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function MyPage() {
  // デモ用の固定ユーザーID
  const userId = 1
  
  const [user, setUser] = useState<any>(null)
  const [activeLoans, setActiveLoans] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        setError('')

        // ユーザー情報を取得
        const userData = await usersApi.getUser(userId)
        setUser(userData)

        // 現在の貸出を取得
        const loansData = await loansApi.getUserActiveLoans(userId)
        setActiveLoans(loansData)

        // 予約状況を取得
        const reservationsData = await reservationsApi.getUserReservations(userId)
        setReservations(reservationsData)

        // 購入リクエストを取得
        const requestsData = await purchaseRequestsApi.getUserRequests(userId)
        setPurchaseRequests(requestsData)
      } catch (err: any) {
        console.error('マイページデータの取得に失敗しました:', err)
        setError('データの読み込みに失敗しました。しばらくしてから再度お試しください。')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [userId])

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <UserIcon className="h-8 w-8 text-primary-600 mr-2" />
        マイページ
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ユーザープロフィール */}
        <div className="md:col-span-3">
          <UserProfileCard user={user} />
        </div>

        {/* 現在の貸出 */}
        <div className="md:col-span-2">
          <ActiveLoansCard loans={activeLoans} />
        </div>

        {/* お知らせ */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <BellIcon className="h-5 w-5 text-primary-600 mr-2" />
              お知らせ
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-700 text-sm">システムのメンテナンスを6月1日に予定しています。詳細は図書館カウンターにお問い合わせください。</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-700 text-sm">新着書籍が追加されました！「プログラミング言語Go」など10冊が新たに利用可能です。</p>
              </div>
            </div>
          </div>
        </div>

        {/* 予約状況 */}
        <div className="md:col-span-3">
          <ReservationsCard reservations={reservations} />
        </div>

        {/* 購入リクエスト */}
        <div className="md:col-span-3">
          <PurchaseRequestsCard requests={purchaseRequests} />
        </div>
      </div>
    </div>
  )
} 