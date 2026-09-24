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
    const [bio, setBio] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [message, setMessage] = useState('')
    const [saving, setSaving] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [removingAvatar, setRemovingAvatar] = useState(false)

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
                setBio(data.bio || '')
            }
            setLoading(false)
        }

        loadProfile()
    }, [router])

    async function handleSave(event: { preventDefault: () => void }) {
        event.preventDefault()
        setSaving(true)
        setMessage('')
        setError('')
        if (newPassword && newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.')
            setSaving(false)
            return
        }
        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.')
            setSaving(false)
            return
        }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError('Você precisa estar logado.')
            setSaving(false)
            return
        }

        let avatarUrl = profile?.avatar_url ?? null
        if (avatarFile) {
            const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
            const path = `${user.id}/avatar-${Date.now()}.${extension}`
            const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
            if (uploadError) {
                setError(uploadError.message)
                setSaving(false)
                return
            }
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
            avatarUrl = publicUrlData.publicUrl
        }

        const { error: profileError } = await supabase.from('profiles').update({ bio: bio.trim() || null, avatar_url: avatarUrl }).eq('id', user.id)
        if (profileError) {
            setError(profileError.message)
            setSaving(false)
            return
        }
        if (newPassword) {
            const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })
            if (passwordError) {
                setError(passwordError.message)
                setSaving(false)
                return
            }
        }
        setProfile((current) => current ? { ...current, bio: bio.trim() || null, avatar_url: avatarUrl } : current)
        setAvatarFile(null)
        setAvatarPreview(null)
        setNewPassword('')
        setConfirmPassword('')
        setMessage('Perfil atualizado com sucesso.')
        setSaving(false)
    }

    function handleAvatarChange(event: { target: { files: FileList | null } }) {
        const file = event.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setError('Selecione um arquivo de imagem.')
            return
        }
        setError('')
        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
    }

    async function handleRemoveAvatar() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setRemovingAvatar(true)
        const { error: removeError } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
        if (removeError) setError(removeError.message)
        else {
            setProfile((current) => current ? { ...current, avatar_url: null } : current)
            setAvatarFile(null)
            setAvatarPreview(null)
            setMessage('Foto removida com sucesso.')
        }
        setRemovingAvatar(false)
    }

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
                                {avatarPreview || profile.avatar_url ? <img src={avatarPreview || profile.avatar_url || ''} alt={profile.name || 'Foto do perfil'} className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2b4c7e] text-xl font-bold text-white">{(profile.name || 'US').slice(0, 2).toUpperCase()}</div>}
                                <div><h2 className="text-xl font-bold text-text-primary">{profile.name || 'Usuário'}</h2><p className="text-sm text-text-secondary">Informações da sua conta</p><div className="mt-2 flex flex-wrap gap-2"><label htmlFor="avatar" className="cursor-pointer rounded-lg bg-[#2b4c7e] px-3 py-1.5 text-xs font-bold text-white">Alterar foto</label><input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" /><button type="button" onClick={handleRemoveAvatar} disabled={removingAvatar || (!profile.avatar_url && !avatarFile)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-50">{removingAvatar ? 'Removendo...' : 'Remover foto'}</button></div></div>
                            </div>
                            <dl className="mt-6 grid gap-6 md:grid-cols-2">
                                <div><dt className="text-xs font-bold uppercase tracking-wider text-text-secondary">Nome</dt><dd className="mt-1 text-text-primary">{profile.name}</dd></div>
                                <div><dt className="text-xs font-bold uppercase tracking-wider text-text-secondary">Pode criar atividade</dt><dd className="mt-1 text-text-primary">{profile.can_create_activity ? 'Sim' : 'Não'}</dd></div>
                            </dl>
                            <form onSubmit={handleSave} className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
                                <label htmlFor="bio" className="text-xs font-bold uppercase tracking-wider text-text-secondary">Biografia</label>
                                <textarea id="bio" maxLength={200} value={bio} onChange={(event) => setBio(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-gray-200 bg-transparent p-3 text-sm text-text-primary dark:border-gray-700" />
                                <p className="mt-1 text-right text-xs text-text-secondary">{bio.length}/200</p>
                                <div className="mt-6 grid gap-4 md:grid-cols-2">
                                    <div><label htmlFor="newPassword" className="text-xs font-bold uppercase tracking-wider text-text-secondary">Nova senha</label><input id="newPassword" type="password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent p-3 text-sm text-text-primary dark:border-gray-700" /></div>
                                    <div><label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-text-secondary">Confirmar senha</label><input id="confirmPassword" type="password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repita sua senha" className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent p-3 text-sm text-text-primary dark:border-gray-700" /></div>
                                </div>
                                <button type="submit" disabled={saving} className="mt-6 rounded-xl bg-[#b81d24] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar alterações'}</button>
                                {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
                                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
                            </form>
                        </section>
                    )}
                </div>
            </main>
        </div>
    )
}
