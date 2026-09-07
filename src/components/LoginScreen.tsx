import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Shield, Lock, Mail } from 'lucide-react';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) setError(error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mb-4 shadow-lg shadow-primary-600/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">АВАНГАРД</h1>
          <p className="text-slate-400 text-sm mt-1">Планировщик тренировок</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'signin' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'signup' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                  placeholder="coach@avangard.ru"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                  placeholder="••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {busy ? 'Подождите…' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            {mode === 'signin'
              ? 'Главный тренер видит все команды. Тренер — только свою.'
              : 'После регистрации профиль создаётся автоматически с ролью «тренер».'}
          </p>
        </div>
      </div>
    </div>
  );
}
