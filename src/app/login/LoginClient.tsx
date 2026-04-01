'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, Play } from 'lucide-react'
import Image from 'next/image'

/* ─── Floating video reel cards scattered in bg ─── */
const REELS = [
  { id: 1, x: '5%',  y: '8%',  rotate: -12, delay: '0s',    duration: '18s', gradient: 'linear-gradient(160deg,#7c3aed,#e91e8c)', label: 'Trending Now' },
  { id: 2, x: '78%', y: '5%',  rotate:  10, delay: '3s',    duration: '22s', gradient: 'linear-gradient(160deg,#e91e8c,#ff6b35)', label: 'Go Viral' },
  { id: 3, x: '88%', y: '52%', rotate:   8, delay: '1.5s',  duration: '20s', gradient: 'linear-gradient(160deg,#4a0e9e,#e91e8c)', label: 'AI Studio' },
  { id: 4, x: '2%',  y: '58%', rotate: -8,  delay: '4s',    duration: '25s', gradient: 'linear-gradient(160deg,#c2185b,#7c3aed)', label: 'Shorts' },
  { id: 5, x: '60%', y: '75%', rotate:  14, delay: '2s',    duration: '19s', gradient: 'linear-gradient(160deg,#ff6b35,#c2185b)', label: 'Mix & Publish' },
  { id: 6, x: '20%', y: '80%', rotate:  -6, delay: '5.5s',  duration: '23s', gradient: 'linear-gradient(160deg,#7c3aed,#4a0e9e)', label: 'Create More' },
  { id: 7, x: '42%', y: '3%',  rotate:   5, delay: '0.8s',  duration: '21s', gradient: 'linear-gradient(160deg,#e91e8c,#7c3aed)', label: 'Auto-Post' },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) setMessage({ type: 'error', text: error.message })
      else       setMessage({ type: 'success', text: 'Check your email to confirm your account.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ type: 'error', text: error.message })
      else       window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        /* ── page base ── */
        * { box-sizing: border-box; }

        /* ── background blobs ── */
        @keyframes blob1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(60px,-40px) scale(1.1); }
          66%      { transform: translate(-30px,30px) scale(0.93); }
        }
        @keyframes blob2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-70px,50px) scale(1.12); }
          70%      { transform: translate(40px,-25px) scale(0.9); }
        }
        @keyframes blob3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(30px,60px) scale(1.07); }
        }
        .blob-a { animation: blob1 14s ease-in-out infinite; }
        .blob-b { animation: blob2 18s ease-in-out infinite; }
        .blob-c { animation: blob3 11s ease-in-out infinite; }

        /* ── floating reel cards ── */
        @keyframes reel-float {
          0%   { transform: var(--r) translateY(0px); }
          50%  { transform: var(--r) translateY(-18px); }
          100% { transform: var(--r) translateY(0px); }
        }
        .reel-card {
          animation: reel-float var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }

        /* ── login card float ── */
        @keyframes card-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }
        .login-card-float { animation: card-float 6s ease-in-out infinite; }

        /* ── inputs ── */
        .vy-input {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 12px 14px 12px 40px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .vy-input::placeholder { color: rgba(255,255,255,0.25); }
        .vy-input:focus {
          border-color: rgba(233,30,140,.65);
          box-shadow: 0 0 0 3px rgba(233,30,140,.14);
        }

        /* ── submit button ── */
        .vy-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          background: linear-gradient(135deg,#E91E8C 0%,#7C3AED 100%);
          box-shadow: 0 8px 32px rgba(233,30,140,.35);
          color: white;
          font-weight: 800;
          font-size: 14px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer;
          border: none;
          transition: box-shadow .2s, transform .15s;
        }
        .vy-btn:hover:not(:disabled) {
          box-shadow: 0 12px 40px rgba(233,30,140,.55);
          transform: translateY(-1px);
        }
        .vy-btn:active:not(:disabled) { transform: scale(.98); }
        .vy-btn:disabled { opacity:.5; cursor:not-allowed; }

        /* ── noise overlay ── */
        .noise {
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* ═══════════════ FULL PAGE ═══════════════ */}
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(140deg,#1a0533 0%,#2d0a6b 28%,#4a0e9e 52%,#7C3AED 76%,#E91E8C 100%)' }}>

        {/* ── gradient blobs ── */}
        <div className="blob-a absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background:'radial-gradient(circle,#9c27b0 0%,transparent 65%)', filter:'blur(80px)', opacity:.55 }} />
        <div className="blob-b absolute -bottom-48 -right-48 w-[800px] h-[800px] rounded-full pointer-events-none"
          style={{ background:'radial-gradient(circle,#e91e8c 0%,#ff5722 55%,transparent 75%)', filter:'blur(90px)', opacity:.5 }} />
        <div className="blob-c absolute top-1/3 right-1/4 w-[450px] h-[450px] rounded-full pointer-events-none"
          style={{ background:'radial-gradient(circle,#7c3aed 0%,transparent 70%)', filter:'blur(60px)', opacity:.38 }} />

        {/* ── noise texture ── */}
        <div className="noise absolute inset-0 pointer-events-none opacity-40" />

        {/* ── subtle grid ── */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
            backgroundSize:'56px 56px',
          }} />

        {/* ══════════ FLOATING REEL CARDS ══════════ */}
        {REELS.map(r => (
          <div
            key={r.id}
            className="reel-card absolute pointer-events-none select-none"
            style={{
              left: r.x, top: r.y,
              '--r': `rotate(${r.rotate}deg)`,
              '--dur': r.duration,
              '--delay': r.delay,
            } as React.CSSProperties}
          >
            {/* phone frame */}
            <div className="relative w-[72px] h-[126px] rounded-[14px] overflow-hidden shadow-2xl"
              style={{
                background: r.gradient,
                border: '2px solid rgba(255,255,255,0.18)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}>
              {/* scanline sheen */}
              <div className="absolute inset-0"
                style={{ background:'linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 40%)' }} />
              {/* play icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.25)', backdropFilter:'blur(4px)' }}>
                  <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                </div>
              </div>
              {/* label */}
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="text-white/70 font-semibold"
                  style={{ fontSize:'7px', letterSpacing:'0.05em' }}>
                  {r.label}
                </span>
              </div>
              {/* notch */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                style={{ background:'rgba(0,0,0,0.25)' }} />
            </div>
          </div>
        ))}

        {/* ══════════ CENTER LOGIN CARD ══════════ */}
        <div className="login-card-float relative z-10 w-full max-w-[400px]">
          <div className="rounded-[28px] px-8 py-9 shadow-2xl"
            style={{
              background:'rgba(255,255,255,0.08)',
              backdropFilter:'blur(28px)',
              WebkitBackdropFilter:'blur(28px)',
              border:'1px solid rgba(255,255,255,0.16)',
              boxShadow:'0 40px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}>

            {/* ── Logo ── */}
            <div className="flex flex-col items-center mb-7">
              {/* logo with screen blend to remove white bg */}
              <div className="relative w-32 h-32" style={{ mixBlendMode:'screen' }}>
                <Image
                  src="/vybline-logo.png"
                  alt="Vybline"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-white/45 text-[10px] tracking-[0.4em] uppercase font-semibold -mt-1">
                Create · Mix · Publish
              </p>
            </div>

            {/* ── Heading ── */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-black text-white mb-1">
                {isSignUp ? 'Get started' : 'Welcome back'}
              </h2>
              <p className="text-white/40 text-sm">
                {isSignUp ? 'Create your Vybline account.' : 'Sign in to your studio.'}
              </p>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="text-[10px] text-white/40 mb-1.5 block uppercase tracking-widest font-semibold">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    required placeholder="you@example.com"
                    className="vy-input"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/40 mb-1.5 block uppercase tracking-widest font-semibold">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                  <input
                    type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    className="vy-input"
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

              <button type="submit" disabled={loading} className="vy-btn mt-1">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.08)' }} />
              <span className="text-white/25 text-[10px] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.08)' }} />
            </div>

            {/* ── Toggle sign in / sign up ── */}
            <p className="text-center text-sm text-white/35">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
                className="font-bold transition-colors"
                style={{ color:'#E91E8C' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ff4dac')}
                onMouseLeave={e => (e.currentTarget.style.color = '#E91E8C')}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>

          </div>

          {/* footer */}
          <p className="text-center text-white/20 text-[10px] mt-5 tracking-widest uppercase">
            © 2025 Vybline · Short-form Content Engine
          </p>
        </div>

      </div>
    </>
  )
}
