import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null)
  const [session, setSession]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [profile, setProfile]           = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  async function fetchProfile(userId) {
    setProfileLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('income_range, spending_weakness, savings_goal, onboarding_complete')
      .eq('user_id', userId)
      .single()
    setProfile(data ?? null)
    setProfileLoading(false)
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetchProfile(user.id)
    } else {
      setProfile(null)
      setProfileLoading(false)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function signUp(email, password) {
    return supabase.auth.signUp({ email, password })
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth` },
    })
  }

  async function signOut() {
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      profile, profileLoading, refreshProfile,
      signUp, signIn, signInWithGoogle, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
