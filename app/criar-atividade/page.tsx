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
    const [address, setAddress] = useState('')
    const [price, setPrice] = useState('0')
    const [maxParticipants, setMaxParticipants] = useState('')

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

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setLoading(true)
        setMessage('')
        setError('')

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            setError('Você precisa estar logado para criar uma atividade.')
            setLoading(false)
            return
        }

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
                address,
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
        setAddress('')
        setPrice('0')
        setMaxParticipants('')
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
                        <label htmlFor="address">Endereço</label>
                        <input
                            id="address"
                            type="text"
                            value={address}
                            onChange={(event) => setAddress(event.target.value)}
                            required
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