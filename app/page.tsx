'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  creator_avatar: string | null
  confirmed_count: number
  available_spots: number
  duration: string
}

type Category = {
  id: number
  name: string
}

export default function Home() {
  const router = useRouter()

  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Data states
  const [categories, setCategories] = useState<Category[]>([])
  const [activities, setActivities] = useState<Activity[]>([])

  // Interactive states
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Restore dark mode from local storage
    const isDark = localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    async function loadAllData() {
      setLoading(true)

      // 1. Auth User Check
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? null)
      setName(user?.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Usuário')

      // 2. Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      setCategories(categoriesData ?? [])

      // 3. Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')

      // 4. Fetch confirmed activity participants count
      const { data: participantsData } = await supabase
        .from('activity_participants')
        .select('activity_id')
        .eq('status', 'confirmed')

      // 5. Fetch approved activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('status', 'approved')
        .order('date', { ascending: true })

      const activityIds = (activitiesData ?? []).map(activity => activity.id)
      const { data: imagesData } = await supabase
        .from('activity_images')
        .select('activity_id, url, position')
        .in('activity_id', activityIds)
        .order('position', { ascending: true })

      const imageMap = new Map<number, string>()
      for (const image of imagesData ?? []) {
        if (!imageMap.has(image.activity_id)) imageMap.set(image.activity_id, image.url)
      }

      // Map relations and calculate duration
      const mapped = (activitiesData ?? []).map((act: any) => {
        const category = (categoriesData ?? []).find(c => c.id === act.category_id);
        const creator = (profilesData ?? []).find(p => p.id === act.creator_id);
        const confirmedCount = (participantsData ?? []).filter(p => p.activity_id === act.id).length;

        // Calculate duration
        let duration = '90 min';
        if (act.start_time && act.end_time) {
          try {
            const [sh, sm] = act.start_time.split(':').map(Number);
            const [eh, em] = act.end_time.split(':').map(Number);
            const diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff > 0) duration = `${diff} min`;
          } catch (e) { }
        }

        return {
          ...act,
          image_url: imageMap.get(act.id) ?? null,
          category_name: category ? category.name : 'Outros',
          creator_name: creator ? (creator.name || 'Organizador') : 'Organizador',
          creator_avatar: creator ? creator.avatar_url : null,
          confirmed_count: confirmedCount,
          available_spots: act.max_participants - confirmedCount,
          duration
        };
      });

      setActivities(mapped)
      setLoading(false)
    }

    loadAllData()
  }, [router])

  const toggleDarkMode = () => {
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary font-medium">Carregando o Atmo...</p>
        </div>
      </div>
    )
  }

  const displayActivities = activities;
  const exploreActivities = activities;

  // Filtering logic
  const filterFn = (act: any) => {
    // Filter by category
    if (selectedCategory !== 'Todos') {
      const actCat = act.category_name.toLowerCase();
      const selCat = selectedCategory.toLowerCase();

      let match = actCat.includes(selCat);
      if (selCat.includes('manual') && actCat.includes('manual')) match = true;
      if (selCat.includes('criativ') && actCat.includes('criativ')) match = true;
      if (selCat.includes('intelec') && actCat.includes('intelec')) match = true;
      if (selCat.includes('físic') && actCat.includes('físic')) match = true;

      if (!match) return false;
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = act.title.toLowerCase().includes(query) ||
        act.description?.toLowerCase().includes(query) ||
        act.location_name.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    return true;
  };

  const filteredPopular = displayActivities.filter(filterFn);
  const filteredExplore = exploreActivities.filter(filterFn).slice(3);

  const getDurationColor = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    if (name.includes('manual') || name.includes('reparo')) return 'bg-[#e2a524] text-black font-bold';
    if (name.includes('art') || name.includes('criativ')) return 'bg-[#a855f7] text-white font-bold';
    if (name.includes('intelec') || name.includes('leitura')) return 'bg-[#06b6d4] text-white font-bold';
    return 'bg-[#10b981] text-white font-bold';
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('manual') || name.includes('reparo')) {
      return (
        <div className="w-10 h-10 bg-[#e2a524] text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      );
    }
    if (name.includes('art') || name.includes('criativ')) {
      return (
        <div className="w-10 h-10 bg-[#a855f7] text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
      );
    }
    if (name.includes('intelec') || name.includes('leitura') || name.includes('livro') || name.includes('escrita')) {
      return (
        <div className="w-10 h-10 bg-[#2b4c7e] text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      );
    }
    if (name.includes('jogo')) {
      return (
        <div className="w-10 h-10 bg-[#b81d24] text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2" y="6" width="20" height="12" rx="6" fill="none" stroke="currentColor" />
            <path d="M6 12h4M8 10v4M15 11v.01M17 13v.01" strokeLinecap="round" strokeWidth="2.5" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 bg-[#e2a524] text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5.5 19.5l3-3.5 2 1.5 4-5.5M10.5 11l2.5-3 3 2.5" />
        </svg>
      </div>
    );
  };

  const categoryDetails = [
    { name: 'Todos', color: 'bg-[#5f0a92]' },
    ...categories.map((category) => ({
      name: category.name,
      color: 'bg-[#2B4C7E]',
    })),
  ];

  const usernameTag = `@${email?.split('@')[0] || 'usuario'}`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#faf9f5] dark:bg-[#0f0f10] font-sans antialiased text-text-primary select-none transition-colors duration-200">
      <AppSidebar />

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 overflow-x-hidden bg-[#faf9f5] dark:bg-[#0f0f10] transition-colors duration-200">


        {/* Search Header Row */}
        <div className="bg-transparent px-6 md:px-8 py-6 transition-colors duration-200">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b81d24]">Atmo</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
                Olá, {name}
              </h1>
            </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchQuery(searchInput);
            }}
            className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:max-w-3xl"
          >
            {/* Search Input Box */}
            <div className="flex-1 relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Pesquisa..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-[#b81d24] focus:border-transparent text-sm shadow-sm transition-all text-text-primary"
              />
            </div>

            {/* Buscar Button */}
            <button
              type="submit"
              className="px-8 py-3 bg-[#b81d24] hover:bg-[#a0181d] text-white font-bold rounded-full text-sm transition-colors shadow-sm select-none cursor-pointer"
            >
              Buscar
            </button>

            {/* Location Select Badge */}
            <div className="flex items-center gap-2 px-5 py-3 border border-gray-200 dark:border-gray-800 rounded-full bg-white dark:bg-bg-card text-text-secondary text-sm font-semibold shadow-sm select-none sm:self-center">
              <svg className="w-4 h-4 text-[#2b4c7e]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-800 dark:text-gray-200">Cidade, Estado</span>
            </div>
          </form>
          </div>
        </div>

        {/* Horizontal Categories Filter List */}
        <div className="flex items-center justify-center gap-6 overflow-x-auto bg-transparent px-6 py-4 scrollbar-none transition-colors duration-200">
          {categoryDetails.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-6 py-2 transition-all duration-200 cursor-pointer group ${isActive
                  ? "scale-110 bg-white font-bold opacity-100 shadow-md ring-2 ring-[#fffff] dark:bg-bg-card"
                  : "opacity-75 hover:scale-105 hover:bg-white hover:opacity-100 dark:hover:bg-bg-card/70"
                  }`}
              >
                {cat.name === 'Todos' ? (
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${cat.color} transition-transform group-hover:scale-110`}>
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                ) : getCategoryIcon(cat.name)}
                <span className={`text-xs tracking-tight md:text-sm ${isActive
                  ? "border-b-2 border-text-primary/65 pb-0.5 font-bold text-text-primary"
                  : "font-medium text-text-secondary"
                  }`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Popular This Week Section */}
        <section className="bg-transparent px-6 md:px-8 py-8 flex-1 max-w-7xl w-full mx-auto transition-colors duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold text-text-primary tracking-tight font-sans">
              Popular <span className="text-[#b81d24] italic font-black">Nessa semana</span>
            </h2>
            <button className="text-text-secondary hover:text-text-primary p-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>

          {filteredPopular.length === 0 ? (
            <p className="text-text-secondary py-10 text-center">Nenhuma atividade popular encontrada com estes filtros.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPopular.slice(0, 3).map((act) => (
                <article
                  key={act.id}
                  onClick={() => {
                    if (act.id < 0) {
                      router.push('/atividades');
                    } else {
                      router.push(`/atividades/${act.id}`);
                    }
                  }}
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
                      <span className="bg-[#1f2937]/60 text-white/90 backdrop-blur-sm text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                        {act.category_name}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-6 flex flex-col flex-1 justify-between gap-6 transition-colors duration-200">
                    <div className="flex flex-col gap-3">
                      {/* Title */}
                      <h3 className="text-xl font-bold text-text-primary tracking-tight leading-snug line-clamp-2">
                        {act.title}
                      </h3>

                      {/* Creator Info */}
                      <div className="flex items-center gap-2.5">
                        {act.creator_avatar ? <img src={act.creator_avatar} alt={act.creator_name} className="h-8 w-8 rounded-full object-cover shadow-sm" /> : <div className="w-8 h-8 rounded-full bg-[#2b4c7e] text-white flex items-center justify-center font-bold text-xs shadow-sm">{act.creator_name.substring(0, 2).toUpperCase()}</div>}
                        <span className="text-xs font-semibold text-text-secondary">{act.creator_name}</span>
                      </div>

                      {/* Snippet Description */}
                      <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
                        {act.description || "Nenhuma descrição detalhada fornecida para esta atividade."}
                      </p>
                    </div>

                    {/* Bottom Action CTA Button */}
                    <button
                      type="button"
                      className="bg-[#2b4c7e] hover:bg-[#1f3a63] text-white font-bold flex items-center justify-between w-full px-6 py-4 rounded-[20px] transition-colors select-none group/btn mt-auto"
                    >
                      <span className="text-sm">Escolher atividade ({act.available_spots} vagas)</span>
                      <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Explore More Activities Section */}
        <section className="bg-transparent text-text-primary px-6 md:px-8 py-10 flex-1 w-full transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-extrabold tracking-tight text-text-primary font-sans">
                Explore <span className="text-[#b81d24] font-black">Mais Atividades</span>
              </h2>
              {/* <button className="flex items-center gap-2 text-gray-500 hover:text-text-primary font-bold text-sm bg-transparent border border-transparent px-3 py-1.5 rounded-xl cursor-pointer">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filtrar</span>
              </button> */}
            </div>

            {filteredExplore.length === 0 ? (
              <p className="text-text-secondary py-10 text-center">Nenhuma atividade disponível para exploração.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredExplore.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => {
                      if (act.id < 0) {
                        router.push('/atividades');
                      } else {
                        router.push(`/atividades/${act.id}`);
                      }
                    }}
                    className="bg-white hover:bg-gray-50 dark:bg-bg-card/50 dark:hover:bg-bg-card border border-gray-200/60 dark:border-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md hover:translate-x-1 rounded-[20px] p-4 flex items-center justify-between cursor-pointer transition-all duration-300 select-none shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      {/* Colored Category Icon */}
                      {getCategoryIcon(act.category_name)}

                      {/* Info */}
                      <div>
                        <h3 className="font-bold text-base md:text-lg text-text-primary leading-tight">
                          {act.title}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                          {act.category_name}
                          <span className="mx-2">•</span>
                          {act.date}, {act.start_time}
                          <span className="mx-2">•</span>
                          {act.duration}
                        </p>
                      </div>
                    </div>

                    {/* Chevron Arrow */}
                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}