import type { ReactNode } from 'react'
import {
  ChevronRight,
  CircleUserRound,
  Menu,
  X,
} from 'lucide-react'

import { cn } from '../lib/cn'
import { defaultScreenByRole, driverBottomNav, driverDrawerItems, passengerBottomNav, passengerDrawerItems, screenMeta } from '../navigation/navigation'
import { useAppActions, useAppState } from '../providers/AppStateProvider'
import type { AppScreen } from '../types/domain'

type MobileShellProps = {
  children: ReactNode
  overlay?: ReactNode
}

export function MobileShell({ children, overlay }: MobileShellProps) {
  const state = useAppState()
  const actions = useAppActions()

  const bottomNav =
    state.role === 'driver' ? driverBottomNav : passengerBottomNav
  const drawerItems =
    state.role === 'driver' ? driverDrawerItems : passengerDrawerItems
  const profileScreen: AppScreen =
    state.role === 'driver' ? 'driverProfile' : 'passengerProfile'
  const currentScreenMeta = screenMeta[state.currentScreen]

  const handleDrawerItem = (item: (typeof drawerItems)[number]) => {
    if (item.role) {
      actions.setRole(item.role, item.screen ?? defaultScreenByRole[item.role])
      return
    }

    if (item.screen) {
      actions.setScreen(item.screen)
    }
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(241,70,53,0.1),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] px-0 py-0 sm:px-4 sm:py-4">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] overflow-hidden bg-app-bg shadow-[var(--shadow-shell)] ring-1 ring-slate-900/5 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[32px]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 top-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -left-24 bottom-24 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl" />
        </div>

        <div className="relative flex w-full flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/80 bg-white/90 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={actions.toggleMenu}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white text-ink shadow-sm transition hover:border-accent/40 hover:text-accent"
                aria-label={state.isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              >
                {state.isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
                  AmanJol Ride
                </p>
                <h1 className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
                  {currentScreenMeta.title}
                </h1>
                <p className="truncate text-xs text-muted">
                  {currentScreenMeta.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => actions.setScreen(profileScreen)}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white text-ink shadow-sm transition hover:border-accent/40 hover:text-accent"
                aria-label="Открыть профиль"
              >
                <CircleUserRound className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div
            className={cn(
              'absolute inset-0 z-30 transition',
              state.isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none',
            )}
          >
            <button
              type="button"
              aria-label="Закрыть меню"
              onClick={actions.closeMenu}
              className={cn(
                'absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] transition-opacity',
                state.isMenuOpen ? 'opacity-100' : 'opacity-0',
              )}
            />

            <aside
              className={cn(
                'absolute left-0 top-0 flex h-full w-[86%] max-w-[320px] flex-col border-r border-border bg-white px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)] shadow-2xl transition-transform duration-300',
                state.isMenuOpen ? 'translate-x-0' : '-translate-x-full',
              )}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted">
                    {state.role === 'driver' ? 'Режим водителя' : 'Режим пассажира'}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">
                    {state.role === 'driver'
                      ? 'Панель и поездки'
                      : 'Межгород и сервисы'}
                  </h2>
                </div>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {state.role === 'driver' ? 'Driver' : 'Passenger'}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto pr-1">
                {drawerItems.map((item) => {
                  const Icon = item.icon
                  const isActive = item.screen === state.currentScreen

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleDrawerItem(item)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition',
                        isActive
                          ? 'border-accent/30 bg-accent/8 text-accent'
                          : 'border-transparent bg-surface-soft text-ink hover:border-border hover:bg-slate-50',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-10 w-10 place-items-center rounded-2xl',
                          isActive ? 'bg-accent/12' : 'bg-white',
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </button>
                  )
                })}
              </div>
            </aside>
          </div>

          <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
            {children}
          </main>

          <nav className="sticky bottom-0 z-20 border-t border-border/80 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur">
            <div
              className={cn(
                'grid gap-2',
                state.role === 'driver' ? 'grid-cols-4' : 'grid-cols-3',
              )}
            >
              {bottomNav.map((item) => {
                const Icon = item.icon
                const isActive = state.currentScreen === item.screen

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => actions.setScreen(item.screen)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition',
                      isActive
                        ? 'bg-accent text-white shadow-lg shadow-accent/20'
                        : 'text-muted hover:bg-slate-50 hover:text-ink',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          {overlay ? <div className="absolute inset-0 z-40">{overlay}</div> : null}
        </div>
      </div>
    </div>
  )
}
