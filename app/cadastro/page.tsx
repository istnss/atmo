'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function CadastroPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCadastro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name,
    },
  },
})

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name,
        })
        .eq('id', data.user.id)

      if (profileError) {
        setMessage(profileError.message)
        setLoading(false)
        return
      }
    }

    setMessage(
      'Cadastro realizado. Verifique seu e-mail para confirmar a conta.'
    )

    setLoading(false)
  }

  return (
    <main>
      <h1>Cadastro</h1>

      <form onSubmit={handleCadastro}>
        <input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  )
}