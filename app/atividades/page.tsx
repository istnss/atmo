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
  category_name: string
  creator_name: string
  confirmed_count: number
  available_spots: number
  duration: string
}

type Category = {
  id: number
  name: string
}

export default function AtividadesPage() {
  const router = useRouter()

  const [activities, setActivities] = useState<Activity[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Interactive filters
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  const [onlyWithSpots, setOnlyWithSpots] = useState(false)
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'price_asc' | 'price_desc'>('date_asc')

  useEffect(() => {
    async function loadAllActivities() {
      try {
        setLoading(true)
        setError('')

        // 1. Fetch categories
        const { data: categoriesData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true })

        if (catError) throw catError
        const cats = categoriesData ?? []
        setCategories(cats)

        // 2. Fetch profiles for creator names
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')

        const profMap = new Map((profilesData ?? []).map(p => [p.id, p.name || 'Organizador']))

        // 3. Fetch participants
        const { data: participantsData } = await supabase
          .from('activity_participants')
          .select('activity_id')
          .eq('status', 'confirmed')

        const allParticipants = participantsData ?? []

        // 4. Fetch approved activities
        const { data: activitiesData, error: actError } = await supabase
          .from('activities')
          .select('*')
          .eq('status', 'approved')
          .order('date', { ascending: true })

        if (actError) throw actError

        const activityIds = (activitiesData ?? []).map(activity => activity.id)
        const { data: imagesData, error: imagesError } = await supabase
          .from('activity_images')
          .select('activity_id, url, position')
          .in('activity_id', activityIds)
          .order('position', { ascending: true })

        if (imagesError) throw imagesError

        const imageMap = new Map<number, string>()
        for (const image of imagesData ?? []) {
          if (!imageMap.has(image.activity_id)) imageMap.set(image.activity_id, image.url)
        }

        const mapped: Activity[] = (activitiesData ?? []).map((act: any) => {
          const category = cats.find(c => c.id === act.category_id)
          const confirmedCount = allParticipants.filter(p => p.activity_id === act.id).length

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
            category_name: category ? category.name : 'Outros',
            creator_name: profMap.get(act.creator_id) || 'Organizador',
            confirmed_count: confirmedCount,
            available_spots: Math.max(0, act.max_participants - confirmedCount),
            duration,
          }
        })

        setActivities(mapped)
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar atividades.')
      } finally {
        setLoading(false)
      }
    }

    loadAllActivities()
  }, [])

  const getDurationColor = (categoryName: string = ''): string => {
    const name = categoryName.toLowerCase()
    if (name.includes('manual') || name.includes('reparo')) return 'bg-[#e2a524] text-black font-bold'
    if (name.includes('art') || name.includes('criativ')) return 'bg-[#a855f7] text-white font-bold'
    if (name.includes('intelec') || name.includes('leitura')) return 'bg-[#06b6d4] text-white font-bold'
    return 'bg-[#10b981] text-white font-bold'
  }

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('manual') || name.includes('reparo')) {
      return (
        <div className="w-9 h-9 bg-[#e2a524] text-white rounded-full flex items-center justify-center shrink-0 shadow-xs">
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      )
    }
    if (name.includes('art') || name.includes('criativ')) {
      return (
        <div className="w-9 h-9 bg-[#a855f7] text-white rounded-full flex items-center justify-center shrink-0 shadow-xs">
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
      )
    }
    if (name.includes('intelec') || name.includes('leitura') || name.includes('livro') || name.includes('escrita')) {
      return (
        <div className="w-9 h-9 bg-[#2b4c7e] text-white rounded-full flex items-center justify-center shrink-0 shadow-xs">
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      )
    }
    if (name.includes('jogo')) {
      return (
        <div className="w-9 h-9 bg-[#b81d24] text-white rounded-full flex items-center justify-center shrink-0 shadow-xs">
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2" y="6" width="20" height="12" rx="6" fill="none" stroke="currentColor" />
            <path d="M6 12h4M8 10v4M15 11v.01M17 13v.01" strokeLinecap="round" strokeWidth="2.5" />
          </svg>
        </div>
      )
    }
    return (
      <div className="w-9 h-9 bg-[#10b981] text-white rounded-full flex items-center justify-center shrink-0 shadow-xs">
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5.5 19.5l3-3.5 2 1.5 4-5.5M10.5 11l2.5-3 3 2.5" />
        </svg>
      </div>
    )
  }

  // Filter & Sorting Logic
  const filteredActivities = activities
    .filter((act) => {
      // Category filter
      if (selectedCategory !== 'Todos') {
        const actCat = act.category_name.toLowerCase()
        const selCat = selectedCategory.toLowerCase()
        let match = actCat.includes(selCat)
        if (selCat.includes('manual') && actCat.includes('manual')) match = true
        if (selCat.includes('criativ') && actCat.includes('criativ')) match = true
        if (selCat.includes('intelec') && actCat.includes('intelec')) match = true
        if (selCat.includes('físic') && actCat.includes('físic')) match = true
        if (!match) return false
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          act.title.toLowerCase().includes(q) ||
          (act.description && act.description.toLowerCase().includes(q)) ||
          act.location_name.toLowerCase().includes(q) ||
          act.address.toLowerCase().includes(q)
        if (!match) return false
      }

      // Only Free filter
      if (onlyFree && Number(act.price) > 0) return false

      // Only With Spots filter
      if (onlyWithSpots && act.available_spots <= 0) return false

      return true
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime()
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
      return 0
    })

  const categoryList = [
    { name: 'Todos', color: 'bg-[#5f0a92]' },
    ...categories.map((cat) => ({
      name: cat.name,
      color: 'bg-[#2B4C7E]',
    })),
  ]

  return (
    <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex font-sans antialiased text-text-primary transition-colors duration-200 select-none">
      <AppSidebar />

      <main className="flex-1 p-6 pb-24 md:p-10 max-w-7xl w-full mx-auto overflow-x-hidden">
        {/* Page Header and Search Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b81d24]">
                Explorar Experiências
              </p>
              <h1 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
                Todas as Atividades
              </h1>
              <p className="mt-1 text-text-secondary text-sm md:text-base max-w-2xl">
                Descubra oficinas presenciais em pequenos grupos, conheça pessoas incríveis e aprenda novas habilidades em Itajaí - SC.
              </p>
            </div>

            {/* Search Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSearchQuery(searchInput)
              }}
              className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:max-w-xl"
            >
              <div className="flex-1 relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Buscar oficinas, tópicos ou locais..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-bg-card border border-gray-200/80 dark:border-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-[#b81d24] focus:border-transparent text-sm shadow-sm transition-all text-text-primary"
                />
              </div>

              <button
                type="submit"
                className="px-7 py-3 bg-[#b81d24] hover:bg-[#a0181d] text-white font-bold rounded-full text-sm transition-colors shadow-sm cursor-pointer select-none shrink-0"
              >
                Buscar
              </button>

              <div className="hidden sm:flex items-center gap-2 px-4 py-3 border border-gray-200/80 dark:border-gray-800 rounded-full bg-white dark:bg-bg-card text-text-secondary text-xs font-semibold shadow-xs shrink-0">
                <svg className="w-4 h-4 text-[#2b4c7e]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Itajaí, SC</span>
              </div>
            </form>
          </div>
        </div>

        {/* Horizontal Category Carousel Filter */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-1 scrollbar-none mb-6">
          {categoryList.map((cat) => {
            const isActive = selectedCategory === cat.name
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-2xl px-5 py-2.5 transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? 'bg-white dark:bg-bg-card shadow-md scale-102 font-bold ring-2 ring-[#b81d24]/20 border border-transparent'
                    : 'bg-white/70 dark:bg-bg-card/50 hover:bg-white dark:hover:bg-bg-card border border-gray-200/60 dark:border-gray-800/60 hover:scale-101'
                }`}
              >
                {cat.name === 'Todos' ? (
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-xs ${cat.color} transition-transform group-hover:scale-105`}>
                    <svg className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                ) : (
                  getCategoryIcon(cat.name)
                )}
                <span className={`text-xs md:text-sm ${
                  isActive
                    ? 'font-bold text-text-primary'
                    : 'font-medium text-text-secondary group-hover:text-text-primary'
                }`}>
                  {cat.name}
                </span>
              </button>
            )
          })}
        </div>

        {/* Secondary Filter Badges & Sort Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-bg-card rounded-[22px] border border-gray-200/80 dark:border-gray-800/80 shadow-xs mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-text-secondary mr-1">Filtros rápidos:</span>
            
            {/* Free only button */}
            <button
              type="button"
              onClick={() => setOnlyFree(!onlyFree)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                onlyFree
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-secondary hover:text-text-primary'
              }`}
            >
              ✓ Apenas Gratuitas
            </button>

            {/* With spots only button */}
            <button
              type="button"
              onClick={() => setOnlyWithSpots(!onlyWithSpots)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                onlyWithSpots
                  ? 'bg-[#2b4c7e] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-secondary hover:text-text-primary'
              }`}
            >
              ✓ Com Vagas Abertas
            </button>

            {(searchQuery || onlyFree || onlyWithSpots || selectedCategory !== 'Todos') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Todos')
                  setSearchInput('')
                  setSearchQuery('')
                  setOnlyFree(false)
                  setOnlyWithSpots(false)
                }}
                className="text-xs text-[#b81d24] hover:underline font-bold px-2 py-1"
              >
                Limpar filtros ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-secondary">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-[#b81d24]"
            >
              <option value="date_asc">Data mais próxima</option>
              <option value="date_desc">Data mais distante</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm font-medium">
            Erro ao carregar atividades: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-bg-card rounded-[32px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
            <div className="w-12 h-12 border-4 border-[#b81d24] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-text-secondary font-semibold text-sm">Carregando experiências...</p>
          </div>
        )}

        {/* Activities Grid */}
        {!loading && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-bold text-text-secondary">
                Mostrando <span className="text-text-primary font-black">{filteredActivities.length}</span> {filteredActivities.length === 1 ? 'oficina disponível' : 'oficinas disponíveis'}
              </p>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white dark:bg-bg-card rounded-[32px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Nenhuma atividade encontrada</h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
                  Tente alterar seus termos de busca ou remover os filtros aplicados para ver mais oficinas.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Todos')
                    setSearchInput('')
                    setSearchQuery('')
                    setOnlyFree(false)
                    setOnlyWithSpots(false)
                  }}
                  className="px-6 py-3 bg-[#b81d24] hover:bg-[#a0181d] text-white font-bold rounded-2xl shadow-sm transition-all"
                >
                  Limpar Todos os Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredActivities.map((act) => (
                  <article
                    key={act.id}
                    onClick={() => router.push(`/atividades/${act.id}`)}
                    className="rounded-[32px] border border-gray-200/80 dark:border-gray-800/80 shadow-sm overflow-hidden flex flex-col h-full bg-white dark:bg-bg-card group hover:-translate-y-1.5 hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-700 active:scale-98 active:translate-y-0 transition-all duration-300 ease-out cursor-pointer"
                  >
                    {/* Image & Badges */}
                    <div className="relative h-56 w-full bg-[#faf9f5] dark:bg-bg-primary overflow-hidden border-b border-gray-100 dark:border-gray-800">
                      {act.image_url && (
                        <img
                          src={act.image_url}
                          alt={act.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}

                      {/* Badge Overlays */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm ${getDurationColor(act.category_name)}`}>
                          {act.duration}
                        </span>
                        <span className="bg-[#1f2937]/75 backdrop-blur-xs text-white/95 text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                          {act.category_name}
                        </span>
                      </div>

                      {/* Price Pill Bottom Right */}
                      <div className="absolute bottom-3.5 right-3.5 bg-white/95 dark:bg-bg-card/95 backdrop-blur-xs px-3.5 py-1 rounded-full text-xs font-black text-text-primary shadow-md border border-black/5 dark:border-white/10">
                        {Number(act.price) === 0 ? 'Gratuita' : `R$ ${Number(act.price).toFixed(2)}`}
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-6 flex flex-col flex-1 justify-between gap-6 transition-colors duration-200">
                      <div className="flex flex-col gap-3.5">
                        {/* Title */}
                        <h3 className="text-xl font-bold text-text-primary tracking-tight leading-snug line-clamp-2">
                          {act.title}
                        </h3>

                        {/* Creator Info */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#2b4c7e] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {act.creator_name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-text-secondary">{act.creator_name}</span>
                        </div>

                        {/* Snippet Description */}
                        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
                          {act.description || 'Nenhuma descrição detalhada fornecida para esta oficina.'}
                        </p>

                        {/* Date & Location */}
                        <div className="flex flex-col gap-1.5 text-xs text-text-secondary font-medium pt-2 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#b81d24] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{act.date} • {act.start_time}{act.end_time ? ` - ${act.end_time}` : ''}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#2b4c7e] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{act.location_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action CTA Button */}
                      <button
                        type="button"
                        className="bg-[#2b4c7e] hover:bg-[#1f3a63] text-white font-bold flex items-center justify-between w-full px-5 py-3.5 rounded-[20px] transition-colors select-none group/btn mt-auto cursor-pointer"
                      >
                        <span className="text-xs md:text-sm">
                          {act.available_spots > 0
                            ? `Escolher atividade (${act.available_spots} vagas)`
                            : 'Atividade lotada'}
                        </span>
                        <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
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