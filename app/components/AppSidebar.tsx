'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [name, setName] = useState('Usuário')
  const [email, setEmail] = useState('')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const isDark = localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDarkMode(isDark)

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? '')
      setName(user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Usuário')
    }

    loadUser()
  }, [router])

  function toggleDarkMode() {
    const nextDark = !darkMode
    setDarkMode(nextDark)
    document.documentElement.classList.toggle('dark', nextDark)
    localStorage.setItem('theme', nextDark ? 'dark' : 'light')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/', label: 'Home', icon: '⌂' },
    { href: '/minhas-atividades', label: 'Minhas Atividades', icon: '◌' },
    { href: '/criar-atividade', label: 'Criar Atividade', icon: '+' },
    { href: '/perfil', label: 'Meu Perfil', icon: '○' },
  ]

  return (
    <>
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:flex-col md:justify-between border-r border-[#e5e3db] bg-[#f3f2eb] p-6 dark:border-[#28282b] dark:bg-[#161618]">
        <div className="flex flex-col gap-8">
          <Link href="/" className="px-2 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">Atmo<span className="text-amber-500">✦</span></Link>
          <nav className="flex flex-col gap-2">
            {links.map((link) => {
              const active = pathname === link.href
              return <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition-all ${active ? 'bg-[#b81d24] text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-800/50'}`}><span className="w-5 text-center text-xl leading-none">{link.icon}</span>{link.label}</Link>
            })}
          </nav>
        </div>
        <div className="flex flex-col gap-4">
          <button type="button" onClick={toggleDarkMode} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-800/50">
            <span>{darkMode ? '☀ Modo claro' : '☾ Modo escuro'}</span>
            <span className={`flex h-5 w-9 items-center rounded-full p-0.5 ${darkMode ? 'bg-[#b81d24]' : 'bg-gray-300 dark:bg-gray-700'}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-4' : ''}`} /></span>
          </button>
          <div className="flex items-center gap-3 rounded-2xl p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2b4c7e] font-bold text-white">{name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0"><p className="truncate text-sm font-bold text-text-primary">{name}</p><p className="truncate text-xs text-text-secondary">@{email.split('@')[0] || 'usuario'}</p></div>
          </div>
          <button type="button" onClick={handleLogout} className="rounded-xl px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">Sair da conta</button>
        </div>
      </aside>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#e5e3db] bg-[#f3f2eb] px-6 py-4 dark:border-[#28282b] dark:bg-[#161618] md:hidden">
        <Link href="/" className="text-2xl font-black text-gray-900 dark:text-white">Atmo<span className="text-amber-500">✦</span></Link>
        <div className="flex gap-3"><button type="button" onClick={toggleDarkMode} className="p-2 text-text-secondary" title="Alternar tema">{darkMode ? '☀' : '☾'}</button><button type="button" onClick={handleLogout} className="p-2 text-text-secondary" title="Sair">↪</button></div>
      </header>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-[#e5e3db] bg-[#f3f2eb] px-2 py-2 dark:border-[#28282b] dark:bg-[#161618] md:hidden">
        {links.map((link) => <Link key={link.href} href={link.href} className={`flex flex-col items-center gap-1 p-2 text-[10px] font-semibold ${pathname === link.href ? 'text-[#b81d24]' : 'text-text-secondary'}`}><span className="text-lg leading-none">{link.icon}</span>{link.label.replace('Minhas Atividades', 'Minhas').replace('Criar Atividade', 'Criar').replace('Meu Perfil', 'Perfil')}</Link>)}
      </nav>
    </>
  )
}
