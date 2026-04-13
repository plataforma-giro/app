'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

type Profile = {
  id: string
  email: string | null
  nome: string | null
  cpf: string | null
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        setError(error.message)
        setCheckingSession(false)
        return
      }

      const currentSession = data.session ?? null
      setSession(currentSession)

      if (currentSession?.user?.id) {
        await loadProfile(currentSession.user.id)
      }

      setCheckingSession(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return

      setSession(newSession)

      if (newSession?.user?.id) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nome, cpf')
      .eq('id', userId)
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setProfile(data)
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin : undefined

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage('Link de acesso enviado para seu email.')
    setLoading(false)
  }

  async function handleLogout() {
    setLoading(true)
    setError('')
    setMessage('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setProfile(null)
    setSession(null)
    setLoading(false)
  }

  if (checkingSession) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Plataforma Giro</h1>
        <p>Verificando sessão...</p>
      </main>
    )
  }

  if (session) {
    return (
      <main style={{ padding: 24, maxWidth: 520 }}>
        <h1>Plataforma Giro</h1>
        <p>Usuário autenticado com sucesso.</p>

        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <div>
            <strong>Email:</strong> {profile?.email ?? session.user.email ?? '-'}
          </div>
          <div>
            <strong>Nome:</strong> {profile?.nome ?? '-'}
          </div>
          <div>
            <strong>CPF:</strong> {profile?.cpf ?? '-'}
          </div>
          <div>
            <strong>User ID:</strong> {session.user.id}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          style={{
            marginTop: 24,
            padding: 12,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Saindo...' : 'Sair'}
        </button>

        {error ? (
          <p style={{ marginTop: 16, color: 'red' }}>{error}</p>
        ) : null}
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ marginBottom: 8 }}>Plataforma Giro</h1>
      <p style={{ marginBottom: 24 }}>
        Entre com seu email para acessar o sistema.
      </p>

      <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
        <input
          type="email"
          placeholder="Seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 12, fontSize: 16, cursor: 'pointer' }}
        >
          {loading ? 'Enviando...' : 'Receber link de acesso'}
        </button>
      </form>

      {message ? (
        <p style={{ marginTop: 16, color: 'green' }}>{message}</p>
      ) : null}

      {error ? (
        <p style={{ marginTop: 16, color: 'red' }}>{error}</p>
      ) : null}
    </main>
  )
}