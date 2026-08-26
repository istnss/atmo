'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Activity = {
    id: number
    title: string
    date: string
    start_time: string
    location_name: string
    max_participants: number
    status: string
}

export default function MinhasAtividadesPage() {
    const router = useRouter()

    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadActivities() {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            const { data, error: activitiesError } = await supabase
                .from('activities')
                .select(`
          id,
          title,
          date,
          start_time,
          location_name,
          max_participants,
          status
        `)
                .eq('creator_id', user.id)
                .order('date', { ascending: true })

            if (activitiesError) {
                setError(activitiesError.message)
                setLoading(false)
                return
            }

            setActivities(data ?? [])
            setLoading(false)
        }

        loadActivities()
    }, [router])

    if (loading) {
        return (
            <main>
                <p>Carregando...</p>
            </main>
        )
    }

    return (
        <main>
            <h1>Minhas atividades</h1>

            {error && <p>{error}</p>}

            {!error && activities.length === 0 && (
                <div>
                    <p>Você ainda não criou nenhuma atividade.</p>

                    <button
                        type="button"
                        onClick={() => router.push('/criar-atividade')}
                    >
                        Criar atividade
                    </button>
                </div>
            )}

            {activities.length > 0 && (
                <section>
                    {activities.map((activity) => (
                        <article key={activity.id}>
                            <h2>{activity.title}</h2>

                            <p>Status: {activity.status}</p>

                            <p>
                                Data: {activity.date}
                            </p>

                            <p>
                                Horário: {activity.start_time}
                            </p>

                            <p>
                                Local: {activity.location_name}
                            </p>

                            <p>
                                Limite: {activity.max_participants} participantes
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    router.push(`/atividades/${activity.id}`)
                                }
                            >
                                Ver atividade
                            </button>
                        </article>
                    ))}
                </section>
            )}
        </main>
    )
}