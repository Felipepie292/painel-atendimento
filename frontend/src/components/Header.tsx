import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  connected: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeCount: number;
  onToggleSidebar?: () => void;
  onToggleAnalytics?: () => void;
  onToggleSound?: () => void;
  soundEnabled?: boolean;
  onLogout?: () => void;
}

export function Header({
  connected,
  theme,
  onToggleTheme,
  activeCount,
  onToggleSidebar,
  onToggleAnalytics,
  onToggleSound,
  soundEnabled,
  onLogout,
}: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 lg:px-5 shrink-0 glass"
      style={{
        height: 56,
        borderBottom: '1px solid var(--border-default)',
        backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left: logo + mobile menu */}
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden icon-btn"
            aria-label="Abrir menu"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
              boxShadow: 'var(--shadow-brand)',
            }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>

          <div className="flex items-baseline gap-1.5">
            <h1
              className="text-sm font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Atendimentos
            </h1>
            <span
              className="hidden sm:block text-xs font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--brand-50)',
                color: 'var(--brand-500)',
                border: '1px solid var(--brand-100)',
              }}
            >
              IA
            </span>
          </div>
        </div>
      </div>

      {/* Center: active count */}
      <div className="hidden md:flex items-center">
        {activeCount > 0 ? (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              border: '1px solid color-mix(in srgb, var(--success) 20%, transparent)',
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: 'var(--success)', animation: 'ping-slow 1.4s cubic-bezier(0,0,0.2,1) infinite' }}
              />
              <span
                className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{ backgroundColor: 'var(--success)' }}
              />
            </span>
            {activeCount} ativo{activeCount !== 1 ? 's' : ''}
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Nenhum atendimento ativo
          </span>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1">
        {onToggleAnalytics && (
          <IconButton
            onClick={onToggleAnalytics}
            label="Analytics (A)"
            aria-label="Analytics"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </IconButton>
        )}

        {onToggleSound && (
          <IconButton
            onClick={onToggleSound}
            label={soundEnabled ? 'Som ativado' : 'Som desativado'}
            aria-label={soundEnabled ? 'Desativar som' : 'Ativar som'}
          >
            {soundEnabled ? (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            )}
          </IconButton>
        )}

        {/* Connection status pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            color: connected ? 'var(--success)' : 'var(--danger)',
            border: '1px solid var(--border-default)',
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: connected ? 'var(--success)' : 'var(--danger)' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        {onLogout && (
          <IconButton
            onClick={onLogout}
            label="Sair"
            aria-label="Sair"
            danger
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </IconButton>
        )}
      </div>
    </header>
  );
}

function IconButton({
  onClick,
  label,
  'aria-label': ariaLabel,
  children,
  danger = false,
}: {
  onClick: () => void;
  label: string;
  'aria-label': string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      title={label}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150"
      style={{
        color: 'var(--text-secondary)',
        backgroundColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = 'var(--bg-subtle)';
        el.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = 'transparent';
        el.style.color = 'var(--text-secondary)';
      }}
    >
      {children}
    </button>
  );
}
