'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CadastroRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login?tab=signup')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f5] dark:bg-[#0f0f10]">
      <div className="w-10 h-10 border-4 border-[#b81d24] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}