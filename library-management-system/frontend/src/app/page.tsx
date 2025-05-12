import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import BookGrid from '@/components/books/BookGrid'
import DashboardStats from '@/components/dashboard/DashboardStats'
import RecentlyAddedBooks from '@/components/dashboard/RecentlyAddedBooks'
import MyBooksSection from '@/components/dashboard/MyBooksSection'
import MyReservationsSection from '@/components/dashboard/MyReservationsSection'
import MyRequestsSection from '@/components/dashboard/MyRequestsSection'

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="text-center py-12 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg text-white">
        <h1 className="text-4xl font-bold mb-4">社内蔵書管理システム</h1>
        <p className="text-xl mb-8">技術書・専門書を簡単に検索、貸出、予約できます</p>
        <div className="flex justify-center space-x-4">
          <Link href="/books" className="btn-primary">
            書籍を探す
          </Link>
          <Link href="/purchase-requests/new" className="btn-secondary">
            購入リクエスト
          </Link>
        </div>
      </section>

      <DashboardStats />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">新着書籍</h2>
              <Link 
                href="/books" 
                className="flex items-center text-primary-600 hover:text-primary-800"
              >
                すべて見る
                <ArrowRightIcon className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <RecentlyAddedBooks />
          </section>
        </div>

        <div className="space-y-8">
          <MyBooksSection />
          <MyReservationsSection />
          <MyRequestsSection />
        </div>
      </div>
    </div>
  )
} 