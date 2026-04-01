'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, Play } from 'lucide-react'

/* ─── Floating reel cards ─── */
const REELS = [
  { id:1, x:'4%',  y:'6%',  rotate:-12, delay:'0s',   dur:'18s', g:'linear-gradient(160deg,#7c3aed,#e91e8c)', label:'Trending' },
  { id:2, x:'80%', y:'4%',  rotate: 10, delay:'3s',   dur:'22s', g:'linear-gradient(160deg,#e91e8c,#ff6b35)', label:'Go Viral' },
  { id:3, x:'88%', y:'54%', rotate:  8, delay:'1.5s', dur:'20s', g:'linear-gradient(160deg,#4a0e9e,#e91e8c)', label:'AI Studio' },
  { id:4, x:'1%',  y:'60%', rotate: -8, delay:'4s',   dur:'25s', g:'linear-gradient(160deg,#c2185b,#7c3aed)', label:'Shorts' },
  { id:5, x:'62%', y:'76%', rotate: 14, delay:'2s',   dur:'19s', g:'linear-gradient(160deg,#ff6b35,#c2185b)', label:'Publish' },
  { id:6, x:'18%', y:'82%', rotate: -6, delay:'5.5s', dur:'23s', g:'linear-gradient(160deg,#7c3aed,#4a0e9e)', label:'Create' },
  { id:7, x:'44%', y:'2%',  rotate:  5, delay:'0.8s', dur:'21s', g:'linear-gradient(160deg,#e91e8c,#7c3aed)', label:'Auto-Post' },
]

