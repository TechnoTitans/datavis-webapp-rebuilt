// src/pages/TopBar.jsx
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useOfflineSync } from '../hooks/useOfflineSync'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Loader2 } from 'lucide-react'

function Layout({ children }) {
  const { isOnline, pendingCount, syncing, syncNow } = useOfflineSync()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { to: '/team-data', label: 'Team Data' },
    { to: '/compare', label: 'Compare' },
    { to: '/team-analysis', label: 'Team Analysis' },
    { to: '/auto-paths', label: 'Auto Paths' },
    { to: '/match-strategy', label: 'Match Strategy' },
    { to: '/rankings', label: 'Rankings' },
    { to: '/picklist', label: 'Picklist' },
    { to: '/upload', label: 'Upload' },
    { to: '/settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-6 py-4">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-4">
            <NavLink
              to="/"
              onClick={() => setMenuOpen(false)}
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              DataVis
            </NavLink>

            <nav className="no-scrollbar hidden min-w-0 items-center gap-1 overflow-x-auto md:flex">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    [
                      'whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-medium transition-colors',
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden shrink-0 items-center gap-3 md:flex">
              <Badge variant="secondary" className="gap-2 whitespace-nowrap px-4 py-2 text-sm">
                <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              <Badge variant="outline" className="gap-2 whitespace-nowrap px-4 py-2 text-sm tabular-nums">
                <span>Pending {pendingCount}</span>
                <Loader2
                  className={`h-4 w-4 ${syncing ? 'animate-spin opacity-100' : 'opacity-0'}`}
                  aria-hidden={!syncing}
                />
              </Badge>
              <Button
                variant="outline"
                size="default"
                className="h-10 px-5 text-sm"
                onClick={syncNow}
                disabled={!isOnline || syncing || pendingCount === 0}
                title={!isOnline ? 'Reconnect to sync' : pendingCount === 0 ? 'No pending changes' : 'Sync now'}
              >
                Sync
              </Button>
            </div>

            <div className="md:hidden">
              <Button
                variant="outline"
                size="default"
                className="h-10 px-4 text-sm"
                onClick={() => setMenuOpen(v => !v)}
                aria-expanded={menuOpen}
              >
                {menuOpen ? 'Close' : 'Menu'}
              </Button>
            </div>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-border/60 md:hidden">
            <div className="mx-auto grid max-w-6xl gap-1 px-6 py-4">
              <div className="flex items-center gap-2 pb-2">
                <Badge variant="outline" className="gap-2 whitespace-nowrap tabular-nums">
                  <span>Pending {pendingCount}</span>
                  <Loader2
                    className={`h-3.5 w-3.5 ${syncing ? 'animate-spin opacity-100' : 'opacity-0'}`}
                    aria-hidden={!syncing}
                  />
                </Badge>
                <Badge variant="secondary" className="gap-2 whitespace-nowrap">
                  <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
                <Button
                  variant="outline"
                  size="default"
                  className="h-10 px-4 text-sm"
                  onClick={syncNow}
                  disabled={!isOnline || syncing || pendingCount === 0}
                >
                  Sync
                </Button>
              </div>
              <div className="grid gap-1">
                {navItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      [
                        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Env warning removed at user request */}
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <section className="rounded-2xl border border-border/70 bg-[#0b1220]/70 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)] md:p-8">
          {children}
        </section>
      </main>
    </div>
  )
}

export default Layout
