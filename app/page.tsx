'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setEmail(user.email ?? null)
      setLoading(false)

          setName(user?.user_metadata?.name ?? '')

    }


    getUser()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return <p>Carregando...</p>
  }

  return (
    <main>
      <h1>Atmô</h1>

      <p>Encontre atividades para participar.</p>

      <p>Olá, {name}!</p>

      <button onClick={handleLogout}>
        Sair
      </button>
    </main>
  )
}