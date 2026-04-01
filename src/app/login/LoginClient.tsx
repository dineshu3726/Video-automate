'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2 } from 'lucide-react'
import Image from 'next/image'

/* ── Aurora orbs: large soft blobs that drift + react to mouse ── */
const ORBS = [
  { id:1, cx:18,  cy:22,  size:620, color:'#7c3aed', blur:120, depth:0.25, dur:'22s', delay:'0s'   },
  { id:2, cx:75,  cy:65,  size:720, color:'#e91e8c', blur:140, depth:0.40, dur:'28s', delay:'5s'   },
  { id:3, cx:55,  cy:85,  size:560, color:'#ff5c35', blur:110, depth:0.30, dur:'19s', delay:'2s'   },
  { id:4, cx:82,  cy:18,  size:580, color:'#c084fc', blur:130, depth:0.50, dur:'24s', delay:'8s'   },
  { id:5, cx:30,  cy:55,  size:480, color:'#9333ea', blur:100, depth:0.20, dur:'32s', delay:'3.5s' },
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
    setTilt({ x: cy * -11, y: cx * 11 })
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
        /* ── Aurora orb drift ── */
        @keyframes orbDrift1 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(55px,-40px) scale(1.08)} 70%{transform:translate(-30px,25px) scale(0.94)} }
        @keyframes orbDrift2 { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(-65px,45px) scale(1.1)} 68%{transform:translate(35px,-20px) scale(0.91)} }
        @keyframes orbDrift3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,55px) scale(1.06)} }
        @keyframes orbDrift4 { 0%,100%{transform:translate(0,0) scale(1)} 30%{transform:translate(-45px,-35px) scale(1.09)} 65%{transform:translate(28px,18px) scale(0.95)} }
        @keyframes orbDrift5 { 0%,100%{transform:translate(0,0) scale(1)} 45%{transform:translate(30px,-50px) scale(1.07)} 72%{transform:translate(-20px,30px) scale(0.97)} }
        .orb-1{animation:orbDrift1 22s ease-in-out infinite}
        .orb-2{animation:orbDrift2 28s ease-in-out infinite;animation-delay:5s}
        .orb-3{animation:orbDrift3 19s ease-in-out infinite;animation-delay:2s}
        .orb-4{animation:orbDrift4 24s ease-in-out infinite;animation-delay:8s}
        .orb-5{animation:orbDrift5 32s ease-in-out infinite;animation-delay:3.5s}

        /* ── Chromatic ring on card ── */
        @keyframes ringRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .card-ring {
          animation: ringRotate 6s linear infinite;
        }

        /* ── Pulsing glow on card ── */
        @keyframes cardGlow {
          0%,100% { box-shadow: 0 0 40px rgba(124,58,237,0.35), 0 40px 80px rgba(0,0,0,0.55); }
          33%      { box-shadow: 0 0 50px rgba(233,30,140,0.4),  0 40px 80px rgba(0,0,0,0.55); }
          66%      { box-shadow: 0 0 45px rgba(192,132,252,0.35),0 40px 80px rgba(0,0,0,0.55); }
        }
        .card-glow { animation: cardGlow 5s ease-in-out infinite; }

        /* ── Logo halo pulse ── */
        @keyframes logoHalo {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.06); }
        }
        .logo-halo { animation: logoHalo 3.5s ease-in-out infinite; }

        /* ── Inputs ── */
        .vy-input {
          width:100%; background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.12); border-radius:14px;
          padding:12px 14px 12px 40px; color:white; font-size:14px; outline:none;
          transition:border-color .2s, box-shadow .2s, background .2s;
        }
        .vy-input::placeholder { color:rgba(255,255,255,0.24); }
        .vy-input:focus {
          background:rgba(255,255,255,0.09);
          border-color:rgba(233,30,140,.6);
          box-shadow:0 0 0 3px rgba(233,30,140,.13);
        }

        /* ── Button ── */
        .vy-btn {
          width:100%; padding:14px; border-radius:14px;
          background:linear-gradient(135deg,#E91E8C 0%,#7C3AED 100%);
          box-shadow:0 8px 30px rgba(233,30,140,.4);
          color:white; font-weight:800; font-size:14px; letter-spacing:0.03em;
          display:flex; align-items:center; justify-content:center; gap:8px;
          cursor:pointer; border:none; transition:box-shadow .25s, transform .15s;
        }
        .vy-btn:hover:not(:disabled) { box-shadow:0 14px 44px rgba(233,30,140,.62); transform:translateY(-1px); }
        .vy-btn:active:not(:disabled){ transform:scale(.98); }
        .vy-btn:disabled { opacity:.5; cursor:not-allowed; }

        /* ── Entrance ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fu1 { animation:fadeUp .7s .0s  ease both; }
        .fu2 { animation:fadeUp .7s .18s ease both; }
        .fu3 { animation:fadeUp .7s .34s ease both; }
        .fu4 { animation:fadeUp .7s .48s ease both; }

        /* ── Noise grain ── */
        .grain::after {
          content:''; position:absolute; inset:0; pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.035'/%3E%3C/svg%3E");
          opacity:.5; mix-blend-mode:overlay;
        }
      `}</style>

      {/* ═══════════════════════════ PAGE ═══════════════════════════ */}
      <div
        className="grain min-h-screen relative overflow-hidden flex items-center justify-center p-4"
        onMouseMove={onPageMove}
      >

        {/* ── 1. Holographic photo background ── */}
        <div className="absolute inset-0 z-0"
          style={{ backgroundImage:"url('/vybline-bg.webp')", backgroundSize:'cover', backgroundPosition:'center' }} />

        {/* ── 2. Dark base tint ── */}
        <div className="absolute inset-0 z-[1]"
          style={{ background:'rgba(8,2,24,0.48)' }} />

        {/* ── 3. Aurora colour orbs (mouse-reactive parallax) ── */}
        {ORBS.map((o, i) => {
          const px = (mouse.x - 0.5) * o.depth * 80
          const py = (mouse.y - 0.5) * o.depth * 55
          return (
            <div
              key={o.id}
              className={`orb-${o.id} absolute z-[2] pointer-events-none rounded-full`}
              style={{
                left:`${o.cx}%`, top:`${o.cy}%`,
                width: o.size, height: o.size,
                marginLeft: -o.size/2, marginTop: -o.size/2,
                background:`radial-gradient(circle, ${o.color}55 0%, ${o.color}22 40%, transparent 70%)`,
                filter:`blur(${o.blur}px)`,
                transform:`translate(${px}px,${py}px)`,
                transition:'transform 0.25s ease-out',
                mixBlendMode:'screen',
              }}
            />
          )
        })}

        {/* ── 4. Mouse spotlight ── */}
        <div
          className="absolute z-[3] pointer-events-none rounded-full"
          style={{
            width: 600, height: 600,
            left: `${mouse.x * 100}%`, top: `${mouse.y * 100}%`,
            marginLeft: -300, marginTop: -300,
            background:'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
            transition:'left 0.12s ease-out, top 0.12s ease-out',
          }}
        />

        {/* ── 5. Vignette ── */}
        <div className="absolute inset-0 z-[4] pointer-events-none"
          style={{ background:'radial-gradient(ellipse at center,transparent 30%,rgba(4,1,14,0.75) 100%)' }} />

        {/* ── 6. Thin chromatic grid lines (artistic texture) ── */}
        <div className="absolute inset-0 z-[4] pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
            backgroundSize:'80px 80px',
          }} />


        {/* ═════════ LOGIN CARD ═════════ */}
        <div
          className="relative z-10 w-full max-w-[400px]"
          onMouseMove={onCardMove}
          onMouseLeave={() => setTilt({ x:0, y:0 })}
          style={{
            transform:`perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition:'transform 0.28s ease-out',
          }}
        >

          {/* Animated gradient border wrapper */}
          <div className="relative rounded-[30px] p-[1.5px]"
            style={{ background:'linear-gradient(135deg,#7c3aed,#e91e8c,#ff8c42,#c084fc,#7c3aed)', backgroundSize:'300% 300%' }}>

            {/* Rotating ring glow layer (sits under card content) */}
            <div className="card-ring absolute -inset-[3px] rounded-[32px] opacity-40 pointer-events-none"
              style={{
                background:'conic-gradient(from 0deg,#7c3aed,#e91e8c,#ff8c42,#c084fc,#7c3aed)',
                filter:'blur(12px)',
              }} />

            {/* Card surface */}
            <div
              className="card-glow relative rounded-[28px] px-8 py-9 overflow-hidden"
              style={{
                background:'rgba(9,3,26,0.72)',
                backdropFilter:'blur(36px)',
                WebkitBackdropFilter:'blur(36px)',
              }}
            >

              {/* Inner top highlight */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)' }} />
              {/* Inner bottom soft glow */}
              <div className="absolute bottom-0 left-1/4 right-1/4 h-px"
                style={{ background:'linear-gradient(90deg,transparent,rgba(233,30,140,0.3),transparent)' }} />

              {/* ── Logo ── */}
              <div className="fu1 relative flex flex-col items-center mb-7">
                {/* Glow halo behind logo */}
                <div className="logo-halo absolute w-32 h-32 rounded-full pointer-events-none"
                  style={{ background:'radial-gradient(circle,rgba(233,30,140,0.35) 0%,rgba(124,58,237,0.2) 50%,transparent 70%)', filter:'blur(20px)' }} />
                <div className="relative w-36 h-36 z-10" style={{ mixBlendMode:'screen' }}>
                  <Image src="/vybline-logo.png" alt="Vybline" fill className="object-contain" priority />
                </div>
                <p className="text-white/38 text-[9.5px] tracking-[0.45em] uppercase font-semibold mt-[-4px]">
                  Create · Mix · Publish
                </p>
              </div>

              {/* ── Heading ── */}
              <div className="fu2 mb-6 text-center">
                <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
                  {isSignUp ? 'Get started' : 'Welcome back'}
                </h2>
                <p style={{ color:'rgba(255,255,255,0.36)', fontSize:'13.5px' }}>
                  {isSignUp ? 'Create your Vybline account.' : 'Sign in to your studio.'}
                </p>
              </div>

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} className="fu3 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
                    style={{ color:'rgba(255,255,255,0.36)' }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color:'rgba(255,255,255,0.3)' }} />
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                      required placeholder="you@example.com" className="vy-input" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
                    style={{ color:'rgba(255,255,255,0.36)' }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color:'rgba(255,255,255,0.3)' }} />
                    <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                      required placeholder="••••••••" className="vy-input" />
                  </div>
                </div>

                {message && (
                  <div className={`text-sm px-4 py-3 rounded-xl ${
                    message.type==='error'
                      ? 'bg-red-500/10 border border-red-500/25 text-red-300'
                      : 'bg-green-500/10 border border-green-500/25 text-green-300'
                  }`}>{message.text}</div>
                )}

                <button type="submit" disabled={loading} className="vy-btn">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              {/* ── Divider ── */}
              <div className="fu4 flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.07)' }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ color:'rgba(255,255,255,0.22)' }}>or</span>
                <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.07)' }} />
              </div>

              {/* ── Toggle ── */}
              <p className="fu4 text-center text-sm" style={{ color:'rgba(255,255,255,0.32)' }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
                  className="font-bold transition-colors"
                  style={{ color:'#E91E8C' }}
                  onMouseEnter={e=>(e.currentTarget.style.color='#ff4dac')}
                  onMouseLeave={e=>(e.currentTarget.style.color='#E91E8C')}
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>

            </div>{/* /card surface */}
          </div>{/* /border wrapper */}

          <p className="text-center text-[10px] mt-5 tracking-widest uppercase"
            style={{ color:'rgba(255,255,255,0.14)' }}>
            © 2025 Vybline · Short-form Content Engine
          </p>

        </div>{/* /card outer */}

      </div>
    </>
  )
}
