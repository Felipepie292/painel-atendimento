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
    <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b shrink-0
      dark:bg-zinc-950 dark:border-zinc-800
      bg-white border-zinc-200
      transition-colors duration-200">
      {/* Left */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg
              dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800
              text-zinc-600 hover:text-zinc-900 hover:bg-gray-100
              transition-colors duration-150"
            aria-label="Abrir menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="dark:text-indigo-400 text-indigo-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold dark:text-zinc-100 text-zinc-900">
            Painel de Atendimentos
          </h1>
        </div>
      </div>

      {/* Center */}
      <div className="hidden md:flex items-center">
        <span className="text-xs dark:text-zinc-500 text-zinc-400">
          {activeCount > 0
            ? `${activeCount} atendimento${activeCount !== 1 ? 's' : ''} ativo${activeCount !== 1 ? 's' : ''}`
            : 'Nenhum atendimento ativo'}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Analytics button */}
        {onToggleAnalytics && (
          <button
            onClick={onToggleAnalytics}
            className="flex items-center justify-center w-9 h-9 rounded-lg
              dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800
              text-zinc-600 hover:text-zinc-900 hover:bg-gray-100
              transition-colors duration-150"
            aria-label="Analytics"
            title="Analytics (A)"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </button>
        )}

        {/* Sound toggle */}
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className="flex items-center justify-center w-9 h-9 rounded-lg
              dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800
              text-zinc-600 hover:text-zinc-900 hover:bg-gray-100
              transition-colors duration-150"
            aria-label={soundEnabled ? 'Desativar som' : 'Ativar som'}
            title={soundEnabled ? 'Som ativado' : 'Som desativado'}
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
          </button>
        )}

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
          dark:bg-zinc-800/50 bg-gray-100
          transition-colors duration-200">
          <span
            aria-hidden="true"
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs dark:text-zinc-400 text-zinc-600">
            {connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        {/* Logout button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-9 h-9 rounded-lg
              dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-zinc-800
              text-zinc-600 hover:text-red-600 hover:bg-gray-100
              transition-colors duration-150"
            aria-label="Sair"
            title="Sair"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
