'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';

export default function UserMenu() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
      >
        ログイン
      </button>
    );
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理者';
      case 'approver':
        return '承認者';
      case 'user':
        return '一般ユーザー';
      default:
        return role;
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <UserIcon className="h-5 w-5 text-gray-400" />
          <span className="hidden sm:block">{user.full_name}</span>
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Item>
          {({ active }) => (
            <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                  <div className="text-xs text-indigo-600 font-medium">
                    {getRoleDisplayName(user.role)}
                  </div>
                  {user.department && (
                    <div className="text-xs text-gray-500">{user.department}</div>
                  )}
                </div>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => router.push('/mypage')}
                      className={`${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } group flex w-full items-center px-4 py-2 text-sm`}
                    >
                      <UserIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                      マイページ
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } group flex w-full items-center px-4 py-2 text-sm`}
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                      ログアウト
                    </button>
                  )}
                </Menu.Item>
              </div>
            </div>
          )}
        </Menu.Item>
      </Transition>
    </Menu>
  );
} 