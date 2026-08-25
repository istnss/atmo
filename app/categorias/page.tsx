'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Category = {
    id: number
    name: string
    created_at: string
}

export default function CategoriasPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadCategories() {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name, created_at')

            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }

            setCategories(data ?? [])
            setLoading(false)
        }

        loadCategories()
    }, [])

    if (loading) {
        return <p>Carregando categorias...</p>
    }

    if (error) {
        return <p>Erro ao carregar categorias: {error}</p>
    }

    return (
        <div>
            <h1>Categorias</h1>

            {categories.length === 0 ? (
                <p>Nenhuma categoria encontrada.</p>
            ) : (
                <ul>
                    {categories.map((category) => (
                        <li key={category.id}>{category.name}</li>
                    ))}
                </ul>
            )}
        </div>
    )
}