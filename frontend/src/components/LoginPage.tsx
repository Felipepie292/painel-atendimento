import { useState, useCallback } from 'react';

interface LoginPageProps {
  onLogin: (password: string) => Promise<boolean>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    const success = await onLogin(password);
    if (!success) {
      setError('Senha incorreta');
    }
    setLoading(false);
  }, [password, onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-zinc-900 bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl dark:bg-indigo-500/20 bg-indigo-50 mb-4">
            <svg className="w-7 h-7 dark:text-indigo-400 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold dark:text-zinc-100 text-zinc-900">
            Painel de Atendimentos
          </h1>
          <p className="text-sm dark:text-zinc-500 text-zinc-400 mt-1">
            Digite a senha para acessar o painel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha do painel"
              autoFocus
              className="w-full px-4 py-3 text-sm rounded-xl border
                dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500
                bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400
                focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40
                transition-colors duration-200"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 dark:text-red-400 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white
              bg-indigo-600 hover:bg-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
