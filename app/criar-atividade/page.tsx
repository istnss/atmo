'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Category = {
    id: number
    name: string
}

export default function CriarAtividadePage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loadingCategories, setLoadingCategories] = useState(true)

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
    const [loadingCep, setLoadingCep] = useState(false)

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadCategories() {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name')
                .order('name', { ascending: true })

            if (error) {
                setError(error.message)
            } else {
                setCategories(data ?? [])
            }

            setLoadingCategories(false)
        }

        loadCategories()
    }, [])

    async function handleCepBlur() {
    const cleanCep = cep.replace(/\D/g, '')

    if (cleanCep.length !== 8) {
        return
    }

    try {
        setLoadingCep(true)
        setError('')

        const response = await fetch(
            `https://viacep.com.br/ws/${cleanCep}/json/`
        )

        if (!response.ok) {
            throw new Error('Erro ao consultar o CEP.')
        }

        const data = await response.json()

        if (data.erro) {
            throw new Error('CEP não encontrado.')
        }

        if (
    data.localidade !== 'Itajaí' ||
    data.uf !== 'SC'
) {
    setStreet('')
    setNeighborhood('')
    setCity('')
    setState('')

    throw new Error(
        'No momento, o Atmô está disponível apenas em Itajaí - SC.'
    )
}

        setStreet(data.logradouro || '')
        setNeighborhood(data.bairro || '')
        setCity(data.localidade || '')
        setState(data.uf || '')

    } catch (error) {
        setError(
            error instanceof Error
                ? error.message
                : 'Não foi possível consultar o CEP.'
        )
    } finally {
        setLoadingCep(false)
    }
}
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setLoading(true)
        setMessage('')
        setError('')

        if (
            !cep.trim() ||
            !street.trim() ||
            !number.trim() ||
            !neighborhood.trim()
        ) {
            setError(
                'Preencha o CEP e o número do local.'
            )
            setLoading(false)
            return
        }

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            setError('Você precisa estar logado para criar uma atividade.')
            setLoading(false)
            return
        }

        const formattedAddress = [
    `${street}, ${number}`,
    neighborhood,
    `${city} - ${state}`,
    cep,
]
    .filter(Boolean)
    .join(', ')

    const geocodeResponse = await fetch('/api/geocode', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
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
    setError(
        geocodeData.error ||
            'Não foi possível localizar o endereço.'
    )
    setLoading(false)
    return
}

const {
    latitude,
    longitude,
} = geocodeData

        const { error: insertError } = await supabase
    .from('activities')
    .insert({
        creator_id: user.id,
        category_id: Number(categoryId),
        title,
        description: description || null,
        date,
        start_time: startTime,
        end_time: endTime || null,
        location_name: locationName,
        address: formattedAddress,
        latitude,
        longitude,
        price: Number(price),
        max_participants: Number(maxParticipants),
    })

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
            return
        }

        setMessage(
            'Atividade criada com sucesso e enviada para aprovação.'
        )

        setLoading(false)

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
        <main>
            <h1>Criar atividade</h1>

            {loadingCategories ? (
                <p>Carregando categorias...</p>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="title">Título</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="description">Descrição</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="category">Categoria</label>

                        <select
                            id="category"
                            value={categoryId}
                            onChange={(event) => setCategoryId(event.target.value)}
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
                        <label htmlFor="date">Data</label>
                        <input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="startTime">Horário inicial</label>
                        <input
                            id="startTime"
                            type="time"
                            value={startTime}
                            onChange={(event) => setStartTime(event.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="endTime">Horário final</label>
                        <input
                            id="endTime"
                            type="time"
                            value={endTime}
                            onChange={(event) => setEndTime(event.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="locationName">Nome do local</label>
                        <input
                            id="locationName"
                            type="text"
                            value={locationName}
                            onChange={(event) => setLocationName(event.target.value)}
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
                    />

                    {loadingCep && <p>Consultando CEP...</p>}
                    </div>

                    <div>
                            <label htmlFor="street">Rua</label>

                    <input
                        id="street"
                        type="text"
                        value={street}
                        readOnly
                    />
                    </div>

                    <div>
                    <label htmlFor="number">Número</label>

                    <input
                        id="number"
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Número"
                        required
                    />
                    </div>
                    <div>
                        <label htmlFor="neighborhood">Bairro</label>

                    <input
                        id="neighborhood"
                        type="text"
                        value={neighborhood}
                        readOnly
                    />
                    </div>
                    <div>
                        <label htmlFor="city">Cidade</label>

                    <input
                        id="city"
                        type="text"
                        value={city}
                        readOnly
                    />
                    </div>
                    <div>
                        <label htmlFor="state">Estado</label>

                    <input
                        id="state"
                        type="text"
                        value={state}
                        readOnly
                    />
                    </div>

                    <div>
                        <label htmlFor="price">Preço</label>
                        <input
                            id="price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={price}
                            onChange={(event) => setPrice(event.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="maxParticipants">
                            Número máximo de participantes
                        </label>

                        <input
                            id="maxParticipants"
                            type="number"
                            min="1"
                            value={maxParticipants}
                            onChange={(event) =>
                                setMaxParticipants(event.target.value)
                            }
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? 'Criando...' : 'Criar atividade'}
                    </button>
                </form>
            )}

            {message && <p>{message}</p>}

            {error && <p>{error}</p>}
        </main>
    )
}