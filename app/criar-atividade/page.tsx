'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AppSidebar from '@/app/components/AppSidebar'

type Category = { id: number; name: string }

type AddressData = {
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
    erro?: boolean
}

export default function CriarAtividadePage() {
    const router = useRouter()
    const [categories, setCategories] = useState<Category[]>([])
    const [step, setStep] = useState(1)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [locationName, setLocationName] = useState('')
    const [price, setPrice] = useState('0')
    const [maxParticipants, setMaxParticipants] = useState('')
    const [cep, setCep] = useState('')
    const [street, setStreet] = useState('')
    const [number, setNumber] = useState('')
    const [neighborhood, setNeighborhood] = useState('')
    const [city, setCity] = useState('')
    const [state, setState] = useState('')
    const [loadingCategories, setLoadingCategories] = useState(true)
    const [loadingCep, setLoadingCep] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadCategories() {
            const { data, error: categoriesError } = await supabase
                .from('categories')
                .select('id, name')
                .order('name', { ascending: true })
            if (categoriesError) setError(categoriesError.message)
            setCategories(data ?? [])
            setLoadingCategories(false)
        }
        loadCategories()
    }, [])

    async function handleCepBlur() {
        const cleanCep = cep.replace(/\D/g, '')
        if (cleanCep.length !== 8) return

        try {
            setLoadingCep(true)
            setError('')
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
            if (!response.ok) throw new Error('Erro ao consultar o CEP.')
            const data: AddressData = await response.json()
            if (data.erro) throw new Error('CEP não encontrado.')
            if (data.localidade !== 'Itajaí' || data.uf !== 'SC') {
                setStreet('')
                setNeighborhood('')
                setCity('')
                setState('')
                throw new Error('No momento, o Atmô está disponível apenas em Itajaí - SC.')
            }
            setStreet(data.logradouro ?? '')
            setNeighborhood(data.bairro ?? '')
            setCity(data.localidade ?? '')
            setState(data.uf ?? '')
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível consultar o CEP.')
        } finally {
            setLoadingCep(false)
        }
    }

    function handleNextStep() {
        if (!title.trim() || !description.trim() || !categoryId || !date || !startTime || !locationName || !maxParticipants) {
            setError('Preencha todos os campos da primeira etapa.')
            return
        }
        if (endTime && endTime <= startTime) {
            setError('O horário de término deve ser depois do horário de início.')
            return
        }
        setError('')
        setStep(2)
    }

    async function handleSubmit(event: { preventDefault: () => void }) {
        event.preventDefault()
        setLoading(true)
        setMessage('')
        setError('')

        if (!cep.trim() || !street.trim() || !number.trim() || !neighborhood.trim()) {
            setError('Preencha o CEP e o número do local.')
            setLoading(false)
            return
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            setError('Você precisa estar logado para criar uma atividade.')
            setLoading(false)
            return
        }

        const formattedAddress = [`${street}, ${number}`, neighborhood, `${city} - ${state}`, cep].filter(Boolean).join(', ')
        const geocodeResponse = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ street, number, neighborhood, city, state, postalCode: cep.replace(/\D/g, '') }),
        })
        const geocodeData = await geocodeResponse.json()
        if (!geocodeResponse.ok) {
            setError(geocodeData.error || 'Não foi possível localizar o endereço.')
            setLoading(false)
            return
        }

        const { error: insertError } = await supabase.from('activities').insert({
            creator_id: user.id,
            category_id: Number(categoryId),
            title,
            description: description || null,
            date,
            start_time: startTime,
            end_time: endTime || null,
            location_name: locationName,
            address: formattedAddress,
            latitude: geocodeData.latitude,
            longitude: geocodeData.longitude,
            price: Number(price),
            max_participants: Number(maxParticipants),
        })

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
            return
        }

        setMessage('Atividade criada com sucesso e enviada para aprovação.')
        setLoading(false)
        setStep(1)
        setTitle('')
        setDescription('')
        setCategoryId('')
        setDate('')
        setStartTime('')
        setEndTime('')
        setLocationName('')
        setPrice('0')
        setMaxParticipants('')
        setCep('')
        setStreet('')
        setNumber('')
        setNeighborhood('')
        setCity('')
        setState('')
    }

    return (
        <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex">
            <AppSidebar />
            <main className="flex-1 p-6 pb-24 md:p-10">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-8">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b81d24]">Nova experiência</p>
                        <h1 className="mt-2 text-3xl font-extrabold text-text-primary">Criar atividade</h1>
                        <p className="mt-2">Preencha as informações para compartilhar uma nova oficina.</p>
                    </div>
                    <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-bg-card md:p-8">
                        <div className="mb-8 flex items-center gap-3">
                            {[1, 2].map((stepNumber) => <div key={stepNumber} className="flex flex-1 items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step >= stepNumber ? 'bg-[#b81d24] text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>{stepNumber}</div><span className={`text-sm font-semibold ${step >= stepNumber ? 'text-text-primary' : 'text-text-secondary'}`}>{stepNumber === 1 ? 'Sobre a oficina' : 'Endereço'}</span>{stepNumber === 1 && <div className={`h-px flex-1 ${step === 2 ? 'bg-[#b81d24]' : 'bg-gray-200 dark:bg-gray-700'}`} />}</div>)}
                        </div>
                        {loadingCategories ? <p>Carregando categorias...</p> : <form onSubmit={handleSubmit} className="activity-form">
                            {step === 1 ? <>
                                <div><label htmlFor="title">Título</label><input id="title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} required /></div>
                                <div><label htmlFor="description">Descrição</label><textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} required /></div>
                                <div><label htmlFor="category">Categoria</label><select id="category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required><option value="">Selecione uma categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
                                <div><label htmlFor="date">Data</label><input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div>
                                <div><label htmlFor="startTime">Horário inicial</label><input id="startTime" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required /></div>
                                <div><label htmlFor="endTime">Horário final</label><input id="endTime" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></div>
                                <div><label htmlFor="locationName">Nome do local</label><input id="locationName" type="text" value={locationName} onChange={(event) => setLocationName(event.target.value)} required /></div>
                                <div><label htmlFor="price">Preço</label><input id="price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></div>
                                <div><label htmlFor="maxParticipants">Número máximo de participantes</label><input id="maxParticipants" type="number" min="1" value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value)} required /></div>
                                <button type="button" onClick={handleNextStep}>Continuar para o endereço</button>
                            </> : <>
                                <div><label htmlFor="cep">CEP</label><input id="cep" type="text" value={cep} onChange={(event) => setCep(event.target.value)} onBlur={handleCepBlur} placeholder="00000-000" required />{loadingCep && <p>Consultando CEP...</p>}</div>
                                <div><label htmlFor="street">Rua</label><input id="street" type="text" value={street} readOnly required /></div>
                                <div><label htmlFor="number">Número</label><input id="number" type="text" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="Número" required /></div>
                                <div><label htmlFor="neighborhood">Bairro</label><input id="neighborhood" type="text" value={neighborhood} readOnly required /></div>
                                <div><label htmlFor="city">Cidade</label><input id="city" type="text" value={city} readOnly required /></div>
                                <div><label htmlFor="state">Estado</label><input id="state" type="text" value={state} readOnly required /></div>
                                <div className="activity-form-actions"><button type="button" onClick={() => { setError(''); setStep(1) }} className="activity-secondary-button">Voltar</button><button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar atividade'}</button></div>
                            </>}
                        </form>}
                        {message && <p className="mt-5 rounded-xl bg-green-50 p-3 text-green-700">{message}</p>}
                        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
                    </section>
                </div>
            </main>
        </div>
    )
}
