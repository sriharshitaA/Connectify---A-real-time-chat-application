'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-4">The page you're looking for doesn't exist</p>
        <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  )
}
