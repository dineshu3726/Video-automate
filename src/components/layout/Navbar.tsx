'use client'
import { User } from '@supabase/supabase-js'
import { LogOut, Settings, Tv, Download, Clapperboard } from 'lucide-react'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { VybLiNeIcon } from '@/components/VybLineLogo'

export type AppTab = 'feed' | 'downloader' | 'studio'

const TABS: { id: AppTab; label: string; icon: React.ReactNode }[] = [
  { id: 'feed',       label: 'My Feed',    icon: <Tv className="w-4 h-4" /> },
  { id: 'downloader', label: 'Downloader', icon: <Download className="w-4 h-4" /> },
  { id: 'studio',     label: 'Studio',     icon: <Clapperboard className="w-4 h-4" /> },
]

interface Props {
  user: User
  activeTab: AppTab
  onTabChange: (t: AppTab) => void
}

export default function Navbar({ user, activeTab, onTabChange }: Props) {
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="sb-wave-border sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <VybLiNeIcon size={28} />
          <span className="sb-heading text-text font-bold text-sm hidden sm:block">
            <span style={{ color:'#00C8E0' }}>Vyb</span>LiNe
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex-1 flex items-center justify-center gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition`}
              style={activeTab === t.id ? {
                background:'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(20,184,166,0.08) 100%)',
                border:'1px solid rgba(201,168,76,0.25)',
                color:'var(--color-primary)',
              } : {
                color:'var(--color-muted)',
              }}
              onMouseEnter={e => { if (activeTab !== t.id) e.currentTarget.style.color = 'var(--color-text)' }}
              onMouseLeave={e => { if (activeTab !== t.id) e.currentTarget.style.color = 'var(--color-muted)' }}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />
          <Link
            href="/dashboard/settings"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border text-muted hover:text-text hover:bg-surface2 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={signOut}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border text-muted hover:text-red-400 hover:bg-surface2 transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background:'linear-gradient(135deg, #0097B2 0%, #00C8E0 100%)', color:'#fff' }}>
            {user.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
