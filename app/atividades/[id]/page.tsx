'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

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
}

type Category = {
    id: number
    name: string
}

type Profile = {
    id: string
    name: string | null
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

            const { data: activityData, error: activityError } =
                await supabase
                    .from('activities')
                    .select('*')
                    .eq('id', activityId)
                    .eq('status', 'approved')
                    .single()

            if (activityError || !activityData) {
                setError('Atividade não encontrada.')
                setLoading(false)
                return
            }

            setActivity(activityData)

            const { data: categoryData } = await supabase
                .from('categories')
                .select('id, name')
                .eq('id', activityData.category_id)
                .single()

            setCategory(categoryData)

            const { data: creatorData } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('id', activityData.creator_id)
                .single()

            setCreator(creatorData)

            const { count } = await supabase
                .from('activity_participants')
                .select('id', {
                    count: 'exact',
                    head: true,
                })
                .eq('activity_id', activityId)
                .eq('status', 'confirmed')

            setParticipantCount(count ?? 0)

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

            setLoading(false)
        }

        loadActivity()
    }, [params.id])

    async function handleJoin() {
        if (!activity) {
            return
        }

        setJoining(true)
        setMessage('')
        setError('')

        const { error: joinError } = await supabase.rpc(
            'join_activity',
            {
                p_activity_id: activity.id,
            }
        )

        if (joinError) {
            setError(joinError.message)
            setJoining(false)
            return
        }

        setParticipantCount((count) => count + 1)
        setIsParticipant(true)
        setJoining(false)
    }

    async function handleCancel() {
        if (!activity) {
            return
        }

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

        setParticipantCount((count) =>
            Math.max(0, count - 1)
        )

        setIsParticipant(false)
        setMessage('Sua participação foi cancelada.')
        setJoining(false)
    }

    if (loading) {
        return (
            <main>
                <p>Carregando...</p>
            </main>
        )
    }

    if (!activity) {
        return (
            <main>
                <h1>Atividade</h1>

                <p>{error}</p>

                <button
                    type="button"
                    onClick={() => router.push('/atividades')}
                >
                    Voltar
                </button>
            </main>
        )
    }

    const availableSpots =
        activity.max_participants - participantCount

    return (
        <main>
            <button
                type="button"
                onClick={() => router.push('/atividades')}
            >
                Voltar
            </button>

            <h1>{activity.title}</h1>

            {category && (
                <p>Categoria: {category.name}</p>
            )}

            {activity.description && (
                <section>
                    <h2>Descrição</h2>
                    <p>{activity.description}</p>
                </section>
            )}

            <section>
                <h2>Data e horário</h2>

                <p>Data: {activity.date}</p>

                <p>
                    {activity.start_time}

                    {activity.end_time
                        ? ` - ${activity.end_time}`
                        : ''}
                </p>
            </section>

            <section>
                <h2>Local</h2>

                <p>{activity.location_name}</p>
                <p>{activity.address}</p>
            </section>

            <section>
                <h2>Participação</h2>

                <p>
                    {Number(activity.price) === 0
                        ? 'Gratuita'
                        : `R$ ${Number(activity.price).toFixed(2)}`}
                </p>

                <p>
                    Participantes: {participantCount} /{' '}
                    {activity.max_participants}
                </p>

                <p>
                    Vagas disponíveis: {availableSpots}
                </p>

                {isCreator && (
                    <p>
                        Você é o organizador desta atividade.
                    </p>
                )}

                {!isCreator && isParticipant && (
                    <div>
                        <p>Você está inscrito nesta atividade.</p>

                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={joining}
                        >
                            {joining
                                ? 'Cancelando...'
                                : 'Cancelar participação'}
                        </button>
                    </div>
                )}

                {!isCreator &&
                    !isParticipant &&
                    availableSpots > 0 && (
                        <button
                            type="button"
                            onClick={handleJoin}
                            disabled={joining}
                        >
                            {joining
                                ? 'Participando...'
                                : 'Participar'}
                        </button>
                    )}

                {!isCreator &&
                    !isParticipant &&
                    availableSpots <= 0 && (
                        <p>Esta atividade está lotada.</p>
                    )}

                {message && <p>{message}</p>}

                {error && <p>{error}</p>}
            </section>

            <section>
                <h2>Organizador</h2>
                <p>
                    {creator?.name || 'Organizador'}
                </p>
            </section>
        </main>
    )
}