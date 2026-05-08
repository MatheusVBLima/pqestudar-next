import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-message'

interface SignUpFormProps {
  onSwitchToLogin: () => void
}

export function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const { signUp, signInWithGoogle } = useAuth()

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error('Digite seu email para reenviar a confirmação')
      return
    }

    console.info('[Auth] Resend confirmation start', { email })
    setResendLoading(true)
    
    try {
      const supabaseUrl = 'https://omkxiomwzbykmqttfozi.supabase.co'
      const response = await fetch(`${supabaseUrl}/functions/v1/auth-resend-confirmation`, {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password)
    
    if (error) {
      if (error.isExistingUser) {
        toast.error(error.message, {
          action: {
            label: "Fazer Login",
            onClick: onSwitchToLogin,
          },
        })
      } else {
        let errorMessage = 'Erro ao criar conta'
        if (error.message?.includes('User already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login.'
        } else if (error.message?.includes('Password should be at least')) {
          errorMessage = 'A senha deve ter pelo menos 6 caracteres'
        } else {
          errorMessage = error.message
        }
        toast.error(errorMessage)
      }
    } else {
      toast.success('Conta criada! Verifique seu email para confirmar.')
      onSwitchToLogin()
    }
    
    setLoading(false)
  }

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    
    if (error) {
      toast.error('Erro ao cadastrar com Google: ' + error.message)
      setGoogleLoading(false)
    }
    // Não definimos loading como false aqui porque o usuário será redirecionado
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar Conta</CardTitle>
        <CardDescription>
          Cadastre-se para acessar todos os recursos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={handleResendConfirmation}
              disabled={resendLoading || !email}
            >
              {resendLoading ? 'Reenviando...' : 'Reenviar confirmação'}
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={loading || googleLoading || resendLoading}>
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </Button>
        </form>
        
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou</span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="w-full mt-4"
            onClick={handleGoogleSignUp}
            disabled={loading || googleLoading || resendLoading}
          >
            {googleLoading ? 'Cadastrando...' : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Cadastrar com Google
              </>
            )}
          </Button>
        </div>
        
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onSwitchToLogin}>
            Já tem conta? Faça login
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
