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
  UserCircleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'

export default function Navbar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const navigation = [
    { name: 'ホーム', href: '/', icon: HomeIcon },
    { name: '書籍一覧', href: '/books', icon: BookOpenIcon },
    { name: 'マイページ', href: '/mypage', icon: UserIcon },
    { name: '購入リクエスト', href: '/purchase-requests', icon: ShoppingCartIcon },
  ]
  
  const users = [
    { id: 1, name: '田中太郎', role: 'user' },
    { id: 2, name: '山田花子', role: 'user' },
    { id: 3, name: '鈴木一郎', role: 'admin' },
    { id: 4, name: '佐藤次郎', role: 'approver' }
  ]
  
  // 現在のユーザーID（実際のアプリでは認証状態から取得）
  const [currentUserId, setCurrentUserId] = useState(1)
  
  // 現在のユーザー情報を取得
  const currentUser = users.find(user => user.id === currentUserId)
  
  // 管理者かどうか
  const isAdmin = currentUser?.role === 'admin'
  
  // 承認者かどうか（管理者も承認者機能を利用可能）
  const isApprover = currentUser?.role === 'approver' || currentUser?.role === 'admin'

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname?.startsWith(path)) return true
    return false
  }
  
  // ユーザー切り替え処理
  const switchUser = (userId: number) => {
    setCurrentUserId(userId)
    setIsUserMenuOpen(false)
    // 実際のアプリでは認証状態を更新する処理を追加
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
              
              {/* 承認者のみ表示する承認ページリンク */}
              {isApprover && (
                <Link
                  href="/purchase-requests/approval"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/purchase-requests/approval')
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <ClipboardDocumentCheckIcon className="h-5 w-5 mr-1" />
                  承認管理
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
          
          {/* ユーザー切り替えドロップダウン */}
          <div className="hidden sm:flex sm:items-center">
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-x-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <UserCircleIcon className="h-6 w-6 text-gray-500" />
                <span>{currentUser?.name}</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>
              
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500">
                    ユーザー切り替え
                  </div>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => switchUser(user.id)}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        currentUserId === user.id 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <span>{user.name}</span>
                        {user.role === 'admin' && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                            管理者
                          </span>
                        )}
                        {user.role === 'approver' && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                            承認者
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            
            {/* 承認者のみ表示する承認ページリンク（モバイル用） */}
            {isApprover && (
              <Link
                href="/purchase-requests/approval"
                className={`flex items-center px-3 py-2 text-base font-medium ${
                  isActive('/purchase-requests/approval')
                    ? 'bg-primary-50 border-l-4 border-primary-500 text-primary-700'
                    : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ClipboardDocumentCheckIcon className="h-5 w-5 mr-3" aria-hidden="true" />
                承認管理
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
            
            {/* モバイル用ユーザー切り替え */}
            <div className="border-t border-gray-200 pt-4 pb-2">
              <div className="px-4 py-2 text-base font-medium text-gray-600">
                ユーザー切り替え
              </div>
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => switchUser(user.id)}
                  className={`flex items-center w-full px-3 py-2 text-base font-medium ${
                    currentUserId === user.id 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <UserCircleIcon className="h-5 w-5 mr-3" aria-hidden="true" />
                  <span>{user.name}</span>
                  {user.role === 'admin' && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                      管理者
                    </span>
                  )}
                  {user.role === 'approver' && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                      承認者
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
} 