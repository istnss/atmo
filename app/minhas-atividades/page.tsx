'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import AppSidebar from '@/app/components/AppSidebar'

type Activity = {
  id: number
  title: string
  description: string | null
  date: string
  start_time: string
  end_time: string | null
  location_name: string
  address: string
  price: number
  max_participants: number
  category_id: number
  creator_id: string
  image_url: string | null
  status: string
  cancellation_reason: string | null
  category_name?: string
  confirmed_count?: number
  available_spots?: number
  duration?: string
  creator_name?: string
}

type Category = {
  id: number
  name: string
}

export default function MinhasAtividadesPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  // Data states
  const [createdActivities, setCreatedActivities] = useState<Activity[]>([])
  const [enrolledActivities, setEnrolledActivities] = useState<Activity[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // UI Filter states
  const [activeTab, setActiveTab] = useState<'created' | 'enrolled'>('created')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      // 1. Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      const cats = categoriesData ?? []
      setCategories(cats)

      // 2. Fetch profiles for creator names
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name')

      const profMap = new Map((profilesData ?? []).map(p => [p.id, p.name || 'Organizador']))

      // 3. Fetch participants counts for all activities
      const { data: participantsData } = await supabase
        .from('activity_participants')
        .select('activity_id, user_id, status')

      const allParticipants = participantsData ?? []

      const { data: imagesData } = await supabase
        .from('activity_images')
        .select('activity_id, url, position')
        .order('position', { ascending: true })

      const imageMap = new Map<number, string>()
      for (const image of imagesData ?? []) {
        if (!imageMap.has(image.activity_id)) imageMap.set(image.activity_id, image.url)
      }

      // Helper to compute duration & map metadata
      const mapActivity = (act: any): Activity => {
        const cat = cats.find(c => c.id === act.category_id)
        const confirmed = allParticipants.filter(p => p.activity_id === act.id && p.status === 'confirmed').length

        let duration = '90 min'
        if (act.start_time && act.end_time) {
          try {
            const [sh, sm] = act.start_time.split(':').map(Number)
            const [eh, em] = act.end_time.split(':').map(Number)
            const diff = (eh * 60 + em) - (sh * 60 + sm)
            if (diff > 0) duration = `${diff} min`
          } catch (_) {}
        }

        return {
          ...act,
          image_url: imageMap.get(act.id) ?? null,
          category_name: cat ? cat.name : 'Outros',
          creator_name: profMap.get(act.creator_id) || 'Organizador',
          confirmed_count: confirmed,
          available_spots: Math.max(0, act.max_participants - confirmed),
          duration,
        }
      }

      // 4. Fetch created activities by user
      const { data: createdData, error: createdError } = await supabase
        .from('activities')
        .select('*')
        .eq('creator_id', user.id)
        .order('date', { ascending: false })

      if (createdError) throw createdError
      setCreatedActivities((createdData ?? []).map(mapActivity))

      // 5. Fetch enrolled activities (user is confirmed participant)
      const userParticipations = allParticipants.filter(
        p => p.user_id === user.id && p.status === 'confirmed'
      )
      const enrolledActivityIds = userParticipations.map(p => p.activity_id)

      if (enrolledActivityIds.length > 0) {
        const { data: enrolledData, error: enrolledError } = await supabase
          .from('activities')
          .select('*')
          .in('id', enrolledActivityIds)
          .order('date', { ascending: true })

        if (enrolledError) throw enrolledError
        setEnrolledActivities((enrolledData ?? []).map(mapActivity))
      } else {
        setEnrolledActivities([])
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar atividades.')
    } finally {
      setLoading(false)
    }
  }

  // Cancel enrollment
  async function handleCancelEnrollment(activityId: number) {
    if (!confirm('Tem certeza que deseja cancelar sua inscrição nesta atividade?')) return

    try {
      setActionLoadingId(activityId)
      setActionMessage('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: cancelError } = await supabase
        .from('activity_participants')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('activity_id', activityId)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')

      if (cancelError) throw cancelError

      setActionMessage('Inscrição cancelada com sucesso.')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar inscrição.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Cancel created activity
  async function handleCancelActivity(activityId: number) {
    const reason = window.prompt('Informe o motivo do cancelamento da oficina:')
    if (!reason || !reason.trim()) return

    try {
      setActionLoadingId(activityId)
      setActionMessage('')

      const { error: cancelError } = await supabase
        .from('activities')
        .update({
          status: 'cancelled',
          cancellation_reason: reason.trim(),
        })
        .eq('id', activityId)

      if (cancelError) throw cancelError

      setActionMessage('Atividade cancelada com sucesso.')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar atividade.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const getDurationColor = (categoryName: string = ''): string => {
    const name = categoryName.toLowerCase()
    if (name.includes('manual') || name.includes('reparo')) return 'bg-[#e2a524] text-black font-bold'
    if (name.includes('art') || name.includes('criativ')) return 'bg-[#a855f7] text-white font-bold'
    if (name.includes('intelec') || name.includes('leitura')) return 'bg-[#06b6d4] text-white font-bold'
    return 'bg-[#10b981] text-white font-bold'
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Aprovada
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Em Análise
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Rejeitada
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Cancelada
          </span>
        )
      case 'finished':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Concluída
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            {status}
          </span>
        )
    }
  }

  // Filter logic
  const filterList = (list: Activity[]) => {
    return list.filter((act) => {
      // Status filter (only applied for created tab)
      if (activeTab === 'created' && statusFilter !== 'all') {
        if (statusFilter === 'approved' && act.status !== 'approved') return false
        if (statusFilter === 'pending' && act.status !== 'pending') return false
        if (statusFilter === 'cancelled' && act.status !== 'cancelled' && act.status !== 'rejected') return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          act.title.toLowerCase().includes(q) ||
          act.location_name.toLowerCase().includes(q) ||
          (act.category_name && act.category_name.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }

  const displayedCreated = filterList(createdActivities)
  const displayedEnrolled = filterList(enrolledActivities)

  // Metrics summary
  const approvedCount = createdActivities.filter(a => a.status === 'approved').length
  const pendingCount = createdActivities.filter(a => a.status === 'pending').length

  return (
    <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex font-sans antialiased text-text-primary transition-colors duration-200 select-none">
      <AppSidebar />

      <main className="flex-1 p-6 pb-24 md:p-10 max-w-7xl w-full mx-auto overflow-x-hidden">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b81d24]">
              Painel do Usuário
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
              Minhas Atividades
            </h1>
            <p className="mt-1 text-text-secondary text-sm md:text-base">
              Acompanhe suas oficinas criadas e gerencie suas inscrições em experiências presenciais.
            </p>
          </div>

          <Link
            href="/criar-atividade"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#b81d24] hover:bg-[#a0181d] text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-98 text-sm shrink-0 self-start md:self-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Criar Nova Atividade</span>
          </Link>
        </div>

        {/* Action / Error Alerts */}
        {actionMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage('')} className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 font-bold p-1">✕</button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm font-medium flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 dark:text-red-400 font-bold p-1">✕</button>
          </div>
        )}

        {/* Quick Stats Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-bg-card p-5 rounded-[24px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Oficinas Criadas</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl md:text-3xl font-extrabold text-text-primary">{createdActivities.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-text-secondary">Total</span>
            </div>
          </div>

          <div className="bg-white dark:bg-bg-card p-5 rounded-[24px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Ativas / Aprovadas</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{approvedCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">Disponíveis</span>
            </div>
          </div>

          <div className="bg-white dark:bg-bg-card p-5 rounded-[24px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Em Análise</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl md:text-3xl font-extrabold text-amber-500">{pendingCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500">Pendente</span>
            </div>
          </div>

          <div className="bg-white dark:bg-bg-card p-5 rounded-[24px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Minhas Inscrições</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl md:text-3xl font-extrabold text-[#2b4c7e] dark:text-blue-400">{enrolledActivities.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#2b4c7e] dark:text-blue-300">Confirmadas</span>
            </div>
          </div>
        </div>

        {/* Tabs & Controls Section */}
        <div className="bg-white dark:bg-bg-card rounded-[28px] border border-gray-200/80 dark:border-gray-800/80 p-4 md:p-6 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
            {/* Primary Tab Switcher */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800/70 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('created')
                  setStatusFilter('all')
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                  activeTab === 'created'
                    ? 'bg-white dark:bg-bg-card text-text-primary shadow-sm scale-100'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <svg className="w-4 h-4 text-[#b81d24]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Oficinas que Criei ({createdActivities.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('enrolled')
                  setStatusFilter('all')
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                  activeTab === 'enrolled'
                    ? 'bg-white dark:bg-bg-card text-text-primary shadow-sm scale-100'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <svg className="w-4 h-4 text-[#2b4c7e]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Minhas Inscrições ({enrolledActivities.length})</span>
              </button>
            </div>

            {/* Search Input Box */}
            <div className="relative w-full lg:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Filtrar por nome ou local..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b81d24] text-xs md:text-sm text-text-primary placeholder:text-gray-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Subfilters for Created Tab */}
          {activeTab === 'created' && (
            <div className="flex items-center gap-2 pt-4 overflow-x-auto scrollbar-none">
              <span className="text-xs font-bold text-text-secondary whitespace-nowrap mr-1">Status:</span>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'approved', label: 'Aprovadas' },
                { id: 'pending', label: 'Em Análise' },
                { id: 'cancelled', label: 'Canceladas / Rejeitadas' },
              ].map((pill) => {
                const isSelected = statusFilter === pill.id
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#b81d24] text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-text-primary'
                    }`}
                  >
                    {pill.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-bg-card rounded-[28px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
            <div className="w-12 h-12 border-4 border-[#b81d24] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-text-secondary font-semibold text-sm">Carregando suas atividades...</p>
          </div>
        )}

        {/* Tab 1: Created Activities Content */}
        {!loading && activeTab === 'created' && (
          <div>
            {displayedCreated.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white dark:bg-bg-card rounded-[32px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  {createdActivities.length === 0
                    ? 'Você ainda não criou nenhuma atividade'
                    : 'Nenhuma atividade encontrada com estes filtros'}
                </h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
                  {createdActivities.length === 0
                    ? 'Compartilhe suas habilidades e organize uma oficina presencial para conectar a comunidade.'
                    : 'Tente alterar os termos de busca ou mudar a categoria de status.'}
                </p>
                {createdActivities.length === 0 ? (
                  <Link
                    href="/criar-atividade"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#b81d24] hover:bg-[#a0181d] text-white font-bold rounded-2xl shadow-sm transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Criar Minha Primeira Oficina
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setStatusFilter('all')
                      setSearchQuery('')
                    }}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-text-primary font-bold text-sm rounded-xl transition-colors"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedCreated.map((act) => {
                  const percentFilled = Math.min(
                    100,
                    Math.round(((act.confirmed_count || 0) / (act.max_participants || 1)) * 100)
                  )

                  return (
                    <article
                      key={act.id}
                      className="rounded-[30px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm overflow-hidden flex flex-col bg-white dark:bg-bg-card hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 group"
                    >
                      {/* Image Thumbnail & Badges */}
                      <div className="relative h-48 w-full bg-[#faf9f5] dark:bg-bg-primary overflow-hidden border-b border-gray-100 dark:border-gray-800">
                        {act.image_url && (
                          <img
                            src={act.image_url}
                            alt={act.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs ${getDurationColor(act.category_name)}`}>
                            {act.duration}
                          </span>
                          <span className="bg-[#1f2937]/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                            {act.category_name}
                          </span>
                        </div>

                        {/* Status Badge Top Right */}
                        <div className="absolute top-3 right-3 shadow-sm">
                          {renderStatusBadge(act.status)}
                        </div>

                        {/* Price Tag Bottom Right */}
                        <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-bg-card/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-extrabold text-text-primary shadow-sm border border-black/5 dark:border-white/10">
                          {Number(act.price) === 0 ? 'Gratuita' : `R$ ${Number(act.price).toFixed(2)}`}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 flex flex-col flex-1 justify-between gap-5">
                        <div className="flex flex-col gap-3">
                          <h3 className="text-lg font-bold text-text-primary tracking-tight leading-snug line-clamp-2">
                            {act.title}
                          </h3>

                          {/* Event info details */}
                          <div className="flex flex-col gap-1.5 text-xs text-text-secondary font-medium">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-[#b81d24] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{act.date} • {act.start_time}{act.end_time ? ` às ${act.end_time}` : ''}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-[#2b4c7e] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="truncate">{act.location_name}</span>
                            </div>
                          </div>

                          {/* Participation Progress Bar */}
                          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                              <span className="text-text-secondary">Ocupação das vagas</span>
                              <span className="text-text-primary font-bold">
                                {act.confirmed_count} / {act.max_participants} ({act.available_spots} livres)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#2b4c7e] h-full rounded-full transition-all duration-500"
                                style={{ width: `${percentFilled}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                          <Link
                            href={`/atividades/${act.id}`}
                            className="w-full py-2.5 px-4 bg-[#2b4c7e] hover:bg-[#1f3a63] text-white font-bold text-xs md:text-sm rounded-xl text-center transition-colors shadow-xs"
                          >
                            Ver detalhes e participantes
                          </Link>

                          <div className="flex gap-2">
                            {(act.status === 'pending' || act.status === 'rejected') && (
                              <Link
                                href={`/atividades/${act.id}/editar`}
                                className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-text-primary font-semibold text-xs rounded-xl text-center transition-colors"
                              >
                                ✎ Editar oficina
                              </Link>
                            )}

                            {act.status !== 'cancelled' && act.status !== 'finished' && (
                              <button
                                type="button"
                                onClick={() => handleCancelActivity(act.id)}
                                disabled={actionLoadingId === act.id}
                                className="py-2 px-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {actionLoadingId === act.id ? 'Cancelando...' : 'Cancelar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Enrolled Activities Content */}
        {!loading && activeTab === 'enrolled' && (
          <div>
            {displayedEnrolled.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white dark:bg-bg-card rounded-[32px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/40 text-[#2b4c7e] dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  {enrolledActivities.length === 0
                    ? 'Você ainda não está inscrito em nenhuma atividade'
                    : 'Nenhuma inscrição encontrada com estes filtros'}
                </h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
                  {enrolledActivities.length === 0
                    ? 'Explore as experiências disponíveis na sua cidade e garanta sua vaga nas oficinas presenciais.'
                    : 'Tente alterar os termos da sua pesquisa.'}
                </p>
                <Link
                  href="/atividades"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#b81d24] hover:bg-[#a0181d] text-white font-bold rounded-2xl shadow-sm transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Explorar Atividades Disponíveis
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedEnrolled.map((act) => (
                  <article
                    key={act.id}
                    className="rounded-[30px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm overflow-hidden flex flex-col bg-white dark:bg-bg-card hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 group"
                  >
                    {/* Image Thumbnail & Badges */}
                    <div className="relative h-48 w-full bg-[#faf9f5] dark:bg-bg-primary overflow-hidden border-b border-gray-100 dark:border-gray-800">
                      {act.image_url && (
                        <img
                          src={act.image_url}
                          alt={act.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}

                      {/* Duration & Category Badge */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs ${getDurationColor(act.category_name)}`}>
                          {act.duration}
                        </span>
                        <span className="bg-[#1f2937]/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                          {act.category_name}
                        </span>
                      </div>

                      {/* Inscription Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Inscrição Confirmada
                        </span>
                      </div>

                      {/* Price Tag Bottom Right */}
                      <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-bg-card/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-extrabold text-text-primary shadow-sm border border-black/5 dark:border-white/10">
                        {Number(act.price) === 0 ? 'Gratuita' : `R$ ${Number(act.price).toFixed(2)}`}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 flex flex-col flex-1 justify-between gap-5">
                      <div className="flex flex-col gap-3">
                        <h3 className="text-lg font-bold text-text-primary tracking-tight leading-snug line-clamp-2">
                          {act.title}
                        </h3>

                        {/* Organizer Info */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#2b4c7e] text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                            {(act.creator_name || 'OR').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-xs">
                            <span className="text-text-secondary">Organizado por </span>
                            <span className="font-bold text-text-primary">{act.creator_name}</span>
                          </div>
                        </div>

                        {/* Date, Time and Location */}
                        <div className="flex flex-col gap-1.5 text-xs text-text-secondary font-medium mt-1">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#b81d24] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{act.date} • {act.start_time}{act.end_time ? ` às ${act.end_time}` : ''}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#2b4c7e] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{act.location_name} • {act.address}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action CTAs */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                        <Link
                          href={`/atividades/${act.id}`}
                          className="flex-1 py-2.5 px-4 bg-[#2b4c7e] hover:bg-[#1f3a63] text-white font-bold text-xs md:text-sm rounded-xl text-center transition-colors shadow-xs"
                        >
                          Ver Detalhes
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCancelEnrollment(act.id)}
                          disabled={actionLoadingId === act.id}
                          className="py-2.5 px-3 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {actionLoadingId === act.id ? '...' : 'Cancelar Inscrição'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}