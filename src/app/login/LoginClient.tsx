'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, Waves } from 'lucide-react'

const BUBBLES = [
  { id:1, cx:12,  cy:30,  r:260, blur:90,  dur:'26s', delay:'0s'   },
  { id:2, cx:80,  cy:70,  r:320, blur:110, dur:'32s', delay:'4s'   },
  { id:3, cx:50,  cy:15,  r:200, blur:70,  dur:'20s', delay:'8s'   },
  { id:4, cx:88,  cy:20,  r:240, blur:80,  dur:'28s', delay:'2s'   },
  { id:5, cx:25,  cy:80,  r:180, blur:60,  dur:'22s', delay:'6s'   },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{type:'error'|'success'; text:string}|null>(null)
  const [mouse, setMouse]       = useState({ x:0.5, y:0.5 })
  const [tilt, setTilt]         = useState({ x:0, y:0 })

  const supabase = createClient()

  const onPageMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
  }, [])

  const onCardMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = (e.clientX - rect.left) / rect.width  - 0.5
    const cy = (e.clientY - rect.top)  / rect.height - 0.5
    setTilt({ x: cy * -8, y: cx * 8 })
  }, [])

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
        /* ── Ocean bubble drift ── */
        @keyframes bubbleDrift1 { 0%,100%{transform:translate(0,0) scale(1)}   45%{transform:translate(40px,-35px) scale(1.06)} 75%{transform:translate(-25px,20px) scale(0.96)} }
        @keyframes bubbleDrift2 { 0%,100%{transform:translate(0,0) scale(1)}   38%{transform:translate(-50px,40px) scale(1.08)} 70%{transform:translate(30px,-15px) scale(0.93)} }
        @keyframes bubbleDrift3 { 0%,100%{transform:translate(0,0) scale(1)}   55%{transform:translate(35px,45px) scale(1.05)} }
        @keyframes bubbleDrift4 { 0%,100%{transform:translate(0,0) scale(1)}   32%{transform:translate(-38px,-30px) scale(1.07)} 68%{transform:translate(22px,16px) scale(0.94)} }
        @keyframes bubbleDrift5 { 0%,100%{transform:translate(0,0) scale(1)}   48%{transform:translate(25px,-42px) scale(1.06)} 74%{transform:translate(-18px,28px) scale(0.97)} }
        .sb-bubble-1{animation:bubbleDrift1 26s ease-in-out infinite}
        .sb-bubble-2{animation:bubbleDrift2 32s ease-in-out infinite;animation-delay:4s}
        .sb-bubble-3{animation:bubbleDrift3 20s ease-in-out infinite;animation-delay:8s}
        .sb-bubble-4{animation:bubbleDrift4 28s ease-in-out infinite;animation-delay:2s}
        .sb-bubble-5{animation:bubbleDrift5 22s ease-in-out infinite;animation-delay:6s}

        /* ── Card border shimmer ── */
        @keyframes goldShimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .sb-card-border {
          background: linear-gradient(135deg, #C9A84C, #1A2E52, #14B8A6, #1A2E52, #C9A84C);
          background-size: 300% 300%;
          animation: goldShimmer 6s ease infinite;
        }

        /* ── Card depth glow ── */
        @keyframes cardDepth {
          0%,100% { box-shadow: 0 0 50px rgba(201,168,76,0.2), 0 50px 100px rgba(6,15,30,0.8); }
          50%      { box-shadow: 0 0 70px rgba(20,184,166,0.18), 0 50px 100px rgba(6,15,30,0.8); }
        }
        .sb-card-glow { animation: cardDepth 6s ease-in-out infinite; }

        /* ── Wave animation ── */
        @keyframes waveFlow {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .sb-waves { animation: waveFlow 18s linear infinite; }

        /* ── Gold halo ── */
        @keyframes goldHalo {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.7; transform: scale(1.08); }
        }
        .sb-halo { animation: goldHalo 4s ease-in-out infinite; }

        /* ── Entrance animations ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fu1 { animation:fadeUp .65s .00s ease both; }
        .fu2 { animation:fadeUp .65s .15s ease both; }
        .fu3 { animation:fadeUp .65s .30s ease both; }
        .fu4 { animation:fadeUp .65s .45s ease both; }
      `}</style>

      <div
        className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
        onMouseMove={onPageMove}
      >
        {/* ── 1. Deep ocean base ── */}
        <div className="absolute inset-0 z-0"
          style={{ background:'linear-gradient(160deg, #060F1E 0%, #0A1628 35%, #0D1F3C 65%, #06111F 100%)' }} />

        {/* ── 2. Starfield / particle dots ── */}
        <div className="absolute inset-0 z-[1] pointer-events-none opacity-30"
          style={{
            backgroundImage: 'radial-gradient(1px 1px at 20% 15%, #C9A84C88 0%, transparent 100%), radial-gradient(1px 1px at 65% 35%, #14B8A666 0%, transparent 100%), radial-gradient(1px 1px at 45% 70%, #C9A84C55 0%, transparent 100%), radial-gradient(1px 1px at 80% 55%, #14B8A644 0%, transparent 100%), radial-gradient(1px 1px at 10% 85%, #C9A84C44 0%, transparent 100%)',
            backgroundSize: '100% 100%',
          }} />

        {/* ── 3. Teal / gold depth orbs ── */}
        {BUBBLES.map((b, i) => {
          const depth = [0.2, 0.35, 0.25, 0.45, 0.15][i]
          const color = i % 2 === 0 ? '#C9A84C' : '#14B8A6'
          const px = (mouse.x - 0.5) * depth * 70
          const py = (mouse.y - 0.5) * depth * 50
          return (
            <div
              key={b.id}
              className={`sb-bubble-${b.id} absolute z-[2] pointer-events-none rounded-full`}
              style={{
                left:`${b.cx}%`, top:`${b.cy}%`,
                width: b.r*2, height: b.r*2,
                marginLeft: -b.r, marginTop: -b.r,
                background:`radial-gradient(circle, ${color}44 0%, ${color}18 40%, transparent 70%)`,
                filter:`blur(${b.blur}px)`,
                transform:`translate(${px}px,${py}px)`,
                transition:'transform 0.3s ease-out',
                mixBlendMode:'screen',
              }}
            />
          )
        })}

        {/* ── 4. Animated wave band at bottom ── */}
        <div className="absolute bottom-0 left-0 right-0 z-[3] pointer-events-none overflow-hidden h-28 opacity-20">
          <svg className="sb-waves" viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ width:'200%', height:'100%' }}>
            <path d="M0 40 C240 10 480 70 720 40 C960 10 1200 70 1440 40 C1680 10 1920 70 2160 40 V80 H0 Z"
              fill="url(#waveGrad)" />
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#C9A84C" />
                <stop offset="50%"  stopColor="#14B8A6" />
                <stop offset="100%" stopColor="#C9A84C" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* ── 5. Subtle nautical grid texture ── */}
        <div className="absolute inset-0 z-[4] pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:'linear-gradient(rgba(201,168,76,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,1) 1px,transparent 1px)',
            backgroundSize:'60px 60px',
          }} />

        {/* ── 6. Vignette ── */}
        <div className="absolute inset-0 z-[5] pointer-events-none"
          style={{ background:'radial-gradient(ellipse at center, transparent 35%, rgba(6,15,30,0.7) 100%)' }} />

        {/* ═══════════════ LOGIN CARD ═══════════════ */}
        <div
          className="relative z-10 w-full max-w-[400px]"
          onMouseMove={onCardMove}
          onMouseLeave={() => setTilt({ x:0, y:0 })}
          style={{
            transform:`perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition:'transform 0.3s ease-out',
          }}
        >
          {/* Animated gold border */}
          <div className="sb-card-border relative rounded-[28px] p-[1.5px]">
            {/* Card surface */}
            <div
              className="sb-card-glow relative rounded-[26px] px-8 py-9 overflow-hidden"
              style={{
                background:'rgba(6,15,30,0.78)',
                backdropFilter:'blur(40px)',
                WebkitBackdropFilter:'blur(40px)',
              }}
            >
              {/* Top highlight line */}
              <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{ background:'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)' }} />
              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-1/4 right-1/4 h-px pointer-events-none"
                style={{ background:'linear-gradient(90deg, transparent, rgba(20,184,166,0.3), transparent)' }} />

              {/* ── Logo / Brand ── */}
              <div className="fu1 flex flex-col items-center mb-8">
                {/* Gold halo */}
                <div className="sb-halo absolute w-28 h-28 rounded-full pointer-events-none"
                  style={{ background:'radial-gradient(circle, rgba(201,168,76,0.3) 0%, rgba(20,184,166,0.15) 55%, transparent 70%)', filter:'blur(18px)' }} />
                {/* Icon mark */}
                <div className="relative w-16 h-16 rounded-full flex items-center justify-center mb-3 z-10"
                  style={{ background:'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(20,184,166,0.1) 100%)', border:'1px solid rgba(201,168,76,0.35)' }}>
                  <Waves className="w-7 h-7" style={{ color:'#C9A84C' }} />
                </div>
                <h1 className="sb-heading text-white text-2xl font-bold tracking-wide z-10">
                  VideoForge
                </h1>
                <p style={{ color:'rgba(201,168,76,0.55)', fontSize:'9px', letterSpacing:'0.5em', textTransform:'uppercase', marginTop:'4px' }}>
                  Create · Edit · Publish
                </p>
              </div>

              {/* ── Heading ── */}
              <div className="fu2 mb-7 text-center">
                <h2 className="sb-heading text-xl font-semibold text-white mb-1">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'13px' }}>
                  {isSignUp ? 'Join your creative studio.' : 'Sign in to your studio.'}
                </p>
              </div>

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} className="fu3 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
                    style={{ color:'rgba(201,168,76,0.6)' }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color:'rgba(201,168,76,0.4)' }} />
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                      required placeholder="you@example.com" className="sb-input" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
                    style={{ color:'rgba(201,168,76,0.6)' }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color:'rgba(201,168,76,0.4)' }} />
                    <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                      required placeholder="••••••••" className="sb-input" />
                  </div>
                </div>

                {message && (
                  <div className={`text-sm px-4 py-3 rounded-xl ${
                    message.type==='error'
                      ? 'bg-red-500/10 border border-red-500/25 text-red-300'
                      : 'border text-emerald-300'
                  }`}
                  style={message.type==='success' ? { borderColor:'rgba(20,184,166,0.3)', background:'rgba(20,184,166,0.08)' } : {}}>
                    {message.text}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="sb-btn-primary w-full py-3.5 rounded-xl flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              {/* ── Divider ── */}
              <div className="fu4 flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background:'rgba(201,168,76,0.12)' }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ color:'rgba(255,255,255,0.35)' }}>or</span>
                <div className="flex-1 h-px" style={{ background:'rgba(201,168,76,0.12)' }} />
              </div>

              {/* ── Toggle ── */}
              <p className="fu4 text-center text-sm" style={{ color:'rgba(255,255,255,0.5)' }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
                  className="font-semibold transition-colors"
                  style={{ color:'#C9A84C' }}
                  onMouseEnter={e=>(e.currentTarget.style.color='#E8C86A')}
                  onMouseLeave={e=>(e.currentTarget.style.color='#C9A84C')}
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>

            </div>{/* /card surface */}
          </div>{/* /border wrapper */}

          <p className="text-center text-[9px] mt-5 tracking-[0.4em] uppercase"
            style={{ color:'rgba(201,168,76,0.2)' }}>
            © 2025 VideoForge · Short-form Content Studio
          </p>

        </div>{/* /card outer */}
      </div>
    </>
  )
}
