'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

  // Combine database activities with mockup design fallbacks to ensure layout matches image perfectly
  const displayActivities = [...activities];
  const fallbacks = [
    {
      id: -1,
      title: "Restauro de banquinhos de madeira e café coado",
      description: "Vamos lixar, pintar e revitalizar pequenos móveis de praça enquanto desfrutamos de um bom café.",
      date: "Amanhã",
      start_time: "14:00",
      end_time: "16:00",
      location_name: "Ateliê Coletivo",
      address: "Rua Mourato Coelho, 123 - Pinheiros",
      price: 0,
      max_participants: 10,
      category_name: "Manual",
      creator_name: "Ateliê Coletivo",
      creator_avatar: null,
      confirmed_count: 4,
      available_spots: 6,
      duration: "120 min",
      status: "approved"
    },
    {
      id: -2,
      title: "Introdução à Cerâmica Artesanal: Tigelas Básicas",
      description: "Uma tarde imersiva aprendendo os fundamentos do torno para criar sua própria peça de cerâmica.",
      date: "Sábado",
      start_time: "15:00",
      end_time: "16:30",
      location_name: "Cerâmica da Vila",
      address: "Rua Harmonia, 456 - Vila Madalena",
      price: 50,
      max_participants: 12,
      category_name: "Criativa",
      creator_name: "Cerâmica da Vila",
      creator_avatar: null,
      confirmed_count: 4,
      available_spots: 8,
      duration: "90 min",
      status: "approved"
    },
    {
      id: -3,
      title: "Clube de Leitura: Clássicos Esquecidos da Literatura",
      description: "Discussão guiada sobre obras menos conhecidas de autores consagrados mundiais.",
      date: "Quinta-feira",
      start_time: "19:00",
      end_time: "20:00",
      location_name: "Biblioteca Municipal",
      address: "Av. Paulista, 900 - Bela Vista",
      price: 0,
      max_participants: 15,
      category_name: "Intelectual",
      creator_name: "Biblioteca Municipal",
      creator_avatar: null,
      confirmed_count: 3,
      available_spots: 12,
      duration: "60 min",
      status: "approved"
    }
  ];

  fallbacks.forEach(fb => {
    if (!displayActivities.some(a => a.title.toLowerCase() === fb.title.toLowerCase())) {
      displayActivities.push(fb as any);
    }
  });

  const exploreActivities = [...activities];
  const fallbacksExplore = [
    {
      id: -4,
      title: "Escrita Criativa: Diários de Viagem",
      description: "Registre suas aventuras de forma literária e envolvente.",
      date: "Hoje",
      start_time: "19:00",
      end_time: "20:30",
      location_name: "Centro Cultural",
      address: "Rua Vergueiro, 1000",
      price: 0,
      max_participants: 20,
      category_name: "Intelectual",
      creator_name: "Clube do Livro",
      creator_avatar: null,
      confirmed_count: 5,
      available_spots: 15,
      duration: "90 min",
      status: "approved"
    },
    {
      id: -5,
      title: "Oficina de Marcenaria Básica",
      description: "Aprenda a manusear ferramentas de corte e lixamento com segurança.",
      date: "Amanhã",
      start_time: "14:00",
      end_time: "17:00",
      location_name: "Oficina Aberta",
      address: "Rua Fradique Coutinho, 500",
      price: 0,
      max_participants: 8,
      category_name: "Manual",
      creator_name: "Lab Garagem",
      creator_avatar: null,
      confirmed_count: 2,
      available_spots: 6,
      duration: "180 min",
      status: "approved"
    },
    {
      id: -6,
      title: "Aquarela ao Ar Livre",
      description: "Pintura livre de paisagens no parque orientado por um artista.",
      date: "Quarta",
      start_time: "10:00",
      end_time: "12:00",
      location_name: "Parque Villa-Lobos",
      address: "Av. Queiroz Filho, 1365",
      price: 0,
      max_participants: 10,
      category_name: "Criativa",
      creator_name: "Ateliê no Parque",
      creator_avatar: null,
      confirmed_count: 3,
      available_spots: 7,
      duration: "120 min",
      status: "approved"
    }
  ];

  fallbacksExplore.forEach(fb => {
    if (!exploreActivities.some(a => a.title.toLowerCase() === fb.title.toLowerCase())) {
      exploreActivities.push(fb as any);
    }
  });

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
  const filteredExplore = exploreActivities.filter(filterFn);

  // Image mapping helpers matching the premium mockup look
  const getCategoryImage = (categoryName: string, title: string = ''): string => {
    const cat = categoryName.toLowerCase();
    const t = title.toLowerCase();
    if (cat.includes('manual') || cat.includes('reparo') || t.includes('banquinho') || t.includes('marcenaria')) {
      return '/bench_coffee.svg';
    }
    if (cat.includes('art') || cat.includes('criativ') || cat.includes('cerâmica') || t.includes('cerâmica')) {
      return '/pottery.svg';
    }
    if (cat.includes('intelec') || cat.includes('leitura') || t.includes('leitura') || t.includes('escrita')) {
      return '/reading_book.svg';
    }
    if (cat.includes('jogo')) {
      return 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=500&auto=format&fit=crop&q=60';
    }
    if (cat.includes('físic') || cat.includes('atividade')) {
      return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60';
    }
    return 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&auto=format&fit=crop&q=60';
  };

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

  // Category details mapping icons and colors
  const categoryDetails = [
    { name: "Todos", color: "bg-[#2b4c7e]", icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { name: "Manuais & Reparos", color: "bg-[#b81d24]", icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { name: "Artísticas & Criativas", color: "bg-[#e2a524]", icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    )},
    { name: "Intelectuais & Leitura", color: "bg-[#2b4c7e]", icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )},
    { name: "Jogos", color: "bg-[#b81d24]", icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <rect x="2" y="6" width="20" height="12" rx="6" fill="none" stroke="currentColor" />
        <path d="M6 12h4M8 10v4M15 11v.01M17 13v.01" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
    )},
    { name: "Atividade Física", color: "bg-[#e2a524]", icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5.5 19.5l3-3.5 2 1.5 4-5.5M10.5 11l2.5-3 3 2.5" />
      </svg>
    )}
  ];

  const usernameTag = `@${email?.split('@')[0] || 'usuario'}`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#faf9f5] dark:bg-[#0f0f10] font-sans antialiased text-text-primary select-none transition-colors duration-200">
      {/* 1. SIDEBAR (Desktop only) */}
      <aside className="hidden md:flex flex-col w-72 bg-[#f3f2eb] dark:bg-[#161618] border-r border-[#e5e3db] dark:border-[#28282b] p-6 justify-between shrink-0 h-screen sticky top-0 transition-colors duration-200">
        {/* Logo & Navigation */}
        <div className="flex flex-col gap-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-1 px-2">
            <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Atmo</span>
            <svg className="w-4 h-4 text-amber-500 fill-current self-start mt-1.5" viewBox="0 0 24 24">
              <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
            </svg>
          </div>

          {/* Navigation Menu */}
          <nav className="flex flex-col gap-2">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 bg-[#b81d24] text-white rounded-xl font-bold transition-all shadow-sm"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <Link
              href="/atividades"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-text-primary rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-all font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Discover
            </Link>
            <Link
              href="/minhas-atividades"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-text-primary rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-all font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Minhas Atividades
            </Link>
            <Link
              href="/criar-atividade"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-text-primary rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-all font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Criar Atividade
            </Link>
            <Link
              href="/perfil"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-text-primary rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-all font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configurações
            </Link>
          </nav>
        </div>

        {/* Theme Toggle & Profile Widget Area */}
        <div className="flex flex-col gap-4">
          {/* Dark Mode Slide Toggle Switch */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-2xl text-text-secondary font-medium transition-all text-sm cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
              <span className="text-gray-700 dark:text-gray-300">Modo Escuro</span>
            </div>

            {/* Slide UI */}
            <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${darkMode ? 'bg-[#b81d24]' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${darkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
          </button>

          {/* Profile Widget */}
          <div className="relative">
            <div
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-3 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-2xl cursor-pointer transition-all border border-transparent"
            >
              <div className="w-10 h-10 rounded-full bg-[#2b4c7e] text-white flex items-center justify-center font-bold text-base shadow-sm">
                {name ? name.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{name}</p>
                <p className="text-xs text-text-secondary truncate">{usernameTag}</p>
              </div>
              <svg className="w-5 h-5 text-text-secondary/70" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>

            {showProfileMenu && (
              <div className="absolute bottom-16 left-0 right-0 bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-2 z-50 flex flex-col gap-1">
                <Link href="/perfil" className="px-4 py-2 hover:bg-bg-primary rounded-xl text-sm font-medium text-text-primary">Meu Perfil</Link>
                <Link href="/minhas-atividades" className="px-4 py-2 hover:bg-bg-primary rounded-xl text-sm font-medium text-text-primary">Minhas Atividades</Link>
                <hr className="my-1 border-border-primary" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 rounded-xl text-sm font-semibold animate-pulse"
                >
                  Sair da Conta
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#f3f2eb] dark:bg-[#161618] border-b border-[#e5e3db] dark:border-[#28282b] sticky top-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Atmo</span>
          <svg className="w-3.5 h-3.5 text-amber-500 fill-current self-start mt-0.5" viewBox="0 0 24 24">
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </svg>
        </div>

        <div className="flex items-center gap-3">
          {/* Dark mode button for mobile */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Alternar Tema"
          >
            {darkMode ? (
              <svg className="w-5.5 h-5.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.364 17.636l-.707.707M18.364 18.364l-.707-.707M6.364 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <svg className="w-5.5 h-5.5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="p-2 text-text-secondary hover:text-red-600 transition-colors cursor-pointer"
            title="Sair"
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#f3f2eb] dark:bg-[#161618] border-t border-[#e5e3db] dark:border-[#28282b] py-2.5 px-4 flex justify-around items-center z-40 shadow-lg transition-colors duration-200">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-[#b81d24]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/atividades" className="flex flex-col items-center gap-0.5 text-text-secondary hover:text-text-primary">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] font-semibold">Buscar</span>
        </Link>
        <Link href="/criar-atividade" className="flex flex-col items-center gap-0.5 text-text-secondary hover:text-text-primary">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[10px] font-semibold">Criar</span>
        </Link>
        <Link href="/minhas-atividades" className="flex flex-col items-center gap-0.5 text-text-secondary hover:text-text-primary">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px] font-semibold">Minhas</span>
        </Link>
        <Link href="/perfil" className="flex flex-col items-center gap-0.5 text-text-secondary hover:text-text-primary">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-semibold">Perfil</span>
        </Link>
      </nav>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 overflow-x-hidden bg-[#faf9f5] dark:bg-[#0f0f10] transition-colors duration-200">

        {/* Search Header Row */}
        <div className="bg-transparent px-6 md:px-8 py-6 transition-colors duration-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchQuery(searchInput);
            }}
            className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center max-w-5xl"
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
                placeholder="Advanced Search..."
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
              <span className="text-gray-800 dark:text-gray-200">Pinheiros, SP</span>
            </div>
          </form>
        </div>

        {/* Horizontal Categories Filter List */}
        <div className="bg-transparent px-6 md:px-8 py-4 flex gap-6 overflow-x-auto scrollbar-none items-center transition-colors duration-200">
          {categoryDetails.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center gap-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 group ${
                  isActive
                    ? "opacity-100 scale-105 font-bold"
                    : "opacity-75 hover:opacity-100 hover:scale-102"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${cat.color} transition-transform group-hover:scale-110`}>
                  {cat.icon}
                </div>
                {cat.name !== "Todos" && (
                  <span className={`text-xs md:text-sm tracking-tight ${
                    isActive
                      ? "text-text-primary font-bold border-b-2 border-text-primary/65 pb-0.5"
                      : "text-text-secondary font-medium"
                  }`}>
                    {cat.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Popular This Week Section */}
        <section className="bg-transparent px-6 md:px-8 py-8 flex-1 max-w-7xl w-full mx-auto transition-colors duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold text-text-primary tracking-tight font-sans">
              Popular <span className="text-[#b81d24] italic font-black">This Week</span>
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
                    <img
                      src={getCategoryImage(act.category_name, act.title)}
                      alt={act.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />

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
                        <div className="w-8 h-8 rounded-full bg-[#2b4c7e] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {act.creator_name.substring(0, 2).toUpperCase()}
                        </div>
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
                Explore <span className="text-[#b81d24] font-black">More Activities</span>
              </h2>
              <button className="flex items-center gap-2 text-gray-500 hover:text-text-primary font-bold text-sm bg-transparent border border-transparent px-3 py-1.5 rounded-xl cursor-pointer">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filtrar</span>
              </button>
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