'use client'

import { Fragment } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRequireAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'ダッシュボード', href: '/' },
  { name: '書籍一覧', href: '/books' },
  { name: 'マイページ', href: '/mypage' },
  { name: '購入申請', href: '/purchase-requests' },
]

// 管理者用メニュー
const adminNavigation = [
  { name: '書籍管理', href: '/admin/books' },
  { name: 'ユーザー管理', href: '/admin/users' },
  { name: '購入申請管理', href: '/admin/purchase-requests' },
  { name: '統計', href: '/admin/analytics' },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isAuthenticated, isReady } = useRequireAuth()

  // 現在のパスに応じたアクティブ状態の判定
  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
  }

  const isAdmin = user?.role === 'admin'
  const isApprover = user?.role === 'approver' || user?.role === 'admin'

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // 認証状態が準備できていない、またはユーザーが存在しない場合は何も表示しない
  if (!isReady || !user || !isAuthenticated) {
    return null
  }

  return (
    <Disclosure as="nav" className="bg-primary-700 shadow-md">
      {({ open }) => (
        <>
          <div className="container mx-auto px-4">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link href="/" className="flex items-center text-white font-bold text-xl h-10">
                    蔵書管理システム
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        pathname === item.href
                          ? 'bg-primary-800 text-white'
                          : 'text-white hover:bg-primary-600',
                        'flex items-center px-3 py-2 rounded-md text-sm font-medium h-10'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                  {isApprover && (
                    <>
                      {adminNavigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={classNames(
                            pathname === item.href
                              ? 'bg-primary-800 text-white'
                              : 'text-white hover:bg-primary-600',
                            'flex items-center px-3 py-2 rounded-md text-sm font-medium h-10'
                          )}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                {/* ユーザー情報表示 */}
                <div className="flex items-center text-white text-sm px-3 py-2 h-10">
                  <span className="font-medium">{user.full_name}</span>
                  <span className="ml-2 text-primary-200">
                    ({user.role === 'admin' ? '管理者' : user.role === 'approver' ? '承認者' : 'ユーザー'})
                  </span>
                </div>
                
                {/* ユーザーメニュー */}
                <Menu as="div" className="relative ml-3">
                  <div>
                    <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                      <span className="sr-only">ユーザーメニュー</span>
                      <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-800 font-semibold">
                        {user.full_name?.charAt(0) || 'U'}
                      </div>
                    </Menu.Button>
                  </div>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        <p className="font-semibold">{user.full_name}</p>
                        <p className="text-xs text-gray-500">
                          {user.role === 'admin' ? '管理者' : user.role === 'approver' ? '承認者' : '一般ユーザー'}
                        </p>
                        <p className="text-xs text-gray-500">{user.department}</p>
                      </div>

                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/mypage"
                            className={classNames(
                              active ? 'bg-gray-100' : '',
                              'block px-4 py-2 text-sm text-gray-700'
                            )}
                          >
                            マイページ
                          </Link>
                        )}
                      </Menu.Item>

                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleLogout}
                            className={classNames(
                              active ? 'bg-gray-100' : '',
                              'block w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center'
                            )}
                          >
                            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                            ログアウト
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                {/* モバイルメニューボタン */}
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="sr-only">メニューを開く</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* モバイルメニュー */}
          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as={Link}
                  href={item.href}
                  className={classNames(
                    pathname === item.href
                      ? 'bg-primary-800 text-white'
                      : 'text-white hover:bg-primary-600',
                    'block px-3 py-2 rounded-md text-base font-medium'
                  )}
                >
                  {item.name}
                </Disclosure.Button>
              ))}
              {isApprover && (
                <>
                  {adminNavigation.map((item) => (
                    <Disclosure.Button
                      key={item.name}
                      as={Link}
                      href={item.href}
                      className={classNames(
                        pathname === item.href
                          ? 'bg-primary-800 text-white'
                          : 'text-white hover:bg-primary-600',
                        'block px-3 py-2 rounded-md text-base font-medium'
                      )}
                    >
                      {item.name}
                    </Disclosure.Button>
                  ))}
                </>
              )}
            </div>
            <div className="border-t border-primary-600 pb-3 pt-4">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-800 font-semibold">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-white">{user.full_name}</div>
                  <div className="text-sm font-medium text-primary-200">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 px-2">
                <Disclosure.Button
                  as={Link}
                  href="/mypage"
                  className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-primary-600"
                >
                  マイページ
                </Disclosure.Button>
                <Disclosure.Button
                  as="button"
                  onClick={handleLogout}
                  className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-white hover:bg-primary-600 flex items-center"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                  ログアウト
                </Disclosure.Button>
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
} 