'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()
  const [initialLoading, setInitialLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data } = await supabase.auth.getSession()

      if (!mounted) return

      const currentSession = data.session ?? null
      setSession(currentSession)

      if (!currentSession) {
        router.push('/')
      }

      setInitialLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return

      setSession(newSession)

      if (!newSession) {
        router.push('/')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)

    await supabase.auth.signOut()
    router.push('/')
    setLoggingOut(false)
  }

  if (initialLoading) {
    return (
      <main style={{ padding: 24 }}>
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
      <h1>Área autenticada</h1>
      <p style={{ marginTop: 12 }}>
        <strong>Email:</strong> {session.user.email ?? '-'}
      </p>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        style={{ marginTop: 16, padding: 12, fontSize: 16, cursor: 'pointer' }}
      >
        {loggingOut ? 'Saindo...' : 'Sair'}
      </button>
    </main>
  )
}
