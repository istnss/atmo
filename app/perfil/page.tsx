'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth'

type Profile = {
    id: string
    name: string | null
    avatar_url: string | null
    bio: string | null
    can_create_activity: boolean
}

export default function PerfilPage() {
    const router = useRouter()

    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadProfile() {
            const user = await getCurrentUser()

            if (!user) {
                router.push('/login')
                return
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, avatar_url, bio, can_create_activity')
                .eq('id', user.id)
                .single()

            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }

            setProfile(data)
            setLoading(false)
        }

        loadProfile()
    }, [router])

    if (loading) {
        return <main>Carregando perfil...</main>
    }

    if (error) {
        return (
            <main>
                <h1>Meu perfil</h1>
                <p>Erro ao carregar perfil: {error}</p>
            </main>
        )
    }

    return (
        <main>
            <h1>Meu perfil</h1>

            {profile && (
                <>
                    <p>
                        <strong>Nome:</strong> {profile.name}
                    </p>

                    <p>
                        <strong>Biografia:</strong>{' '}
                        {profile.bio || 'Nenhuma biografia cadastrada.'}
                    </p>

                    <p>
                        <strong>Pode criar atividade:</strong>{' '}
                        {profile.can_create_activity ? 'Sim' : 'Não'}
                    </p>
                </>
            )}
        </main>
    )
}