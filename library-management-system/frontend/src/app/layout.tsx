import './globals.css'
import { Inter } from 'next/font/google'
import Navbar from '@/components/layout/Navbar'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: '蔵書管理システム',
  description: '社内蔵書の貸出・予約・管理を行うシステム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <Providers>
          <Navbar />
          <main className="pb-8">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-center text-gray-500 text-sm">
                © {new Date().getFullYear()} 蔵書管理システム
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
} 