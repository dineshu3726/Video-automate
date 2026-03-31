'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, Zap } from 'lucide-react'

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
    <div className="min-h-screen bg-[#0B0B14] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#E91E8C]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#7C3AED]/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #7C3AED 100%)' }}>
            <Zap className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            vyb<span style={{ color: '#E91E8C' }}>line</span>
          </h1>
          <p className="text-[#7A7A9D] text-sm">Create. Mix. Publish.</p>
        </div>

        {/* Card */}
        <div className="bg-[#13131F] border border-[#252540] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-1">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-[#7A7A9D] text-sm mb-6">
            {isSignUp ? 'Start creating viral short-form content.' : 'Sign in to your Vybline studio.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#7A7A9D] mb-1.5 block uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7A9D]" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full bg-[#1C1C2E] border border-[#252540] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#7A7A9D] text-sm focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#7A7A9D] mb-1.5 block uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7A9D]" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-[#1C1C2E] border border-[#252540] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#7A7A9D] text-sm focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50 transition"
                />
              </div>
            </div>

            {message && (
              <div className={`text-sm px-4 py-3 rounded-xl ${
                message.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                  : 'bg-green-500/10 border border-green-500/30 text-green-300'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #7C3AED 100%)' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[#7A7A9D] mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
              className="text-[#E91E8C] hover:text-[#ff4dac] font-semibold transition"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
