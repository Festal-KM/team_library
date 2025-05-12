import BookImportForm from '@/components/books/BookImportForm'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function BookImportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/books" className="inline-flex items-center text-primary-600 hover:text-primary-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          書籍一覧に戻る
        </Link>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <BookImportForm />
      </div>
      
      <div className="mt-10 max-w-3xl mx-auto">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">書籍寄贈について</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>寄贈していただいた書籍は、蔵書として登録され、他のメンバーが利用できるようになります。ご協力いただきありがとうございます。</p>
                <ul className="list-disc list-inside mt-2">
                  <li>書籍の状態が良いものをお願いします</li>
                  <li>ISBNがある場合は入力いただくとデータの正確性が向上します</li>
                  <li>寄贈された書籍は原則として返却いたしません</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 