'use client'

import { Fragment, useState } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole } from '@/types/user'

// ユーザーロールの切り替え機能（デモ用）
const userOptions = [
  { id: 1, name: '山田太郎', role: UserRole.USER },
  { id: 2, name: '佐藤花子', role: UserRole.USER },
  { id: 3, name: '鈴木一郎', role: UserRole.APPROVER },
  { id: 4, name: '管理者', role: UserRole.ADMIN },
]

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
]

export default function Header() {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState(userOptions[0])

  // 現在のパスに応じたアクティブ状態の判定
  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
  }

  return (
    <Disclosure as="nav" className="bg-primary-700 shadow-md">
      {({ open }) => (
        <>
          <div className="container mx-auto px-4">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link href="/" className="text-white font-bold text-xl">
                    蔵書管理システム
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        pathname === item.href
                          ? 'bg-primary-800 text-white'
                          : 'text-white hover:bg-primary-600',
                        'px-3 py-2 rounded-md text-sm font-medium'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                  {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.APPROVER) && (
                    <>
                      {adminNavigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={classNames(
                            pathname === item.href
                              ? 'bg-primary-800 text-white'
                              : 'text-white hover:bg-primary-600',
                            'px-3 py-2 rounded-md text-sm font-medium'
                          )}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {/* ユーザーメニュー（デモ用） */}
                <Menu as="div" className="relative ml-3">
                  <div>
                    <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                      <span className="sr-only">ユーザーメニュー</span>
                      <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-800 font-semibold">
                        {currentUser.name.charAt(0)}
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
                        <p className="font-semibold">{currentUser.name}</p>
                        <p className="text-xs text-gray-500">
                          {currentUser.role === UserRole.ADMIN && '管理者'}
                          {currentUser.role === UserRole.APPROVER && '承認者'}
                          {currentUser.role === UserRole.USER && '一般ユーザー'}
                        </p>
                      </div>
                      
                      {/* デモ用のユーザー切り替え */}
                      <div className="border-b">
                        <div className="px-4 py-2 text-xs text-gray-700">ユーザー切り替え（デモ用）</div>
                        {userOptions.map((user) => (
                          <Menu.Item key={user.id}>
                            {({ active }) => (
                              <button
                                onClick={() => setCurrentUser(user)}
                                className={classNames(
                                  active ? 'bg-gray-100' : '',
                                  user.id === currentUser.id ? 'bg-gray-200' : '',
                                  'block w-full px-4 py-2 text-left text-sm text-gray-700'
                                )}
                              >
                                {user.name} 
                                <span className="text-xs ml-1 text-gray-500">
                                  ({user.role === UserRole.ADMIN && '管理者'}
                                  {user.role === UserRole.APPROVER && '承認者'}
                                  {user.role === UserRole.USER && '一般'})
                                </span>
                              </button>
                            )}
                          </Menu.Item>
                        ))}
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
              {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.APPROVER) && (
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
                  <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-800 font-semibold">
                    {currentUser.name.charAt(0)}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-white">{currentUser.name}</div>
                  <div className="text-sm text-primary-200">
                    {currentUser.role === UserRole.ADMIN && '管理者'}
                    {currentUser.role === UserRole.APPROVER && '承認者'}
                    {currentUser.role === UserRole.USER && '一般ユーザー'}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1 px-2">
                <div className="px-3 py-1 text-xs text-primary-200">ユーザー切り替え（デモ用）</div>
                {userOptions.map((user) => (
                  <Disclosure.Button
                    key={user.id}
                    as="button"
                    onClick={() => setCurrentUser(user)}
                    className={classNames(
                      user.id === currentUser.id ? 'bg-primary-800' : '',
                      'block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-primary-600'
                    )}
                  >
                    {user.name}
                    <span className="text-xs ml-1 text-primary-200">
                      ({user.role === UserRole.ADMIN && '管理者'}
                      {user.role === UserRole.APPROVER && '承認者'}
                      {user.role === UserRole.USER && '一般'})
                    </span>
                  </Disclosure.Button>
                ))}
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
} 