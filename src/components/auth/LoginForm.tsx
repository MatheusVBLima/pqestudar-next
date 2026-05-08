"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-message'
import { PUBLIC_SUPABASE_URL } from '@/lib/runtime-env'

interface LoginFormProps {
  onSwitchToSignUp: () => void
}

export function LoginForm({ onSwitchToSignUp }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const { signIn, signInWithGoogle, resetPassword } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)
    
    if (error) {
      let errorMessage = 'Erro ao fazer login'
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos. Verifique suas credenciais ou tente recuperar sua senha.'
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado.'
        toast.error(errorMessage, {
          action: {
            label: 'Reenviar confirmação',
            onClick: () => handleResendConfirmation()
          }
        })
        setLoading(false)
        return
      } else {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } else {
      toast.success('Login realizado com sucesso!')
      router.push('/')
    }
    
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    
    if (error) {
      toast.error('Erro ao fazer login com Google: ' + error.message)
      setGoogleLoading(false)
    }
    // Não definimos loading como false aqui porque o usuário será redirecionado
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('Digite seu email para recuperar a senha')
      return
    }

    setResetLoading(true)
    const { error } = await resetPassword(email)
    
    if (error) {
      toast.error('Erro ao enviar email de recuperação: ' + error.message)
    } else {
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.')
      setShowForgotPassword(false)
    }
    
    setResetLoading(false)
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error('Digite seu email para reenviar a confirmação')
      return
    }

    console.info('[Auth] Resend confirmation start', { email })
    setResendLoading(true)
    
    try {
      const response = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/auth-resend-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          redirectTo: window.location.origin + '/login'
        })
      })

      console.info('[Auth] Resend confirmation response', { ok: response.ok, status: response.status })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha no reenvio')
      }

      toast.success('E-mail enviado. Verifique sua caixa de entrada e spam.')
    } catch (error: unknown) {
      console.error('[Auth] Resend confirmation error', error)
      toast.error(getErrorMessage(error, 'Erro ao reenviar. Tente novamente.'))
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            PqEstudar?
          </span>
        </div>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Acesse com Google para continuar
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? 'Entrando...' : (
            <>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Nenhuma senha é armazenada.
        </p>
      </CardContent>
    </Card>
  )
}
