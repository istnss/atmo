'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [name, setName] = useState('Usuário')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isDark =
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? '')
      setName(user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Usuário')
      const { data: profile } = await supabase.from('profiles').select('name, avatar_url').eq('id', user.id).maybeSingle()
      setName(profile?.name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Usuário')
      setAvatarUrl(profile?.avatar_url ?? null)
    }

    loadUser()
  }, [router])

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function toggleDarkMode() {
    const nextDark = !darkMode
    setDarkMode(nextDark)
    if (nextDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleAvatarChange(event: { target: { files: FileList | null } }) {
    const file = event.target.files?.[0]
    if (!file || !file.type?.startsWith('image/')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAvatarLoading(true)
    setAvatarPreview(URL.createObjectURL(file))
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/avatar-${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const nextAvatarUrl = publicUrlData.publicUrl
      const { error: profileError } = await supabase.from('profiles').update({ avatar_url: nextAvatarUrl }).eq('id', user.id)
      if (!profileError) setAvatarUrl(nextAvatarUrl)
    }
    setAvatarPreview(null)
    setAvatarLoading(false)
  }

  async function handleAvatarRemove() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAvatarLoading(true)
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    if (!error) setAvatarUrl(null)
    setAvatarLoading(false)
  }

  const usernameTag = `@${email.split('@')[0] || 'usuario'}`

  const navLinks = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/minhas-atividades',
      label: 'Minhas Atividades',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: '/criar-atividade',
      label: 'Criar Atividade',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:flex-col md:justify-between border-r border-[#e5e3db] bg-[#f3f2eb] p-6 dark:border-[#28282b] dark:bg-[#161618] transition-colors duration-200 select-none">
        
        {/* Logo & Navigation */}
        <div className="flex flex-col gap-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-1 px-2 group">
            <span className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Atmo
            </span>
            <svg className="w-4 h-4 text-amber-500 fill-current self-start mt-1.5" viewBox="0 0 24 24">
              <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
            </svg>
          </Link>

          {/* Navigation Links with SVG Icons */}
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold transition-all ${
                    active
                      ? 'bg-[#b81d24] text-white shadow-sm'
                      : 'text-gray-700 hover:text-text-primary hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    {link.icon}
                  </span>
                  <span className="text-sm">{link.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Theme Toggle & Profile Area */}
        <div className="flex flex-col gap-4">
          {/* Dark Mode Slide Switch */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 rounded-2xl text-text-secondary font-medium transition-all text-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {darkMode ? (
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.364 17.636l-.707.707M18.364 18.364l-.707-.707M6.364 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
              <span className="text-gray-700 dark:text-gray-300 text-sm font-semibold">
                {darkMode ? 'Modo Claro' : 'Modo Escuro'}
              </span>
            </div>

            <div
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                darkMode ? 'bg-[#b81d24]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  darkMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          {/* Profile Card & Popup Modal Area */}
          <div className="relative" ref={profileMenuRef}>
            <div
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                showProfileMenu
                  ? 'bg-white dark:bg-bg-card shadow-sm border-gray-200 dark:border-gray-800'
                  : 'hover:bg-gray-200/60 dark:hover:bg-gray-800/60 border-transparent'
              }`}
            >
              {avatarPreview || avatarUrl ? <img src={avatarPreview || avatarUrl || ''} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-[#2b4c7e] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">{name ? name.substring(0, 2).toUpperCase() : 'US'}</div>}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{name}</p>
                <p className="text-xs text-text-secondary truncate">{usernameTag}</p>
              </div>

              <svg className="w-5 h-5 text-text-secondary/70 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <button type="button" onClick={(event) => { event.stopPropagation(); avatarInputRef.current?.click() }} className="text-xs font-bold text-[#2b4c7e]" title="Alterar foto">Editar</button>
              <input ref={avatarInputRef} id="sidebar-avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" disabled={avatarLoading} />
            </div>

            {/* Profile Dropdown Modal (ONLY Meu Perfil and Sair da Conta) */}
            {showProfileMenu && (
              <div className="absolute bottom-20 left-0 right-0 bg-white dark:bg-bg-card border border-gray-200/90 dark:border-gray-800 rounded-2xl shadow-xl p-2 z-50 flex flex-col gap-1 animate-fadeIn">
                <button type="button" onClick={handleAvatarRemove} disabled={avatarLoading || !avatarUrl} className="px-4 py-2.5 text-left text-sm font-bold text-red-600 disabled:opacity-50">Remover foto</button>
                <Link
                  href="/perfil"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/80 rounded-xl text-sm font-bold text-text-primary transition-colors"
                >
                  <svg className="w-4 h-4 text-[#2b4c7e]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Meu Perfil</span>
                </Link>

                <hr className="my-1 border-gray-100 dark:border-gray-800" />

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false)
                    handleLogout()
                  }}
                  className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MOBILE TOP BAR */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#f3f2eb] dark:bg-[#161618] border-b border-[#e5e3db] dark:border-[#28282b] sticky top-0 z-40 transition-colors duration-200">
        <Link href="/" className="flex items-center gap-1 text-2xl font-black text-gray-900 dark:text-white">
          <span>Atmo</span>
          <svg className="w-3.5 h-3.5 text-amber-500 fill-current self-start mt-0.5" viewBox="0 0 24 24">
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </svg>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Alternar Tema"
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.364 17.636l-.707.707M18.364 18.364l-.707-.707M6.364 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-text-secondary hover:text-red-600 transition-colors cursor-pointer"
            title="Sair da Conta"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* 3. MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#f3f2eb] dark:bg-[#161618] border-t border-[#e5e3db] dark:border-[#28282b] py-2 px-4 flex justify-around items-center z-40 shadow-lg transition-colors duration-200 select-none">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 ${
            pathname === '/' ? 'text-[#b81d24]' : 'text-text-secondary'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold">Home</span>
        </Link>

        <Link
          href="/atividades"
          className={`flex flex-col items-center gap-0.5 ${
            pathname === '/atividades' ? 'text-[#b81d24]' : 'text-text-secondary'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] font-semibold">Buscar</span>
        </Link>

        <Link
          href="/criar-atividade"
          className={`flex flex-col items-center gap-0.5 ${
            pathname === '/criar-atividade' ? 'text-[#b81d24]' : 'text-text-secondary'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[10px] font-semibold">Criar</span>
        </Link>

        <Link
          href="/minhas-atividades"
          className={`flex flex-col items-center gap-0.5 ${
            pathname === '/minhas-atividades' ? 'text-[#b81d24]' : 'text-text-secondary'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px] font-semibold">Minhas</span>
        </Link>

        <Link
          href="/perfil"
          className={`flex flex-col items-center gap-0.5 ${
            pathname === '/perfil' ? 'text-[#b81d24]' : 'text-text-secondary'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-semibold">Perfil</span>
        </Link>
      </nav>
    </>
  )
}
