'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
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
    <>
      <style>{`
        @keyframes blob-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(40px, -30px) scale(1.08); }
          66%       { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes blob-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(-50px, 30px) scale(1.1); }
          66%       { transform: translate(30px, -20px) scale(0.92); }
        }
        @keyframes blob-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(20px, 40px) scale(1.05); }
        }
        .blob-1 { animation: blob-drift 12s ease-in-out infinite; }
        .blob-2 { animation: blob-drift-2 15s ease-in-out infinite; }
        .blob-3 { animation: blob-drift-3 10s ease-in-out infinite; }
        .noise-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
        }
        .input-field {
          background: rgba(15, 8, 30, 0.5);
          border: 1px solid rgba(255,255,255,0.1);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-field:focus {
          outline: none;
          border-color: rgba(233, 30, 140, 0.6);
          box-shadow: 0 0 0 3px rgba(233, 30, 140, 0.12);
        }
        .submit-btn {
          background: linear-gradient(135deg, #E91E8C 0%, #7C3AED 100%);
          box-shadow: 0 8px 32px rgba(233,30,140,0.3);
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .submit-btn:hover:not(:disabled) {
          box-shadow: 0 12px 40px rgba(233,30,140,0.5);
          transform: translateY(-1px);
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .glass-card {
          background: rgba(12, 6, 28, 0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.09);
        }
      `}</style>

      <div className="min-h-screen flex">

        {/* ── LEFT BRAND PANEL ── */}
        <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col items-center justify-center">

          {/* Base gradient */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(145deg, #1a0533 0%, #3b0764 25%, #6d1b7b 50%, #c2185b 78%, #e64a19 100%)' }} />

          {/* Animated liquid blobs */}
          <div className="blob-1 absolute top-[-10%] left-[-10%] w-[75%] h-[75%] rounded-full opacity-60"
            style={{ background: 'radial-gradient(circle at 40% 40%, #9c27b0 0%, transparent 65%)', filter: 'blur(60px)' }} />
          <div className="blob-2 absolute bottom-[-15%] right-[-10%] w-[80%] h-[80%] rounded-full opacity-55"
            style={{ background: 'radial-gradient(circle at 60% 60%, #e91e8c 0%, #ff5722 60%, transparent 80%)', filter: 'blur(70px)' }} />
          <div className="blob-3 absolute top-[30%] right-[10%] w-[50%] h-[50%] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle at 50% 50%, #7c3aed 0%, transparent 70%)', filter: 'blur(50px)' }} />

          {/* Holographic sheen */}
          <div className="absolute inset-0 opacity-20"
            style={{ background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.08) 40%, transparent 60%, rgba(255,150,200,0.06) 100%)' }} />

          {/* Noise texture */}
          <div className="noise-overlay absolute inset-0 opacity-30" />

          {/* Subtle grid lines */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }} />

          {/* Ring accents */}
          <div className="absolute top-12 right-12 w-28 h-28 rounded-full border border-white/10" />
          <div className="absolute top-16 right-16 w-16 h-16 rounded-full border border-white/10" />
          <div className="absolute bottom-16 left-12 w-36 h-36 rounded-full border border-white/10" />
          <div className="absolute bottom-20 left-16 w-20 h-20 rounded-full border border-white/10" />
          <div className="absolute top-1/2 left-8 w-8 h-8 rounded-full border border-white/10 -translate-y-1/2" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-12">
            <div className="relative w-36 h-36 mb-6 drop-shadow-2xl">
              <Image
                src="/vybline-logo.png"
                alt="Vybline"
                fill
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-5xl font-black text-white tracking-tight mb-2" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
              Vybline
            </h1>
            <p className="text-white/50 text-xs tracking-[0.35em] uppercase font-medium mb-10">
              Create · Mix · Publish
            </p>

            {/* Feature pills */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {[
                { icon: '✦', label: 'AI-Powered Video Generation' },
                { icon: '⟳', label: 'Auto-Publish to YouTube & Reels' },
                { icon: '◈', label: 'Studio-Grade Editing Tools' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-pink-300 text-sm">{f.icon}</span>
                  <span className="text-white/70 text-sm font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom label */}
          <p className="absolute bottom-6 left-0 right-0 text-center text-white/20 text-xs tracking-widest uppercase">
            Short-form Content Engine
          </p>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative"
          style={{ background: '#0a0514' }}>

          {/* Subtle corner glow */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 100% 0%, #7c3aed 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 0% 100%, #e91e8c 0%, transparent 70%)' }} />

          <div className="w-full max-w-sm relative z-10">

            {/* Mobile logo */}
            <div className="flex lg:hidden flex-col items-center gap-2 mb-10">
              <div className="relative w-20 h-20">
                <Image src="/vybline-logo.png" alt="Vybline" fill className="object-contain" priority />
              </div>
              <p className="text-white/40 text-xs tracking-[0.3em] uppercase">Create · Mix · Publish</p>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-3xl font-black text-white mb-1.5">
                {isSignUp ? 'Get started' : 'Welcome back'}
              </h2>
              <p className="text-white/40 text-sm">
                {isSignUp
                  ? 'Create your Vybline account to start.'
                  : 'Sign in to your Vybline studio.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="text-xs text-white/40 mb-2 block uppercase tracking-widest font-semibold">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="input-field w-full rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 mb-2 block uppercase tracking-widest font-semibold">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input-field w-full rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 text-sm"
                  />
                </div>
              </div>

              {message && (
                <div className={`text-sm px-4 py-3 rounded-xl ${
                  message.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/25 text-red-300'
                    : 'bg-green-500/10 border border-green-500/25 text-green-300'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="submit-btn w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ArrowRight className="w-4 h-4" />
                }
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-7">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <span className="text-white/25 text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Toggle */}
            <p className="text-center text-sm text-white/35">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
                className="font-bold transition-colors"
                style={{ color: '#E91E8C' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ff4dac')}
                onMouseLeave={e => (e.currentTarget.style.color = '#E91E8C')}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>

            {/* Footer */}
            <p className="text-center text-white/15 text-xs mt-10 tracking-wider">
              © 2025 Vybline · All rights reserved
            </p>
          </div>
        </div>

      </div>
    </>
  )
}
