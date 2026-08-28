'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import AppSidebar from '@/app/components/AppSidebar'

type Category = {
  id: number
  name: string
}

type Activity = {
  id: number
  creator_id: string
  category_id: number
  title: string
  description: string | null
  date: string
  start_time: string
  end_time: string | null
  location_name: string
  address: string
  latitude: number | null
  longitude: number | null
  price: number
  max_participants: number
  status: string
}

export default function EditarAtividadePage() {
  const params = useParams()
  const router = useRouter()

  const activityId = Number(params.id)

  const [activity, setActivity] = useState<Activity | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [locationName, setLocationName] = useState('')

  const [cep, setCep] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const [price, setPrice] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')

  const [loadingCep, setLoadingCep] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function extractCep(address: string) {
    const match = address.match(/\b\d{5}-?\d{3}\b/)
    return match ? match[0] : ''
  }

  function extractAddressNumber(address: string) {
    const match = address.match(/,\s*(\d+[A-Za-z]?)(?:,|$)/)
    return match ? match[1] : ''
  }

  async function loadAddressFromCep(cepValue: string) {
    const cleanCep = cepValue.replace(/\D/g, '')

    if (cleanCep.length !== 8) return

    try {
      setLoadingCep(true)
      setError('')

      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      if (!response.ok) throw new Error('Erro ao consultar o CEP.')

      const data = await response.json()
      if (data.erro) throw new Error('CEP não encontrado.')

      if (data.localidade !== 'Itajaí' || data.uf !== 'SC') {
        throw new Error('O endereço deve estar em Itajaí - SC.')
      }

      setStreet(data.logradouro || '')
      setNeighborhood(data.bairro || '')
      setCity(data.localidade || '')
      setState(data.uf || '')
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Não foi possível consultar o CEP.')
    } finally {
      setLoadingCep(false)
    }
  }

  async function handleCepBlur() {
    await loadAddressFromCep(cep)
  }

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single()

      if (activityError) {
        setError(activityError.message)
        setLoading(false)
        return
      }

      if (activityData.creator_id !== user.id) {
        setError('Você não tem permissão para editar esta atividade.')
        setLoading(false)
        return
      }

      if (activityData.status !== 'pending' && activityData.status !== 'rejected') {
        setError('Esta atividade já foi aprovada ou cancelada e não pode mais ser editada.')
        setLoading(false)
        return
      }

      setActivity(activityData)

      setTitle(activityData.title)
      setDescription(activityData.description ?? '')
      setCategoryId(String(activityData.category_id))
      setDate(activityData.date)
      setStartTime(activityData.start_time)
      setEndTime(activityData.end_time ?? '')
      setLocationName(activityData.location_name)

      const existingCep = extractCep(activityData.address)
      const existingNumber = extractAddressNumber(activityData.address)

      setCep(existingCep)
      setNumber(existingNumber)

      if (existingCep) {
        await loadAddressFromCep(existingCep)
      }

      setPrice(String(activityData.price))
      setMaxParticipants(String(activityData.max_participants))

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

      if (categoriesError) {
        setError(categoriesError.message)
        setLoading(false)
        return
      }

      setCategories(categoriesData ?? [])
      setLoading(false)
    }

    loadData()
  }, [activityId, router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activity) return

    setSaving(true)
    setMessage('')
    setError('')

    if (!title.trim()) {
      setError('Informe o título da atividade.')
      setSaving(false)
      return
    }

    if (!categoryId) {
      setError('Selecione uma categoria.')
      setSaving(false)
      return
    }

    if (!date) {
      setError('Informe a data.')
      setSaving(false)
      return
    }

    if (!startTime) {
      setError('Informe o horário de início.')
      setSaving(false)
      return
    }

    if (endTime && endTime <= startTime) {
      setError('O horário de término deve ser depois do horário de início.')
      setSaving(false)
      return
    }

    if (!locationName.trim()) {
      setError('Informe o nome do local.')
      setSaving(false)
      return
    }

    if (!cep.trim() || !street.trim() || !number.trim() || !neighborhood.trim()) {
      setError('Preencha o CEP e o número do local.')
      setSaving(false)
      return
    }

    if (!city || !state || city !== 'Itajaí' || state !== 'SC') {
      setError('O endereço deve estar em Itajaí - SC.')
      setSaving(false)
      return
    }

    if (!maxParticipants || Number(maxParticipants) <= 0) {
      setError('O número de participantes deve ser maior que zero.')
      setSaving(false)
      return
    }

    if (Number(price) < 0) {
      setError('O preço não pode ser negativo.')
      setSaving(false)
      return
    }

    const formattedAddress = [
      `${street}, ${number}`,
      neighborhood,
      `${city} - ${state}`,
      cep,
    ].filter(Boolean).join(', ')

    // Geocoding
    const geocodeResponse = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        street,
        number,
        neighborhood,
        city,
        state,
        postalCode: cep.replace(/\D/g, ''),
      }),
    })

    const geocodeData = await geocodeResponse.json()

    if (!geocodeResponse.ok) {
      setError(geocodeData.error || 'Não foi possível localizar o endereço.')
      setSaving(false)
      return
    }

    const { latitude, longitude } = geocodeData

    const { error: updateError } = await supabase
      .from('activities')
      .update({
        category_id: Number(categoryId),
        title: title.trim(),
        description: description.trim() || null,
        date,
        start_time: startTime,
        end_time: endTime || null,
        location_name: locationName.trim(),
        address: formattedAddress,
        latitude,
        longitude,
        price: Number(price),
        max_participants: Number(maxParticipants),
      })
      .eq('id', activity.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setMessage('Atividade atualizada com sucesso.')
    setSaving(false)

    setTimeout(() => {
      router.push(`/atividades/${activity.id}`)
      router.refresh()
    }, 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex">
        <AppSidebar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#b81d24] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary font-medium">Carregando dados da oficina...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error && !activity) {
    return (
      <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex">
        <AppSidebar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-white dark:bg-bg-card p-8 rounded-[28px] border border-gray-200 dark:border-gray-800 shadow-sm">
            <h1 className="text-2xl font-extrabold text-text-primary mb-2">Não foi possível editar</h1>
            <p className="text-text-secondary text-sm mb-6">{error}</p>
            <Link
              href="/minhas-atividades"
              className="px-6 py-3 bg-[#b81d24] text-white font-bold rounded-xl text-sm shadow-sm inline-block"
            >
              Voltar para Minhas Atividades
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex font-sans antialiased text-text-primary transition-colors duration-200 select-none">
      <AppSidebar />

      <main className="flex-1 p-6 pb-24 md:p-10 max-w-4xl w-full mx-auto overflow-x-hidden">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            href={`/atividades/${activityId}`}
            className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-text-secondary hover:text-text-primary mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para a oficina
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b81d24]">Gerenciar Oficina</p>
          <h1 className="mt-1 text-3xl font-extrabold text-text-primary">Editar Atividade</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Altere as informações da sua oficina antes da aprovação final.
          </p>
        </div>

        {/* Form Container Card */}
        <section className="rounded-[28px] border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-bg-card p-6 md:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="activity-form">
            <div>
              <label htmlFor="title">Título da oficina</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="description">Descrição detalhada</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="category">Categoria</label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date">Data da atividade</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="startTime">Horário de início</label>
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="endTime">Horário de término</label>
              <input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="locationName">Nome do local</label>
              <input
                id="locationName"
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="cep">CEP</label>
              <input
                id="cep"
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                required
              />
              {loadingCep && <p className="text-xs text-text-secondary mt-1">Consultando CEP...</p>}
            </div>

            <div>
              <label htmlFor="street">Rua / Logradouro</label>
              <input id="street" type="text" value={street} readOnly required className="bg-gray-100 dark:bg-gray-800" />
            </div>

            <div>
              <label htmlFor="number">Número</label>
              <input
                id="number"
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ex: 123"
                required
              />
            </div>

            <div>
              <label htmlFor="neighborhood">Bairro</label>
              <input id="neighborhood" type="text" value={neighborhood} readOnly required className="bg-gray-100 dark:bg-gray-800" />
            </div>

            <div>
              <label htmlFor="city">Cidade</label>
              <input id="city" type="text" value={city} readOnly required className="bg-gray-100 dark:bg-gray-800" />
            </div>

            <div>
              <label htmlFor="state">Estado</label>
              <input id="state" type="text" value={state} readOnly required className="bg-gray-100 dark:bg-gray-800" />
            </div>

            <div>
              <label htmlFor="price">Preço (R$)</label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="maxParticipants">Máximo de participantes</label>
              <input
                id="maxParticipants"
                type="number"
                min="1"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                required
              />
            </div>

            {/* Actions */}
            <div className="activity-form-actions pt-4">
              <button
                type="button"
                onClick={() => router.push(`/atividades/${activityId}`)}
                className="activity-secondary-button cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Salvando alterações...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>

          {message && <p className="mt-5 rounded-2xl bg-green-50 dark:bg-green-950/40 p-4 text-sm font-semibold text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">{message}</p>}
          {error && <p className="mt-5 rounded-2xl bg-red-50 dark:bg-red-950/40 p-4 text-sm font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">{error}</p>}
        </section>
      </main>
    </div>
  )
}