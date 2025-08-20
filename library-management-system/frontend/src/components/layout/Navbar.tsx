'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { 
  BookOpenIcon, 
  UserIcon, 
  ShoppingCartIcon, 
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'
import UserMenu from '@/components/auth/UserMenu'
import { useAuthStore } from '@/lib/auth-store'

export default function Navbar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, isAuthenticated } = useAuthStore()

  const navigation = [
    { name: 'ホーム', href: '/', icon: HomeIcon },
    { name: '書籍一覧', href: '/books', icon: BookOpenIcon },
    { name: 'マイページ', href: '/mypage', icon: UserIcon },
    { name: '購入リクエスト', href: '/purchase-requests', icon: ShoppingCartIcon },
  ]
  
  // 管理者かどうか
  const isAdmin = user?.role === 'admin'
  
  // 承認者かどうか（管理者も承認者機能を利用可能）
  const isApprover = user?.role === 'approver' || user?.role === 'admin'

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname?.startsWith(path)) return true
    return false
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="text-xl font-bold text-primary-600">蔵書管理システム</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(item.href)
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-1" />
                  {item.name}
                </Link>
              ))}
              
              {/* 承認者のみ表示する購入申請管理リンク */}
              {isApprover && (
                <Link
                  href="/admin/purchase-requests"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/admin/purchase-requests')
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <ClipboardDocumentCheckIcon className="h-5 w-5 mr-1" />
                  購入申請管理
                </Link>
              )}
              
              {/* 管理者のみ表示する管理ページリンク */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/admin')
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Cog6ToothIcon className="h-5 w-5 mr-1" />
                  管理者ページ
                </Link>
              )}
            </div>
          </div>
          
          {/* ユーザーメニュー */}
          <div className="hidden sm:flex sm:items-center">
            <UserMenu />
          </div>
          
          <div className="-mr-2 flex items-center sm:hidden">
            {/* モバイルメニューボタン */}
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              aria-expanded="false"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">メニューを開く</span>
              {isMobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-base font-medium ${
                  isActive(item.href)
                    ? 'bg-primary-50 border-l-4 border-primary-500 text-primary-700'
                    : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5 mr-3" aria-hidden="true" />
                {item.name}
              </Link>
            ))}
            
            {/* 承認者のみ表示する購入申請管理リンク（モバイル用） */}
            {isApprover && (
              <Link
                href="/admin/purchase-requests"
                className={`flex items-center px-3 py-2 text-base font-medium ${
                  isActive('/admin/purchase-requests')
                    ? 'bg-primary-50 border-l-4 border-primary-500 text-primary-700'
                    : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ClipboardDocumentCheckIcon className="h-5 w-5 mr-3" aria-hidden="true" />
                購入申請管理
              </Link>
            )}
            
            {/* 管理者のみ表示する管理ページリンク（モバイル用） */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center px-3 py-2 text-base font-medium ${
                  isActive('/admin')
                    ? 'bg-primary-50 border-l-4 border-primary-500 text-primary-700'
                    : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Cog6ToothIcon className="h-5 w-5 mr-3" aria-hidden="true" />
                管理者ページ
              </Link>
            )}
            
            {/* モバイル用ユーザーメニュー */}
            {isAuthenticated && user && (
              <div className="border-t border-gray-200 pt-4 pb-2">
                <div className="px-4 py-2 text-base font-medium text-gray-600">
                  {user.full_name}
                </div>
                <div className="px-4 py-1 text-sm text-gray-500">
                  {user.email}
                </div>
                <div className="px-4 py-1 text-sm text-indigo-600 font-medium">
                  {user.role === 'admin' ? '管理者' : user.role === 'approver' ? '承認者' : '一般ユーザー'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
} 