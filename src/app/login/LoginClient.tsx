'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{type:'error'|'success'; text:string}|null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage(null)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) setMessage({ type:'error', text:error.message })
      else       setMessage({ type:'success', text:'Check your email to confirm your account.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ type:'error', text:error.message })
      else       window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fu1 { animation: fadeUp .5s .00s ease both; }
        .fu2 { animation: fadeUp .5s .10s ease both; }
        .fu3 { animation: fadeUp .5s .20s ease both; }
        .fu4 { animation: fadeUp .5s .30s ease both; }
        .fu5 { animation: fadeUp .5s .40s ease both; }

        @keyframes floatLogo {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        .logo-float { animation: floatLogo 5s ease-in-out infinite; }

        @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.05)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-25px,30px) scale(1.08)} }
        @keyframes blob3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,25px) scale(0.95)} }
        .blob1 { animation: blob1 18s ease-in-out infinite; }
        .blob2 { animation: blob2 22s ease-in-out infinite; animation-delay:3s; }
        .blob3 { animation: blob3 16s ease-in-out infinite; animation-delay:6s; }

        /* Light-mode inputs — dark text always */
        .login-input {
          width: 100%;
          background: #F0F4FF;
          border: 1.5px solid #D5E3FF;
          border-radius: 12px;
          padding: 13px 14px 13px 42px;
          color: #0D1117;
          font-size: 14px;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .login-input::placeholder { color: #9AACCA; }
        .login-input:focus {
          border-color: #00C8E0;
          box-shadow: 0 0 0 3px rgba(0,200,224,0.12);
          background: #fff;
        }
      `}</style>

      {/* ── Full-page light background ── */}
      <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4"
        style={{ background:'linear-gradient(145deg, #F4F7FF 0%, #EDF2FF 50%, #F0F7FF 100%)' }}>

        {/* Geometric network lines (like the logo background) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity:0.07 }}>
          <defs>
            <pattern id="net" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <line x1="0" y1="60" x2="60" y2="0" stroke="#5B35B5" strokeWidth="0.8"/>
              <line x1="60" y1="0" x2="120" y2="60" stroke="#5B35B5" strokeWidth="0.8"/>
              <line x1="0" y1="60" x2="60" y2="120" stroke="#00C8E0" strokeWidth="0.8"/>
              <line x1="60" y1="120" x2="120" y2="60" stroke="#00C8E0" strokeWidth="0.8"/>
              <circle cx="0"   cy="60"  r="2.5" fill="#5B35B5"/>
              <circle cx="60"  cy="0"   r="2.5" fill="#00C8E0"/>
              <circle cx="120" cy="60"  r="2.5" fill="#E91E8C"/>
              <circle cx="60"  cy="120" r="2.5" fill="#5B35B5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#net)"/>
        </svg>

        {/* Soft color blobs */}
        <div className="blob1 absolute rounded-full pointer-events-none"
          style={{ width:500, height:500, top:'-10%', left:'-10%', background:'radial-gradient(circle, rgba(0,200,224,0.12) 0%, transparent 70%)', filter:'blur(60px)' }} />
        <div className="blob2 absolute rounded-full pointer-events-none"
          style={{ width:600, height:600, bottom:'-15%', right:'-10%', background:'radial-gradient(circle, rgba(233,30,140,0.09) 0%, transparent 70%)', filter:'blur(70px)' }} />
        <div className="blob3 absolute rounded-full pointer-events-none"
          style={{ width:400, height:400, top:'40%', left:'55%', background:'radial-gradient(circle, rgba(91,53,181,0.08) 0%, transparent 70%)', filter:'blur(50px)' }} />

        {/* ═══════════════ LOGIN CARD ═══════════════ */}
        <div className="relative z-10 w-full max-w-[420px]">

          {/* Colorful top-border accent */}
          <div className="rounded-[24px] p-[2px]"
            style={{ background:'linear-gradient(90deg, #00C8E0, #5B35B5, #E91E8C, #FF7043, #00C8E0)' }}>
            <div className="rounded-[22px] bg-white px-8 py-10"
              style={{ boxShadow:'0 20px 60px rgba(91,53,181,0.1), 0 4px 20px rgba(0,200,224,0.08)' }}>

              {/* ── Logo ── */}
              <div className="fu1 flex flex-col items-center mb-6">
                <div className="logo-float w-full flex justify-center">
                  <Image
                    src="/logo.png"
                    alt="VybLiNe logo"
                    width={320}
                    height={200}
                    style={{
                      objectFit: 'contain',
                      width: '100%',
                      maxWidth: 300,
                      height: 'auto',
                    }}
                    priority
                  />
                </div>
              </div>

              {/* ── Heading ── */}
              <div className="fu2 mb-6 text-center">
                <h2 className="sb-heading text-2xl font-bold mb-1" style={{ color:'#0D1117' }}>
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-sm" style={{ color:'#556677' }}>
                  {isSignUp ? 'Join VybLiNe and start creating.' : 'Sign in to your VybLiNe studio.'}
                </p>
              </div>

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} className="fu3 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color:'#556677' }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color:'#00C8E0' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="login-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color:'#556677' }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color:'#00C8E0' }} />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="login-input"
                    />
                  </div>
                </div>

                {message && (
                  <div className={`text-sm px-4 py-3 rounded-xl border ${
                    message.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                  }`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{
                    background:'linear-gradient(135deg, #0097B2 0%, #00C8E0 50%, #33D6EC 100%)',
                    color:'#fff',
                    boxShadow:'0 6px 20px rgba(0,200,224,0.35)',
                    letterSpacing:'0.04em',
                    textTransform:'uppercase',
                  }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              {/* ── Divider ── */}
              <div className="fu4 flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] uppercase tracking-wider text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* ── Toggle sign-in / sign-up ── */}
              <p className="fu4 text-center text-sm" style={{ color:'#556677' }}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
                  className="font-bold transition-colors"
                  style={{ color:'#0097B2' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#00C8E0')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#0097B2')}
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>

            </div>
          </div>

          {/* ── Browse without signing in — PROMINENT ── */}
          <div className="fu5 mt-4">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                background:'white',
                border:'1.5px solid #00C8E0',
                color:'#0097B2',
                boxShadow:'0 2px 10px rgba(0,200,224,0.12)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#F0FAFE'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,200,224,0.22)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,200,224,0.12)'
              }}
            >
              Browse without signing in
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-center text-[10px] mt-5 tracking-widest uppercase" style={{ color:'#9AACCA' }}>
            © 2025 VybLiNe · Watch · Create · Publish
          </p>
        </div>
      </div>
    </>
  )
}
