'use client'

import { useState } from 'react'
import { UserIcon, PencilIcon, IdentificationIcon, BuildingOffice2Icon, EnvelopeIcon } from '@heroicons/react/24/outline'

interface UserProfileCardProps {
  user: any
}

export default function UserProfileCard({ user }: UserProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    department: user?.department || ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 実際にはここでAPIを呼び出してプロフィールを更新する
    console.log('Profile update:', formData)
    setIsEditing(false)
    // 成功時にはユーザー情報を更新
  }

  if (!user) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-gray-500 py-4 text-center">
          ユーザー情報を読み込めません
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <UserIcon className="h-5 w-5 text-primary-600 mr-2" />
          プロフィール
        </h2>
        
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center"
        >
          <PencilIcon className="h-4 w-4 mr-1" />
          {isEditing ? 'キャンセル' : '編集'}
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">部署</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 mr-2"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              保存
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start">
            <IdentificationIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">氏名</p>
              <p className="text-gray-900">{user.full_name || 'データがありません'}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <EnvelopeIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">メールアドレス</p>
              <p className="text-gray-900">{user.email || 'データがありません'}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <BuildingOffice2Icon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">部署</p>
              <p className="text-gray-900">{user.department || 'データがありません'}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <UserIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">ユーザー名</p>
              <p className="text-gray-900">{user.username || 'データがありません'}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <UserIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">権限</p>
              <p className="text-gray-900">{user.role === 'admin' ? '管理者' : 'ユーザー'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 