/* ─── Ornate V SVG (single swirl, matching reference) ─── */
function VyblineMark() {
  return (
    <svg viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-28 h-28 drop-shadow-2xl">
      <defs>
        <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#c084fc"/>
          <stop offset="55%"  stopColor="#e91e8c"/>
          <stop offset="100%" stopColor="#fb923c"/>
        </linearGradient>
      </defs>

      {/* ── Left top serif bar ── */}
      <line x1="4"  y1="22" x2="46" y2="22" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>

      {/* ── Left arm of V ── */}
      <line x1="24" y1="22" x2="100" y2="220" stroke="white" strokeWidth="5.5" strokeLinecap="round"/>

      {/* ── Right top serif bar ── */}
      <line x1="154" y1="22" x2="196" y2="22" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>

      {/* ── Right arm of V (plain, no swirl) ── */}
      <line x1="176" y1="22" x2="100" y2="220" stroke="white" strokeWidth="5.5" strokeLinecap="round"/>

      {/* ════ THE SINGLE SWIRL ════
          Starts from ~mid-left arm, loops counter-clockwise outward,
          spirals back into a tight inner curl — matching the reference */}

      {/* Outer sweep: from arm outward → up-left → over the top → down-right → back inward */}
      <path
        d="M 44,92
           C 26,80  4,60  8,36
           C 12,12  40,6  60,22
           C 80,38  76,64  58,74
           C 44,82  34,72  38,60
           C 42,50  56,50  58,62"
        stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none"/>

      {/* Inner decorative stem — the vertical feather inside the swirl */}
      <path
        d="M 46,90
           C 42,102 40,116 46,126
           C 50,133 46,142 40,148"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>

      {/* Arrow tip at base of feather (the two small angled lines) */}
      <path d="M 40,148 L 46,139" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M 40,148 L 34,139" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>

      {/* Small leaf at the mid-feather */}
      <path
        d="M 44,110 C 38,106 34,112 40,116"
        stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>

      {/* ── Bottom point tiny curl ── */}
      <path
        d="M 98,220 C 93,229 100,235 107,229 C 112,223 107,220"
        stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{ type:'error'|'success'; text:string } | null>(null)

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
        @keyframes reel-float {
          0%,100% { transform:var(--r) translateY(0px); }
          50%      { transform:var(--r) translateY(-16px); }
        }
        .reel-card { animation:reel-float var(--dur) ease-in-out infinite; animation-delay:var(--delay); }

        @keyframes card-float {
          0%,100% { transform:translateY(0px); }
          50%      { transform:translateY(-10px); }
        }
        .login-float { animation:card-float 6s ease-in-out infinite; }

        .vy-input {
          width:100%;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.14);
          border-radius:14px;
          padding:12px 14px 12px 40px;
          color:white;
          font-size:14px;
          outline:none;
          transition:border-color .2s,box-shadow .2s;
        }
        .vy-input::placeholder { color:rgba(255,255,255,0.28); }
        .vy-input:focus {
          border-color:rgba(233,30,140,.7);
          box-shadow:0 0 0 3px rgba(233,30,140,.15);
        }
        .vy-btn {
          width:100%;
          padding:14px;
          border-radius:14px;
          background:linear-gradient(135deg,#E91E8C 0%,#7C3AED 100%);
          box-shadow:0 8px 32px rgba(233,30,140,.35);
          color:white; font-weight:800; font-size:14px;
          display:flex; align-items:center; justify-content:center; gap:8px;
          cursor:pointer; border:none;
          transition:box-shadow .2s,transform .15s;
        }
        .vy-btn:hover:not(:disabled){ box-shadow:0 14px 44px rgba(233,30,140,.55); transform:translateY(-1px); }
        .vy-btn:active:not(:disabled){ transform:scale(.98); }
        .vy-btn:disabled { opacity:.5; cursor:not-allowed; }
      `}</style>

      {/* ═══ PAGE WRAPPER ═══ */}
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">

        {/* ── Full-screen background image ── */}
        <div className="absolute inset-0 z-0"
          style={{
            backgroundImage:"url('/vybline-bg.webp')",
            backgroundSize:'cover',
            backgroundPosition:'center',
          }} />

        {/* ── Dark tint overlay for contrast ── */}
        <div className="absolute inset-0 z-0"
          style={{ background:'rgba(20,4,50,0.45)' }} />

        {/* ── Subtle vignette ── */}
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{ background:'radial-gradient(ellipse at center,transparent 50%,rgba(10,2,30,0.55) 100%)' }} />

        {/* ══════ FLOATING REEL CARDS ══════ */}
        {REELS.map(r => (
          <div key={r.id}
            className="reel-card absolute pointer-events-none select-none z-10"
            style={{
              left:r.x, top:r.y,
              '--r':`rotate(${r.rotate}deg)`,
              '--dur':r.dur,
              '--delay':r.delay,
            } as React.CSSProperties}>
            <div className="relative w-[68px] h-[120px] rounded-[14px] overflow-hidden"
              style={{
                background:r.g,
                border:'1.5px solid rgba(255,255,255,0.22)',
                boxShadow:'0 14px 44px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}>
              <div className="absolute inset-0"
                style={{ background:'linear-gradient(180deg,rgba(255,255,255,0.15) 0%,transparent 45%)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.28)', backdropFilter:'blur(4px)' }}>
                  <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="text-white/70 font-semibold" style={{ fontSize:'6.5px', letterSpacing:'0.05em' }}>
                  {r.label}
                </span>
              </div>
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-7 h-[3px] rounded-full"
                style={{ background:'rgba(0,0,0,0.22)' }} />
            </div>
          </div>
        ))}

        {/* ══════ LOGIN CARD ══════ */}
        <div className="login-float relative z-20 w-full max-w-[390px]">
          <div className="rounded-[28px] px-8 py-9"
            style={{
              background:'rgba(12,4,32,0.52)',
              backdropFilter:'blur(30px)',
              WebkitBackdropFilter:'blur(30px)',
              border:'1px solid rgba(255,255,255,0.15)',
              boxShadow:'0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}>

            {/* ── Logo: inline SVG V + wordmark ── */}
            <div className="flex flex-col items-center mb-7">
              <VyblineMark />
              <div className="flex items-baseline gap-[2px] -mt-1">
                <span className="text-2xl font-black text-white tracking-tight" style={{ fontStyle:'italic' }}>
                  Vyb
                </span>
                <span className="text-2xl font-black tracking-tight"
                  style={{ background:'linear-gradient(135deg,#c084fc,#e91e8c)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  Line
                </span>
              </div>
              <p className="text-white/40 text-[10px] tracking-[0.38em] uppercase font-medium mt-1">
                Create · Mix · Publish
              </p>
            </div>

            {/* ── Heading ── */}
            <div className="mb-6 text-center">
              <h2 className="text-[22px] font-black text-white mb-1">
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
                  <input type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    required placeholder="you@example.com" className="vy-input" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/40 mb-1.5 block uppercase tracking-widest font-semibold">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                  <input type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••" className="vy-input" />
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

            {/* ── Toggle ── */}
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

          <p className="text-center text-white/18 text-[10px] mt-5 tracking-widest uppercase">
            © 2025 Vybline · Short-form Content Engine
          </p>
        </div>

      </div>
    </>
  )
}
