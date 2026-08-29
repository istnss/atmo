'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  cancellation_reason: string | null
  status: string
}

type Category = {
  id: number
  name: string
}

type Profile = {
  id: string
  name: string | null
  avatar_url: string | null
  bio: string | null
}

export default function AtividadeDetalhesPage() {
  const params = useParams()
  const router = useRouter()

  const [activity, setActivity] = useState<Activity | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [creator, setCreator] = useState<Profile | null>(null)

  const [participantCount, setParticipantCount] = useState(0)
  const [isParticipant, setIsParticipant] = useState(false)
  const [isCreator, setIsCreator] = useState(false)

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadActivity() {
      const activityId = Number(params.id)

      if (!activityId) {
        setError('ID da atividade inválido.')
        setLoading(false)
        return
      }

      try {
        const { data: activityData, error: activityError } = await supabase
          .from('activities')
          .select('*')
          .eq('id', activityId)
          .single()

        if (activityError || !activityData) {
          setError('Atividade não encontrada.')
          setLoading(false)
          return
        }

        const { data: imageData } = await supabase
          .from('activity_images')
          .select('url, position')
          .eq('activity_id', activityId)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle()
        setActivity({ ...activityData, image_url: imageData?.url ?? null })

        // Category
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id, name')
          .eq('id', activityData.category_id)
          .single()

        setCategory(categoryData)

        // Creator
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, bio')
          .eq('id', activityData.creator_id)
          .single()

        setCreator(creatorData)

        // Participant count
        const { count } = await supabase
          .from('activity_participants')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('activity_id', activityId)
          .eq('status', 'confirmed')

        setParticipantCount(count ?? 0)

        // Current User Participation Check
        const { data: userData } = await supabase.auth.getUser()
        const user = userData.user

        if (user) {
          if (user.id === activityData.creator_id) {
            setIsCreator(true)
          }

          const { data: participation } = await supabase
            .from('activity_participants')
            .select('id')
            .eq('activity_id', activityId)
            .eq('user_id', user.id)
            .eq('status', 'confirmed')
            .maybeSingle()

          if (participation) {
            setIsParticipant(true)
          }
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar os dados.')
      } finally {
        setLoading(false)
      }
    }

    loadActivity()
  }, [params.id])

  async function handleJoin() {
    if (!activity) return

    setJoining(true)
    setMessage('')
    setError('')

    const { error: joinError } = await supabase.rpc('join_activity', {
      p_activity_id: activity.id,
    })

    if (joinError) {
      setError(joinError.message)
      setJoining(false)
      return
    }

    setParticipantCount((count) => count + 1)
    setIsParticipant(true)
    setMessage('Parabéns! Sua vaga foi confirmada com sucesso.')
    setJoining(false)
  }

  async function handleCancel() {
    if (!activity) return
    if (!confirm('Deseja realmente cancelar sua inscrição nesta atividade?')) return

    setJoining(true)
    setMessage('')
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setError('Você precisa estar logado.')
      setJoining(false)
      return
    }

    const { error: cancelError } = await supabase
      .from('activity_participants')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('activity_id', activity.id)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')

    if (cancelError) {
      setError(cancelError.message)
      setJoining(false)
      return
    }

    setParticipantCount((count) => Math.max(0, count - 1))
    setIsParticipant(false)
    setMessage('Sua participação foi cancelada com sucesso.')
    setJoining(false)
  }

  async function handleCancelActivity() {
    if (!activity) return

    const reason = window.prompt('Informe o motivo do cancelamento da oficina:')
    if (!reason || reason.trim() === '') return

    setJoining(true)
    setMessage('')
    setError('')

    const { error: cancelError } = await supabase
      .from('activities')
      .update({
        status: 'cancelled',
        cancellation_reason: reason.trim(),
      })
      .eq('id', activity.id)

    if (cancelError) {
      setError(cancelError.message)
      setJoining(false)
      return
    }

    setActivity({
      ...activity,
      status: 'cancelled',
      cancellation_reason: reason.trim(),
    })

    setMessage('Atividade cancelada com sucesso.')
    setJoining(false)
  }

  const getDurationColor = (categoryName: string = ''): string => {
    const name = categoryName.toLowerCase()
    if (name.includes('manual') || name.includes('reparo')) return 'bg-[#e2a524] text-black font-bold'
    if (name.includes('art') || name.includes('criativ')) return 'bg-[#a855f7] text-white font-bold'
    if (name.includes('intelec') || name.includes('leitura')) return 'bg-[#06b6d4] text-white font-bold'
    return 'bg-[#10b981] text-white font-bold'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex">
        <AppSidebar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#b81d24] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary font-medium">Carregando detalhes da oficina...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex">
        <AppSidebar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-white dark:bg-bg-card p-8 rounded-[28px] border border-gray-200 dark:border-gray-800 shadow-sm">
            <h1 className="text-2xl font-extrabold text-text-primary mb-2">Atividade não encontrada</h1>
            <p className="text-text-secondary text-sm mb-6">{error || 'A oficina procurada não existe ou foi removida.'}</p>
            <Link
              href="/atividades"
              className="px-6 py-3 bg-[#b81d24] text-white font-bold rounded-xl text-sm shadow-sm inline-block"
            >
              Explorar outras atividades
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const availableSpots = Math.max(0, activity.max_participants - participantCount)
  const percentFilled = Math.min(100, Math.round((participantCount / activity.max_participants) * 100))

  return (
    <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex font-sans antialiased text-text-primary transition-colors duration-200 select-none">
      <AppSidebar />

      <main className="flex-1 p-6 pb-24 md:p-10 max-w-6xl w-full mx-auto overflow-x-hidden">
        {/* Navigation Breadcrumb / Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-text-secondary hover:text-text-primary bg-white dark:bg-bg-card px-4 py-2 rounded-full border border-gray-200/80 dark:border-gray-800 shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </button>

          {activity.status === 'cancelled' && (
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800">
              Esta atividade foi cancelada
            </span>
          )}
        </div>

        {/* Message / Feedback Alert */}
        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="p-1 font-bold">✕</button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="p-1 font-bold">✕</button>
          </div>
        )}

        {/* Hero Visual Card */}
        <div className="relative rounded-[32px] overflow-hidden border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-bg-card shadow-sm mb-8">
          <div className="relative h-64 md:h-80 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {activity.image_url && (
              <img
                src={activity.image_url}
                alt={activity.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>

            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {category && (
                <span className="bg-[#1f2937]/80 backdrop-blur-xs text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
                  {category.name}
                </span>
              )}
              <span className={`text-xs font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm ${getDurationColor(category?.name)}`}>
                Presencial
              </span>
            </div>

            {/* Title Over Hero (Desktop & Mobile) */}
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/25 p-4 text-white shadow-lg backdrop-blur-sm md:bottom-6 md:left-6 md:right-6 md:p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-400">
                {activity.location_name}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-4xl">
                {activity.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Main 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details & Description (2 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Description Card */}
            <section className="bg-white dark:bg-bg-card rounded-[28px] border border-gray-200/80 dark:border-gray-800/80 p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#b81d24]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Sobre a Oficina
              </h2>
              <div className="text-text-secondary text-sm md:text-base leading-relaxed whitespace-pre-line">
                {activity.description || 'Nenhuma descrição adicional foi informada pelo organizador.'}
              </div>
            </section>

            {/* Date, Time & Schedule Card */}
            <section className="bg-white dark:bg-bg-card rounded-[28px] border border-gray-200/80 dark:border-gray-800/80 p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#2b4c7e]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Data e Horário
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-1">Data do Encontro</span>
                  <span className="text-base font-bold text-text-primary">{activity.date}</span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-1">Horário</span>
                  <span className="text-base font-bold text-text-primary">
                    {activity.start_time}{activity.end_time ? ` até ${activity.end_time}` : ''}
                  </span>
                </div>
              </div>
            </section>

            {/* Location Card */}
            <section className="bg-white dark:bg-bg-card rounded-[28px] border border-gray-200/80 dark:border-gray-800/80 p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Localização Presencial
              </h2>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 mb-4">
                <p className="text-base font-bold text-text-primary">{activity.location_name}</p>
                <p className="text-sm text-text-secondary mt-0.5">{activity.address}</p>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.location_name}, ${activity.address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-[#2b4c7e] hover:underline"
              >
                <span>Abrir no Google Maps</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </section>

            {/* Host Profile Card */}
            <section className="bg-white dark:bg-bg-card rounded-[28px] border border-gray-200/80 dark:border-gray-800/80 p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-text-primary mb-4">Organizador da Oficina</h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#2b4c7e] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {(creator?.name || 'OR').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-text-primary">{creator?.name || 'Organizador'}</h3>
                  <p className="text-xs text-text-secondary">{creator?.bio || 'Membro da comunidade Atmô'}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Checkout & Actions Card (1 col) */}
          <div className="flex flex-col gap-6">
            <div className="sticky top-24 bg-white dark:bg-bg-card rounded-[32px] border border-gray-200/80 dark:border-gray-800/80 p-6 md:p-8 shadow-md">
              {/* Price */}
              <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-1">
                  Investimento por participante
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-4xl font-extrabold text-text-primary">
                    {Number(activity.price) === 0 ? 'Gratuita' : `R$ ${Number(activity.price).toFixed(2)}`}
                  </span>
                  {Number(activity.price) > 0 && <span className="text-xs text-text-secondary font-medium">/ pessoa</span>}
                </div>
              </div>

              {/* Spots & Progress */}
              <div className="mb-6">
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <span className="text-text-secondary">Vagas preenchidas</span>
                  <span className="text-text-primary font-bold">
                    {participantCount} / {activity.max_participants}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-[#b81d24] h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentFilled}%` }}
                  ></div>
                </div>
                <p className="text-xs font-bold text-text-secondary">
                  {availableSpots > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">{availableSpots} vagas restantes</span>
                  ) : (
                    <span className="text-red-500">Oficina esgotada</span>
                  )}
                </p>
              </div>

              {/* Action Buttons based on User Role */}
              <div className="flex flex-col gap-3">
                {isCreator ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-3">
                      Você é o organizador desta atividade.
                    </p>

                    <div className="flex flex-col gap-2">
                      {(activity.status === 'pending' || activity.status === 'rejected') && (
                        <Link
                          href={`/atividades/${activity.id}/editar`}
                          className="w-full py-3 bg-[#2b4c7e] hover:bg-[#1f3a63] text-white font-bold text-sm rounded-xl text-center shadow-xs transition-colors"
                        >
                          ✎ Editar Atividade
                        </Link>
                      )}

                      {activity.status !== 'cancelled' && activity.status !== 'finished' && (
                        <button
                          type="button"
                          onClick={handleCancelActivity}
                          disabled={joining}
                          className="w-full py-3 border border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 font-bold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {joining ? 'Cancelando...' : 'Cancelar Atividade'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : isParticipant ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-3">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Sua inscrição está confirmada!</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={joining}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {joining ? 'Cancelando...' : 'Cancelar Minha Inscrição'}
                    </button>
                  </div>
                ) : availableSpots > 0 && activity.status === 'approved' ? (
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full py-4 bg-[#b81d24] hover:bg-[#a0181d] text-white font-black text-base rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {joining ? (
                      'Confirmando vaga...'
                    ) : (
                      <>
                        <span>Garantir Minha Vaga</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold text-sm rounded-2xl cursor-not-allowed text-center"
                  >
                    {activity.status === 'cancelled' ? 'Atividade Cancelada' : 'Atividade Lotada'}
                  </button>
                )}
              </div>

              {/* Small Guarantee / Policy Note */}
              <p className="text-[11px] text-text-secondary text-center mt-4">
                Presença e compromisso com o pequeno grupo da oficina são essenciais no Atmô.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}