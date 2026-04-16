'use client'

import { FormEvent, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
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

export default function PerfilPage() {
  const SUPABASE_TIMEOUT_MS = 15000
  const router = useRouter()
  const pathname = usePathname()
  const [initialLoading, setInitialLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')

  async function withTimeout<T>(promise: Promise<T>, timeoutMessage: string) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage))
      }, SUPABASE_TIMEOUT_MS)
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  async function loadProfile(userId: string) {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, nome, cpf, telefone, cidade')
      .eq('id', userId)
      .single()

    if (profileError) {
      setError(profileError.message)
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

  const isProfileComplete =
    !!profile?.nome?.trim() &&
    !!profile?.cpf?.trim() &&
    !!profile?.telefone?.trim() &&
    !!profile?.cidade?.trim()

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

      const currentSession = data.session ?? null
      setSession(currentSession)

      if (!currentSession) {
        if (pathname !== '/') {
          router.push('/')
        }
        setInitialLoading(false)
        return
      }

      await loadProfile(currentSession.user.id)

      if (!mounted) return
      setInitialLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return

      setSession(newSession)

      if (!newSession) {
        setProfile(null)
        if (pathname !== '/') {
          router.push('/')
        }
        return
      }

      await loadProfile(newSession.user.id)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [pathname, router])

  useEffect(() => {
    if (initialLoading) return

    if (!session) {
      if (pathname !== '/') {
        router.push('/')
      }
      return
    }

    if (isProfileComplete && pathname !== '/dashboard') {
      router.push('/dashboard')
    }
  }, [initialLoading, isProfileComplete, pathname, router, session])

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
    console.log('Perfil: início do salvar')

    try {
      const { data, error: upsertError } = await withTimeout(
        supabase
          .from('profiles')
          .upsert(
            {
              id: session.user.id,
              email: session.user.email ?? null,
              nome: nome.trim() || null,
              cpf: cpf.replace(/\D/g, ''),
              telefone: telefone.trim() || null,
              cidade: cidade.trim() || null,
            },
            { onConflict: 'id' }
          )
          .select('id, email, nome, cpf, telefone, cidade')
          .single(),
        'A atualização do perfil demorou demais. Tente novamente.'
      )

      if (upsertError) {
        throw new Error(upsertError.message)
      }

      if (data) {
        setProfile(data)
        setNome(data.nome ?? '')
        setCpf(data.cpf ?? '')
        setTelefone(data.telefone ?? '')
        setCidade(data.cidade ?? '')
      }

      setMessage('Perfil atualizado com sucesso.')
      console.log('Perfil: salvar concluído com sucesso')

      if (pathname !== '/dashboard') {
        router.push('/dashboard')
      }
    } catch (submitError) {
      console.error('Perfil: erro ao salvar', submitError)
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível salvar o perfil. Tente novamente.'
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return
    setError('')
    setMessage('')
    setLoggingOut(true)
    console.log('Perfil: início do logout')

    try {
      const { error: logoutError } = await withTimeout(
        supabase.auth.signOut(),
        'O logout demorou demais. Tente novamente.'
      )

      if (logoutError) {
        throw new Error(logoutError.message)
      }

      setProfile(null)
      setSession(null)
      setNome('')
      setCpf('')
      setTelefone('')
      setCidade('')
      console.log('Perfil: logout concluído com sucesso')

      if (pathname !== '/') {
        router.push('/')
      }
    } catch (logoutError) {
      console.error('Perfil: erro no logout', logoutError)
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : 'Não foi possível sair. Tente novamente.'
      )
    } finally {
      setLoggingOut(false)
    }
  }

  if (initialLoading) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Plataforma Giro</h1>
        <p>Carregando...</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main style={{ padding: 24 }}>
        <p>Redirecionando...</p>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ marginBottom: 8 }}>Plataforma Giro</h1>
      <p style={{ marginBottom: 24 }}>Complete seu perfil para continuar.</p>

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

      {message ? <p style={{ marginTop: 16, color: 'green' }}>{message}</p> : null}

      {error ? <p style={{ marginTop: 16, color: 'red' }}>{error}</p> : null}
    </main>
  )
}
