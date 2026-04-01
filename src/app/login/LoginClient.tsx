'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, Play } from 'lucide-react'
import Image from 'next/image'

/* ─── Reel cards: position (%), rotation, float timing, parallax depth, gradient ─── */
const REELS = [
  { id:1,  x:4,  y:6,  r:-13, delay:'0s',   dur:'18s', depth:0.9, g:'linear-gradient(160deg,#7c3aed,#e91e8c)' },
  { id:2,  x:79, y:4,  r: 11, delay:'3s',   dur:'22s', depth:0.5, g:'linear-gradient(160deg,#e91e8c,#ff6b35)' },
  { id:3,  x:88, y:50, r:  9, delay:'1.5s', dur:'20s', depth:0.85,g:'linear-gradient(160deg,#4a0e9e,#c2185b)' },
  { id:4,  x:1,  y:57, r: -9, delay:'4s',   dur:'25s', depth:0.6, g:'linear-gradient(160deg,#c2185b,#7c3aed)' },
  { id:5,  x:63, y:77, r: 15, delay:'2s',   dur:'19s', depth:0.75,g:'linear-gradient(160deg,#ff6b35,#e91e8c)' },
  { id:6,  x:17, y:80, r: -7, delay:'5.5s', dur:'23s', depth:0.4, g:'linear-gradient(160deg,#7c3aed,#4a0e9e)' },
  { id:7,  x:44, y:1,  r:  6, delay:'0.8s', dur:'21s', depth:0.65,g:'linear-gradient(160deg,#e91e8c,#7c3aed)' },
  { id:8,  x:72, y:28, r:-16, delay:'2.5s', dur:'17s', depth:0.8, g:'linear-gradient(160deg,#7c3aed,#ff6b35)' },
  { id:9,  x:28, y:38, r: 10, delay:'6s',   dur:'24s', depth:0.3, g:'linear-gradient(160deg,#e91e8c,#4a0e9e)' },
]

