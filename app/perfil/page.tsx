'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AppSidebar from '@/app/components/AppSidebar'

type Profile = {
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
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('name, avatar_url, bio, can_create_activity')
                .eq('id', user.id)
                .single()

            if (profileError) {
                setError(profileError.message)
            } else {
                setProfile(data)
            }
            setLoading(false)
        }

        loadProfile()
    }, [router])

    if (loading) {
        return <main className="flex min-h-screen items-center justify-center bg-[#faf9f5] text-text-secondary dark:bg-[#0f0f10]">Carregando perfil...</main>
    }

    return (
        <div className="min-h-screen bg-[#faf9f5] dark:bg-[#0f0f10] md:flex">
            <AppSidebar />
            <main className="flex-1 p-6 pb-24 md:p-10">
                <div className="mx-auto max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b81d24]">Conta</p>
                    <h1 className="mt-2 text-3xl font-extrabold text-text-primary">Meu perfil</h1>
                    {error ? <p className="mt-6 text-red-600">Erro ao carregar perfil: {error}</p> : profile && (
                        <section className="mt-8 rounded-[28px] border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-bg-card md:p-8">
                            <div className="flex items-center gap-4 border-b border-gray-100 pb-6 dark:border-gray-800">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2b4c7e] text-xl font-bold text-white">{(profile.name || 'US').slice(0, 2).toUpperCase()}</div>
                                <div><h2 className="text-xl font-bold text-text-primary">{profile.name || 'Usuário'}</h2><p className="text-sm text-text-secondary">Informações da sua conta</p></div>
                            </div>
                            <dl className="mt-6 grid gap-6 md:grid-cols-2">
                                <div><dt className="text-xs font-bold uppercase tracking-wider text-text-secondary">Nome</dt><dd className="mt-1 text-text-primary">{profile.name}</dd></div>
                                <div><dt className="text-xs font-bold uppercase tracking-wider text-text-secondary">Pode criar atividade</dt><dd className="mt-1 text-text-primary">{profile.can_create_activity ? 'Sim' : 'Não'}</dd></div>
                            </dl>
                            <div className="mt-6"><dt className="text-xs font-bold uppercase tracking-wider text-text-secondary">Biografia</dt><dd className="mt-1 text-text-primary">{profile.bio || 'Nenhuma biografia cadastrada.'}</dd></div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    )
}
