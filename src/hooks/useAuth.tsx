"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { getErrorMessage } from '@/lib/error-message'
import { devInfo } from '@/lib/dev-log'

type AuthActionError = { message: string; isExistingUser?: boolean } | null
type AuthActionResult = Promise<{ error: AuthActionError }>

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => AuthActionResult
  signUp: (email: string, password: string) => AuthActionResult
  signInWithGoogle: () => AuthActionResult
  signOut: () => Promise<void>
  resetPassword: (email: string) => AuthActionResult
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): AuthActionResult => {
    devInfo('[Auth] Login start', { email })
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('[Auth] Login error', { error: error.message })
    } else {
      devInfo('[Auth] Login success')
    }
    
    return { error }
  }

  const signUp = async (email: string, password: string): AuthActionResult => {
    devInfo('[Auth] Signup start', { email })
    
    const redirectUrl = `${window.location.origin}/login`
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    })
    
    if (error) {
      console.error('[Auth] Signup error', { error: error.message })
      return { error }
    }
    
    devInfo('[Auth] Signup response', {
      hasUser: !!data?.user, 
      hasSession: !!data?.session,
      identitiesCount: data?.user?.identities?.length || 0
    })
    
    // Verificar se é um signup repetido
    if (data?.user && !data.session && data.user.identities?.length === 0) {
      console.warn('[Auth] Existing user detected')
      return { 
        error: { 
          message: "Este email já está cadastrado. Tente fazer login ou recuperar sua senha.",
          isExistingUser: true
        } 
      }
    }
    
    return { error }
  }

  const signInWithGoogle = async (): AuthActionResult => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        }
      })
      return { error }
    } catch (error: unknown) {
      console.error('Erro no Google Auth:', error)
      return { error: { message: getErrorMessage(error) } }
    }
  }

  const resetPassword = async (email: string): AuthActionResult => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error: unknown) {
      return { error: { message: getErrorMessage(error) } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
