'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [sendingLogin, setSendingLogin] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const routeForSession = useCallback(
    async (session: Session | null) => {
      if (!session?.user?.id) return

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('nome, cpf, telefone, cidade')
        .eq('id', session.user.id)
        .single()

      if (profileError || !data) {
        router.push('/perfil')
        return
      }

      const isProfileComplete =
        !!data.nome?.trim() &&
        !!data.cpf?.trim() &&
        !!data.telefone?.trim() &&
        !!data.cidade?.trim()

      router.push(isProfileComplete ? '/dashboard' : '/perfil')
    },
    [router]
  )

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error: sessionError } = await supabase.auth.getSession()

      if (!mounted) return

      if (sessionError) {
        setError(sessionError.message)
        setInitialLoading(false)
        return
      }

      await routeForSession(data.session ?? null)

      if (!mounted) return
      setInitialLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      await routeForSession(newSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [routeForSession])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (sendingLogin) return
    setSendingLogin(true)

    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin : undefined

    const { error: loginError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (loginError) {
      setError(loginError.message)
      setSendingLogin(false)
      return
    }

    setMessage('Link de acesso enviado para seu email.')
    setSendingLogin(false)
  }

  if (initialLoading) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Plataforma Giro</h1>
        <p>Carregando...</p>
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
          disabled={sendingLogin}
          style={{ padding: 12, fontSize: 16, cursor: 'pointer' }}
        >
          {sendingLogin ? 'Enviando...' : 'Receber link de acesso'}
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
