import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-lg font-bold mb-1">社内蔵書管理システム</h3>
            <p className="text-sm text-gray-400">社内の技術書・専門書を簡単に管理</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div>
              <h4 className="font-semibold mb-2">メニュー</h4>
              <ul className="text-sm space-y-1">
                <li>
                  <Link href="/" className="text-gray-300 hover:text-white">
                    ホーム
                  </Link>
                </li>
                <li>
                  <Link href="/books" className="text-gray-300 hover:text-white">
                    書籍一覧
                  </Link>
                </li>
                <li>
                  <Link href="/mypage" className="text-gray-300 hover:text-white">
                    マイページ
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">サポート</h4>
              <ul className="text-sm space-y-1">
                <li>
                  <Link href="/help" className="text-gray-300 hover:text-white">
                    ヘルプ
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-300 hover:text-white">
                    お問い合わせ
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-700 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} 蔵書管理システム. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
} 