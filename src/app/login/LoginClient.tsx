'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) setMessage({ type: 'error', text: error.message })
      else setMessage({ type: 'success', text: 'Check your email to confirm your account.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ type: 'error', text: error.message })
      else window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1a0533 0%, #2d0a6b 30%, #4a0e9e 55%, #7C3AED 80%, #E91E8C 100%)' }}>

      {/* Large decorative circles — Musfix-style */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
      <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #E91E8C 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)' }} />

      {/* Floating ring accents */}
      <div className="absolute top-16 right-16 w-24 h-24 rounded-full border border-white/10" />
      <div className="absolute top-20 right-20 w-16 h-16 rounded-full border border-white/10" />
      <div className="absolute bottom-24 left-16 w-32 h-32 rounded-full border border-white/10" />
      <div className="absolute bottom-28 left-20 w-20 h-20 rounded-full border border-white/10" />

      {/* Dot grid overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="relative w-40 h-40 drop-shadow-2xl">
            <Image
              src="/vybline-logo.png"
              alt="Vybline"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-white/60 text-sm tracking-widest uppercase font-medium">
            Create. Mix. Publish.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>

          <h2 className="text-2xl font-black text-white mb-1">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-white/50 text-sm mb-7">
            {isSignUp ? 'Start creating viral short-form content.' : 'Sign in to your Vybline studio.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block uppercase tracking-widest font-semibold">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none transition"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(233,30,140,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(233,30,140,0.15)' }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1.5 block uppercase tracking-widest font-semibold">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none transition"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(233,30,140,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(233,30,140,0.15)' }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            {message && (
              <div className={`text-sm px-4 py-3 rounded-xl ${
                message.type === 'error'
                  ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                  : 'bg-green-500/15 border border-green-500/30 text-green-300'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm mt-2 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #E91E8C 0%, #7C3AED 100%)',
                boxShadow: '0 8px 32px rgba(233,30,140,0.35)',
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-white/30 text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <p className="text-center text-sm text-white/40">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
              className="font-bold transition"
              style={{ color: '#E91E8C' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff4dac')}
              onMouseLeave={e => (e.currentTarget.style.color = '#E91E8C')}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>

        {/* Footer tagline */}
        <p className="text-center text-white/25 text-xs mt-6 tracking-wider">
          Powered by Vybline · Short-form content engine
        </p>
      </div>
    </div>
  )
}
