"use client"

import { useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleGoBack = () => {
    const from = searchParams?.get('from')
    if (from === 'noticias') {
      router.push('/noticias')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10 p-4">
      <div className="w-full max-w-md space-y-4">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="text-muted-foreground hover:text-foreground flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {searchParams?.get('from') === 'noticias' ? 'Voltar às notícias' : 'Voltar ao início'}
        </Button>
        {isLogin ? (
          <LoginForm onSwitchToSignUp={() => setIsLogin(false)} />
        ) : (
          <SignUpForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  )
}