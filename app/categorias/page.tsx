import { supabase } from '@/lib/supabase/client'

export default async function CategoriasPage() {
    const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, created_at')
        .order('name', { ascending: true })

    if (error) {
        return (
            <div>
                <h1>Categorias</h1>
                <p>Erro ao carregar categorias: {error.message}</p>
            </div>
        )
    }

    return (
        <div>
            <h1>Categorias </h1>
            {
                categories.length === 0 ? (
                    <p>Nenhuma categoria encontrada.</p>
                ) : (
                    <ul>
                        {
                            categories.map((category) => (
                                <li key={category.id}>
                                    {category.name}
                                </li>
                            ))
                        }
                    </ul>
                )
            }
        </div>
    )
}