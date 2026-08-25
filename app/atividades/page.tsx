'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
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
}

export default function AtividadesPage() {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadActivities() {
            const { data, error } = await supabase
                .from('activities')
                .select(`
          id,
          title,
          description,
          date,
          start_time,
          end_time,
          location_name,
          address,
          price,
          max_participants
        `)
                .eq('status', 'approved')
                .order('date', { ascending: true })

            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }

            setActivities(data ?? [])
            setLoading(false)
        }

        loadActivities()
    }, [])

    if (loading) {
        return (
            <main>
                <h1>Atividades</h1>
                <p>Carregando atividades...</p>
            </main>
        )
    }

    if (error) {
        return (
            <main>
                <h1>Atividades</h1>
                <p>Erro ao carregar atividades: {error}</p>
            </main>
        )
    }

    return (
        <main>
            <h1>Atividades</h1>

            {activities.length === 0 ? (
                <p>Nenhuma atividade encontrada.</p>
            ) : (
                <ul>
                    {activities.map((activity) => (
                        <li key={activity.id}>
                            <h2>{activity.title}</h2>

                            {activity.description && (
                                <p>{activity.description}</p>
                            )}

                            <p>
                                Data: {activity.date}
                            </p>

                            <p>
                                Horário: {activity.start_time}
                                {activity.end_time
                                    ? ` - ${activity.end_time}`
                                    : ''}
                            </p>

                            <p>
                                Local: {activity.location_name}
                            </p>

                            <p>
                                Endereço: {activity.address}
                            </p>

                            <p>
                                Preço:{' '}
                                {Number(activity.price) === 0
                                    ? 'Gratuita'
                                    : `R$ ${Number(activity.price).toFixed(2)}`}
                            </p>

                            <p>
                                Vagas: {activity.max_participants}
                            </p>

                            <Link href={`/atividades/${activity.id}`}>
                                Ver detalhes
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    )
}