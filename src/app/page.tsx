'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

type Profile = {
  id: string
  email: string | null
  nome: string | null
  cpf: string | null
  telefone: string | null
  cidade: string | null
}

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [sendingLogin, setSendingLogin] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nome, cpf, telefone, cidade')
      .eq('id', userId)
      .single()

    if (error) {
      setError(error.message)
      return
    }

    if (!data) {
      setProfile(null)
      setNome('')
      setCpf('')
      setTelefone('')
      setCidade('')
      return
    }

    setProfile(data)
    setNome(data.nome ?? '')
    setCpf(data.cpf ?? '')
    setTelefone(data.telefone ?? '')
    setCidade(data.cidade ?? '')
  }

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        setError(error.message)
        setInitialLoading(false)
        return
      }

      const currentSession = data.session ?? null
      setSession(currentSession)

      if (currentSession?.user?.id) {
        await loadProfile(currentSession.user.id)
      }

      setInitialLoading(false)
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

  useEffect(() => {
    if (session && isProfileComplete) {
      router.push('/dashboard')
    }
  }, [isProfileComplete, router, session])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (sendingLogin) return
    setSendingLogin(true)

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
      setSendingLogin(false)
      return
    }

    setMessage('Link de acesso enviado para seu email.')
    setSendingLogin(false)
  }

  async function handleLogout() {
    setError('')
    setMessage('')
    if (loggingOut) return
    setLoggingOut(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      setLoggingOut(false)
      return
    }

    setProfile(null)
    setSession(null)
    setNome('')
    setCpf('')
    setTelefone('')
    setCidade('')
    setLoggingOut(false)
  }

  const isProfileComplete =
    !!profile?.nome?.trim() &&
    !!profile?.cpf?.trim() &&
    !!profile?.telefone?.trim() &&
    !!profile?.cidade?.trim()

  const authState = !session
    ? 'deslogado'
    : isProfileComplete
      ? 'logado_completo'
      : 'logado_incompleto'

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!session?.user?.id || savingProfile) return

    if (!cpf.trim()) {
      setError('CPF é obrigatório.')
      return
    }

    setSavingProfile(true)

    const updates = {
      nome: nome.trim() || null,
      cpf: cpf.replace(/\D/g, ''),
      telefone: telefone.trim() || null,
      cidade: cidade.trim() || null,
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: session.user.id,
          email: session.user.email ?? null,
          ...updates,
        },
        { onConflict: 'id' }
      )
      .select('id, email, nome, cpf, telefone, cidade')
      .single()

    if (error) {
      setError(error.message)
      setSavingProfile(false)
      return
    }

    if (data) {
      setProfile(data)
      setNome(data.nome ?? '')
      setCpf(data.cpf ?? '')
      setTelefone(data.telefone ?? '')
      setCidade(data.cidade ?? '')
    }
    setMessage('Perfil atualizado com sucesso.')
    setSavingProfile(false)
    router.push('/dashboard')
  }

  if (initialLoading) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Plataforma Giro</h1>
        <p>Carregando...</p>
      </main>
    )
  }

  if (authState === 'logado_completo' && session) {
    return (
      <main style={{ padding: 24, maxWidth: 520 }}>
        <h1>Plataforma Giro</h1>
        <p>Usuário autenticado com perfil completo.</p>

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
            <strong>Telefone:</strong> {profile?.telefone ?? '-'}
          </div>
          <div>
            <strong>Cidade:</strong> {profile?.cidade ?? '-'}
          </div>
          <div>
            <strong>User ID:</strong> {session.user.id}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            marginTop: 24,
            padding: 12,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          {loggingOut ? 'Saindo...' : 'Sair'}
        </button>

        {error ? (
          <p style={{ marginTop: 16, color: 'red' }}>{error}</p>
        ) : null}
      </main>
    )
  }

  if (authState === 'logado_incompleto' && session) {
    return (
      <main style={{ padding: 24, maxWidth: 420 }}>
        <h1 style={{ marginBottom: 8 }}>Plataforma Giro</h1>
        <p style={{ marginBottom: 24 }}>
          Complete seu perfil para continuar.
        </p>

        <form onSubmit={handleProfileSubmit} style={{ display: 'grid', gap: 12 }}>
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={{ padding: 12, fontSize: 16 }}
          />
          <input
            type="text"
            placeholder="CPF *"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            required
            style={{ padding: 12, fontSize: 16 }}
          />
          <input
            type="text"
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            style={{ padding: 12, fontSize: 16 }}
          />
          <input
            type="text"
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            style={{ padding: 12, fontSize: 16 }}
          />

          <button
            type="submit"
            disabled={savingProfile}
            style={{ padding: 12, fontSize: 16, cursor: 'pointer' }}
          >
            {savingProfile ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            marginTop: 12,
            padding: 12,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          {loggingOut ? 'Saindo...' : 'Sair'}
        </button>

        {message ? (
          <p style={{ marginTop: 16, color: 'green' }}>{message}</p>
        ) : null}

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
