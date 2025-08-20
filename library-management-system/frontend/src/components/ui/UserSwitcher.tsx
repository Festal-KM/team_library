'use client'

import { useState } from 'react'
import { UserIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface User {
  id: number
  name: string
  email: string
  role: string
  department: string
}

interface UserSwitcherProps {
  currentUserId: number
  onUserChange: (userId: number) => void
}

const DEMO_USERS: User[] = [
  {
    id: 1,
    name: '田中 太郎',
    email: 'tanaka@example.com',
    role: 'user',
    department: '開発部'
  },
  {
    id: 2,
    name: '佐藤 次郎',
    email: 'sato@example.com',
    role: 'user',
    department: 'デザイン部'
  },
  {
    id: 3,
    name: '鈴木 三郎',
    email: 'suzuki@example.com',
    role: 'admin',
    department: '情報システム部'
  }
]

export default function UserSwitcher({ currentUserId, onUserChange }: UserSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const currentUser = DEMO_USERS.find(user => user.id === currentUserId) || DEMO_USERS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <UserIcon className="h-5 w-5 text-gray-500" />
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
          <div className="text-xs text-gray-500">{currentUser.department}</div>
        </div>
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {DEMO_USERS.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onUserChange(user.id)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 ${
                  user.id === currentUserId ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-8 w-8 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-500">{user.department} • {user.role === 'admin' ? '管理者' : '一般ユーザー'}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 px-4 py-2">
            <p className="text-xs text-gray-500">
              ※ デモ用のユーザー切り替え機能です
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 