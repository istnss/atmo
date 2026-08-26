'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

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
    const [address, setAddress] = useState('')
    const [price, setPrice] = useState('')
    const [maxParticipants, setMaxParticipants] = useState('')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadData() {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            const { data: activityData, error: activityError } =
                await supabase
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
                setError('Você não pode editar esta atividade.')
                setLoading(false)
                return
            }

            if (
                activityData.status !== 'pending' &&
                activityData.status !== 'rejected'
            ) {
                setError(
                    'Esta atividade não pode mais ser editada.'
                )
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
            setAddress(activityData.address)
            setPrice(String(activityData.price))
            setMaxParticipants(
                String(activityData.max_participants)
            )

            const { data: categoriesData, error: categoriesError } =
                await supabase
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

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (!activity) {
            return
        }

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
            setError(
                'O horário de término deve ser depois do horário de início.'
            )
            setSaving(false)
            return
        }

        if (!locationName.trim()) {
            setError('Informe o local.')
            setSaving(false)
            return
        }

        if (!address.trim()) {
            setError('Informe o endereço.')
            setSaving(false)
            return
        }

        if (
            !maxParticipants ||
            Number(maxParticipants) <= 0
        ) {
            setError(
                'O número de participantes deve ser maior que zero.'
            )
            setSaving(false)
            return
        }

        if (Number(price) < 0) {
            setError('O preço não pode ser negativo.')
            setSaving(false)
            return
        }

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
                address: address.trim(),
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

        router.push(`/atividades/${activity.id}`)
        router.refresh()
    }

    if (loading) {
        return (
            <main>
                <p>Carregando...</p>
            </main>
        )
    }

    if (error && !activity) {
        return (
            <main>
                <p>{error}</p>

                <button
                    type="button"
                    onClick={() => router.back()}
                >
                    Voltar
                </button>
            </main>
        )
    }

    return (
        <main>
            <h1>Editar atividade</h1>

            {error && <p>{error}</p>}
            {message && <p>{message}</p>}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="title">
                        Título
                    </label>

                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(event) =>
                            setTitle(event.target.value)
                        }
                        required
                    />
                </div>

                <div>
                    <label htmlFor="description">
                        Descrição
                    </label>

                    <textarea
                        id="description"
                        value={description}
                        onChange={(event) =>
                            setDescription(event.target.value)
                        }
                    />
                </div>

                <div>
                    <label htmlFor="category">
                        Categoria
                    </label>

                    <select
                        id="category"
                        value={categoryId}
                        onChange={(event) =>
                            setCategoryId(event.target.value)
                        }
                        required
                    >
                        <option value="">
                            Selecione uma categoria
                        </option>

                        {categories.map((category) => (
                            <option
                                key={category.id}
                                value={category.id}
                            >
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="date">
                        Data
                    </label>

                    <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(event) =>
                            setDate(event.target.value)
                        }
                        required
                    />
                </div>

                <div>
                    <label htmlFor="startTime">
                        Horário de início
                    </label>

                    <input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(event) =>
                            setStartTime(event.target.value)
                        }
                        required
                    />
                </div>

                <div>
                    <label htmlFor="endTime">
                        Horário de término
                    </label>

                    <input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(event) =>
                            setEndTime(event.target.value)
                        }
                    />
                </div>

                <div>
                    <label htmlFor="locationName">
                        Nome do local
                    </label>

                    <input
                        id="locationName"
                        type="text"
                        value={locationName}
                        onChange={(event) =>
                            setLocationName(event.target.value)
                        }
                        required
                    />
                </div>

                <div>
                    <label htmlFor="address">
                        Endereço
                    </label>

                    <input
                        id="address"
                        type="text"
                        value={address}
                        onChange={(event) =>
                            setAddress(event.target.value)
                        }
                        required
                    />
                </div>

                <div>
                    <label htmlFor="price">
                        Preço
                    </label>

                    <input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(event) =>
                            setPrice(event.target.value)
                        }
                        required
                    />
                </div>

                <div>
                    <label htmlFor="maxParticipants">
                        Máximo de participantes
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

                <button
                    type="submit"
                    disabled={saving}
                >
                    {saving
                        ? 'Salvando...'
                        : 'Salvar alterações'}
                </button>

                <button
                    type="button"
                    onClick={() =>
                        router.push(`/atividades/${activityId}`)
                    }
                >
                    Cancelar
                </button>
            </form>
        </main>
    )
}