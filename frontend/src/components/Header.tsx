import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  connected: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeCount: number;
  onToggleSidebar?: () => void;
}

export function Header({ connected, theme, onToggleTheme, activeCount, onToggleSidebar }: HeaderProps) {
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
      </div>
    </header>
  );
}