const TICKER_WORDS = 'CREATE · MIX · PUBLISH · SHORTS · REELS · STUDIO · AI · VYBLINE · VIRAL · AUTOMATE · TRENDING · CONTENT · '

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{type:'error'|'success'; text:string}|null>(null)
  const [mouse, setMouse]       = useState({ x: 0.5, y: 0.5 })
  const [tilt, setTilt]         = useState({ x: 0, y: 0 })
  const supabase = createClient()

  const handlePageMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
  }, [])

  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = (e.clientX - rect.left) / rect.width  - 0.5   // -0.5 → +0.5
    const cy = (e.clientY - rect.top)  / rect.height - 0.5
    setTilt({ x: cy * -12, y: cx * 12 })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
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
        /* ── Reel float (inner wrapper – only Y movement) ── */
        @keyframes reelFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-15px); }
        }
        .reel-inner {
          animation: reelFloat var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }

        /* ── Background text ticker ── */
        @keyframes tickerLeft {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes tickerRight {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
        .ticker-l { animation: tickerLeft  28s linear infinite; white-space:nowrap; display:inline-block; }
        .ticker-r { animation: tickerRight 34s linear infinite; white-space:nowrap; display:inline-block; }

        /* ── Inputs ── */
        .vy-input {
          width:100%;
          background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.13);
          border-radius:14px;
          padding:12px 14px 12px 40px;
          color:white; font-size:14px; outline:none;
          transition:border-color .2s, box-shadow .2s;
        }
        .vy-input::placeholder { color:rgba(255,255,255,0.26); }
        .vy-input:focus {
          border-color:rgba(233,30,140,.65);
          box-shadow:0 0 0 3px rgba(233,30,140,.14);
        }

        /* ── Submit button ── */
        .vy-btn {
          width:100%; padding:14px; border-radius:14px;
          background:linear-gradient(135deg,#E91E8C 0%,#7C3AED 100%);
          box-shadow:0 8px 32px rgba(233,30,140,.35);
          color:white; font-weight:800; font-size:14px;
          display:flex; align-items:center; justify-content:center; gap:8px;
          cursor:pointer; border:none;
          transition:box-shadow .2s, transform .15s;
        }
        .vy-btn:hover:not(:disabled) {
          box-shadow:0 14px 44px rgba(233,30,140,.6);
          transform:translateY(-1px);
        }
        .vy-btn:active:not(:disabled) { transform:scale(.98); }
        .vy-btn:disabled { opacity:.5; cursor:not-allowed; }

        /* ── Entrance animations ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fu1 { animation:fadeUp .65s .05s ease both; }
        .fu2 { animation:fadeUp .65s .2s  ease both; }
        .fu3 { animation:fadeUp .65s .35s ease both; }
      `}</style>

      {/* ═══════════════════ FULL PAGE ═══════════════════ */}
      <div
        className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
        onMouseMove={handlePageMouseMove}
      >

        {/* ── Holographic background ── */}
        <div className="absolute inset-0 z-0"
          style={{ backgroundImage:"url('/vybline-bg.webp')", backgroundSize:'cover', backgroundPosition:'center' }} />

        {/* ── Dark tint ── */}
        <div className="absolute inset-0 z-0" style={{ background:'rgba(12,3,36,0.52)' }} />

        {/* ── Vignette ── */}
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{ background:'radial-gradient(ellipse at center,transparent 35%,rgba(6,1,20,0.72) 100%)' }} />


        {/* ══════ BACKGROUND TEXT TICKERS ══════ */}

        {/* Row 1 — across middle */}
        <div className="absolute z-[1] pointer-events-none overflow-hidden"
          style={{ top:'38%', left:0, right:0 }}>
          <div className="ticker-l">
            <span className="font-black uppercase select-none"
              style={{ fontSize:'clamp(72px,10vw,148px)', letterSpacing:'-0.02em', color:'rgba(255,255,255,0.04)', lineHeight:1 }}>
              {TICKER_WORDS}{TICKER_WORDS}
            </span>
          </div>
        </div>

        {/* Row 2 — lower, reverse */}
        <div className="absolute z-[1] pointer-events-none overflow-hidden"
          style={{ top:'62%', left:0, right:0 }}>
          <div className="ticker-r">
            <span className="font-black uppercase select-none"
              style={{ fontSize:'clamp(52px,7.5vw,110px)', letterSpacing:'-0.02em', color:'rgba(255,255,255,0.03)', lineHeight:1 }}>
              {TICKER_WORDS}{TICKER_WORDS}
            </span>
          </div>
        </div>


        {/* ══════ FLOATING REEL CARDS ══════ */}
        {REELS.map(r => {
          /* parallax offset per card based on depth */
          const px = (mouse.x - 0.5) * r.depth * 60
          const py = (mouse.y - 0.5) * r.depth * 40
          return (
            <div
              key={r.id}
              className="absolute z-10 pointer-events-none select-none"
              style={{
                left:`${r.x}%`, top:`${r.y}%`,
                /* outer: rotation + parallax, smooth on mouse move */
                transform:`rotate(${r.r}deg) translate(${px}px,${py}px)`,
                transition:'transform 0.18s ease-out',
              }}
            >
              {/* inner: float up/down animation */}
              <div
                className="reel-inner"
                style={{ '--dur':r.dur, '--delay':r.delay } as React.CSSProperties}
              >
                <div className="relative w-[66px] h-[118px] rounded-[13px] overflow-hidden"
                  style={{
                    background:r.g,
                    border:'1.5px solid rgba(255,255,255,0.2)',
                    boxShadow:'0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22)',
                  }}>
                  {/* sheen */}
                  <div className="absolute inset-0"
                    style={{ background:'linear-gradient(175deg,rgba(255,255,255,0.18) 0%,transparent 50%)' }} />
                  {/* play btn */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center"
                      style={{ background:'rgba(255,255,255,0.26)', backdropFilter:'blur(4px)' }}>
                      <Play className="w-[10px] h-[10px] text-white fill-white ml-px" />
                    </div>
                  </div>
                  {/* bottom bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-8"
                    style={{ background:'linear-gradient(0deg,rgba(0,0,0,0.4),transparent)' }} />
                  {/* notch */}
                  <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full"
                    style={{ background:'rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            </div>
          )
        })}


        {/* ══════ LOGIN CARD (3-D tilt on hover) ══════ */}
        <div
          className="relative z-20 w-full max-w-[390px]"
          onMouseMove={handleCardMouseMove}
          onMouseLeave={() => setTilt({ x:0, y:0 })}
          style={{
            transform:`perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition:'transform 0.25s ease-out',
          }}
        >
          <div
            className="rounded-[28px] px-8 py-9"
            style={{
              background:'rgba(10,3,28,0.58)',
              backdropFilter:'blur(32px)',
              WebkitBackdropFilter:'blur(32px)',
              border:'1px solid rgba(255,255,255,0.14)',
              boxShadow:'0 40px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >

            {/* ── Logo (PNG, white bg removed via screen blend) ── */}
            <div className="fu1 flex flex-col items-center mb-7">
              <div className="relative w-36 h-36" style={{ mixBlendMode:'screen' }}>
                <Image
                  src="/vybline-logo.png"
                  alt="Vybline"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-white/40 text-[10px] tracking-[0.42em] uppercase font-semibold" style={{ marginTop:'-6px' }}>
                Create · Mix · Publish
              </p>
            </div>

            {/* ── Heading ── */}
            <div className="fu2 mb-6 text-center">
              <h2 className="text-[22px] font-black text-white mb-1">
                {isSignUp ? 'Get started' : 'Welcome back'}
              </h2>
              <p className="text-white/38 text-sm">
                {isSignUp ? 'Create your Vybline account.' : 'Sign in to your studio.'}
              </p>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="fu3 space-y-4">

              <div>
                <label className="text-[10px] text-white/38 mb-1.5 block uppercase tracking-widest font-semibold">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/32 pointer-events-none" />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="you@example.com" className="vy-input"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/38 mb-1.5 block uppercase tracking-widest font-semibold">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/32 pointer-events-none" />
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••" className="vy-input"
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
              <span className="text-white/24 text-[10px] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.08)' }} />
            </div>

            {/* ── Toggle ── */}
            <p className="text-center text-sm text-white/34">
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

          <p className="text-center text-[10px] mt-5 tracking-widest uppercase" style={{ color:'rgba(255,255,255,0.15)' }}>
            © 2025 Vybline · Short-form Content Engine
          </p>
        </div>

      </div>
    </>
  )
}
