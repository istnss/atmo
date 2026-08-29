'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Tabs: 'login' | 'signup'
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Signup form state
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)

  // UI status states
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Theme restore
    const isDark =
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // If user is already logged in, redirect to home
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

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

  // Handle Login
  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (loginError) {
      setError(loginError.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : loginError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/')
      router.refresh()
    }
  }

  // Handle Signup
  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    if (!signupName.trim()) {
      setError('Por favor, informe seu nome.')
      setLoading(false)
      return
    }

    if (signupPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }

    if (signupPassword !== signupConfirmPassword) {
      setError('As senhas não coincidem.')
      setLoading(false)
      return
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          name: signupName.trim(),
        },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Update or insert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: signupName.trim(),
        })
        .eq('id', data.user.id)

      if (profileError) {
        console.error('Profile update notice:', profileError.message)
      }
    }

    setMessage('Conta criada com sucesso! Verifique seu e-mail para confirmar seu cadastro.')
    setLoading(false)
    setSignupName('')
    setSignupEmail('')
    setSignupPassword('')
    setSignupConfirmPassword('')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#faf9f5] dark:bg-[#0f0f10] text-text-primary font-sans antialiased transition-colors duration-200 selection:bg-[#b81d24] selection:text-white">

      {/* 1. LEFT SIDE: Visual Showcase & Brand Hero Panel */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 overflow-hidden bg-[#f3f2eb] dark:bg-[#161618] border-r border-[#e5e3db] dark:border-[#28282b] text-text-primary transition-colors duration-200">
        {/* Background Image with Warm Blur & Dynamic Theme Gradient Overlays */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1541753866388-0b3c701627d3?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Atmo Community Activities"
            className="w-full h-full object-cover object-center opacity-30 dark:opacity-45 scale-105 filter saturate-110 transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f3f2eb] via-[#f3f2eb]/2 to-transparent dark:from-[#161618] dark:via-[#161618]/75 dark:to-transparent transition-colors duration-200"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#f3f2eb]/90 via-transparent to-transparent dark:from-[#161618]/90 dark:via-transparent dark:to-transparent transition-colors duration-200"></div>
        </div>

        {/* Top Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 group">
            <span className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white group-hover:opacity-90 transition-opacity">
              Atmo
            </span>
            <span className="text-amber-500 text-2xl animate-pulse">✦</span>
          </Link>

          <span className="text-xs font-bold uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-md border border-gray-300/80 dark:border-white/15 text-gray-800 dark:text-white/90 shadow-xs">
            Itajaí • SC
          </span>
        </div>

        {/* Center / Bottom Inspirational Content */}
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#b81d24] text-white text-xs font-extrabold uppercase tracking-wider mb-6 shadow-md">
            <span>Oficinas em pequenos grupos</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight mb-4">
            Conecte-se com pessoas reais através de novas experiências presenciais.
          </h1>

          <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base leading-relaxed mb-8">
            Descubra oficinas de marcenaria, cerâmica, leitura, jogos e atividades ao ar livre organizadas pela sua própria comunidade.
          </p>

          {/* Social Proof Badges */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-300/80 dark:border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/90 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-lg shrink-0 border border-gray-200 dark:border-white/10 shadow-xs">
                👥
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Grupos Pequenos</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">Até 8 pessoas por oficina</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/90 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-lg shrink-0 border border-gray-200 dark:border-white/10 shadow-xs">
                ✨
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">100% Presencial</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">Interações autênticas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-xs font-medium text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} Atmô. Conectando pessoas e comunidades.
        </div>
      </div>

      {/* 2. RIGHT SIDE: Form Area with Dual Tabs (Login & Criar Conta) */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:p-16 max-w-2xl mx-auto w-full overflow-y-auto">

        {/* Top Bar with Mobile Logo & Dark Mode Toggle */}
        <div className="flex items-center justify-between w-full mb-8">
          <div className="lg:hidden flex items-center gap-1">
            <Link href="/" className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Atmo<span className="text-amber-500">✦</span>
            </Link>
          </div>

          <div className="ml-auto">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-bg-card border border-gray-200/80 dark:border-gray-800 text-text-secondary hover:text-text-primary text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <span>{darkMode ? '☀ Modo Claro' : '☾ Modo Escuro'}</span>
            </button>
          </div>
        </div>

        {/* Main Card / Form Container */}
        <div className="w-full my-auto py-4">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b81d24]">
              Bem-vindo ao Atmô
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-text-primary md:text-4xl">
              {activeTab === 'login' ? 'Acesse sua conta' : 'Crie sua conta gratuita'}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {activeTab === 'login'
                ? 'Insira suas credenciais para gerenciar suas oficinas e inscrições.'
                : 'Junte-se à comunidade para participar ou criar experiências presenciais.'}
            </p>
          </div>

          {/* Segmented Dual Tab Switcher */}
          <div className="p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-[20px] flex items-center gap-1.5 mb-8 border border-gray-200/60 dark:border-gray-700/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login')
                setError('')
                setMessage('')
              }}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer text-center ${activeTab === 'login'
                ? 'bg-white dark:bg-bg-card text-text-primary shadow-sm scale-100'
                : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              Entrar
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('signup')
                setError('')
                setMessage('')
              }}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer text-center ${activeTab === 'signup'
                ? 'bg-white dark:bg-bg-card text-text-primary shadow-sm scale-100'
                : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Alerts / Feedback Messages */}
          {message && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center justify-between shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{message}</span>
              </div>
              <button onClick={() => setMessage('')} className="p-1 font-bold">✕</button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm font-medium flex items-center justify-between shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="p-1 font-bold">✕</button>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2" htmlFor="loginEmail">
                  E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                    </svg>
                  </span>
                  <input
                    id="loginEmail"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b81d24] text-sm text-text-primary shadow-xs transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary" htmlFor="loginPassword">
                    Senha
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="loginPassword"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b81d24] text-sm text-text-primary shadow-xs transition-all placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-text-primary transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 w-full py-4 bg-[#b81d24] hover:bg-[#a0181d] text-white font-extrabold text-sm md:text-base rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar na Conta</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2: SIGNUP FORM */
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2" htmlFor="signupName">
                  Nome Completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    id="signupName"
                    type="text"
                    placeholder="Seu nome"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b81d24] text-sm text-text-primary shadow-xs transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2" htmlFor="signupEmail">
                  E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                    </svg>
                  </span>
                  <input
                    id="signupEmail"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b81d24] text-sm text-text-primary shadow-xs transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2" htmlFor="signupPassword">
                  Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="signupPassword"
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="Mínimo de 6 caracteres"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b81d24] text-sm text-text-primary shadow-xs transition-all placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-text-primary transition-colors cursor-pointer"
                  >
                    {showSignupPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2" htmlFor="signupConfirmPassword">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  <input
                    id="signupConfirmPassword"
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="Repita sua senha"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b81d24] text-sm text-text-primary shadow-xs transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 w-full py-4 bg-[#b81d24] hover:bg-[#a0181d] text-white font-extrabold text-sm md:text-base rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Criando sua conta...</span>
                  </>
                ) : (
                  <>
                    <span>Finalizar Cadastro</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Toggle Bottom Link */}
          <div className="mt-8 text-center">
            {activeTab === 'login' ? (
              <p className="text-sm text-text-secondary">
                Ainda não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup')
                    setError('')
                    setMessage('')
                  }}
                  className="font-extrabold text-[#b81d24] hover:underline cursor-pointer"
                >
                  Cadastre-se gratuitamente
                </button>
              </p>
            ) : (
              <p className="text-sm text-text-secondary">
                Já possui uma conta cadastrada?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login')
                    setError('')
                    setMessage('')
                  }}
                  className="font-extrabold text-[#b81d24] hover:underline cursor-pointer"
                >
                  Fazer login
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Bottom Terms & Security Notice */}
        <div className="pt-6 text-center text-xs text-text-secondary/70">
          Ao continuar, você concorda com a proposta comunitária e termos de convivência do Atmô.
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#faf9f5] dark:bg-[#0f0f10]">
          <div className="w-10 h-10 border-4 border-[#b81d24] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  )
}