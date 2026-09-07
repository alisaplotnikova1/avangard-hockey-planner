import { useState, useEffect, useCallback } from 'react';
import type { Profile, Team, Role } from '@/lib/types';
import { TEAMS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { Users as UsersIcon, Plus, Save, X, Shield, Trash2 } from 'lucide-react';

export function UsersScreen() {
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '', password: '', full_name: '', role: 'coach' as Role, team: '' as string, can_manage_exercises: false,
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at');
    if (error) {
      showToast('error', error.message);
    } else {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const updateProfile = async (userId: string, changes: Partial<Profile>) => {
    const { error } = await supabase.from('profiles').update(changes).eq('user_id', userId);
    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', 'Профиль обновлён');
      load();
    }
  };

  const createUser = async () => {
    setCreating(true);
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    try {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          full_name: createForm.full_name || null,
          role: createForm.role,
          team: createForm.team || null,
          can_manage_exercises: createForm.can_manage_exercises,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Ошибка создания пользователя');
      } else {
        showToast('success', `Пользователь ${createForm.email} создан`);
        setShowCreate(false);
        setCreateForm({ email: '', password: '', full_name: '', role: 'coach', team: '', can_manage_exercises: false });
        load();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Сетевая ошибка');
    }
    setCreating(false);
  };

  const roleLabel = (role: string) => {
    if (role === 'admin') return 'Администратор';
    if (role === 'head') return 'Главный тренер';
    return 'Тренер';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <UsersIcon className="w-5 h-5" /> Пользователи
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Создать пользователя
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Загрузка…</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-slate-500 text-left">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium">Команда</th>
                <th className="px-4 py-3 font-medium">Упражнения</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.user_id} className="border-t border-slate-100 dark:border-slate-800/50">
                  <td className="px-4 py-3 text-slate-900 dark:text-white">{p.email}</td>
                  <td className="px-4 py-3 text-slate-500">{p.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      onChange={e => updateProfile(p.user_id, { role: e.target.value as Role })}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs"
                    >
                      <option value="admin">Администратор</option>
                      <option value="head">Главный тренер</option>
                      <option value="coach">Тренер</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.team || ''}
                      onChange={e => updateProfile(p.user_id, { team: (e.target.value || null) as Team | null })}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs"
                    >
                      <option value="">Все команды</option>
                      {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={p.can_manage_exercises}
                      onChange={e => updateProfile(p.user_id, { can_manage_exercises: e.target.checked })}
                      className="w-4 h-4 rounded accent-primary-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 text-xs text-accent-600 dark:text-accent-400">
                        <Shield className="w-3.5 h-3.5" /> Admin
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {profiles.length === 0 && (
            <div className="text-center py-12 text-slate-400">Нет пользователей</div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Новый пользователь</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="email"
                required
                value={createForm.email}
                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="Email"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <input
                type="password"
                required
                minLength={6}
                value={createForm.password}
                onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Пароль (мин. 6 символов)"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <input
                value={createForm.full_name}
                onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="Полное имя"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm({ ...createForm, role: e.target.value as Role })}
                  className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                >
                  <option value="coach">Тренер</option>
                  <option value="head">Главный тренер</option>
                  <option value="admin">Администратор</option>
                </select>
                <select
                  value={createForm.team}
                  onChange={e => setCreateForm({ ...createForm, team: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                >
                  <option value="">Все команды</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={createForm.can_manage_exercises}
                  onChange={e => setCreateForm({ ...createForm, can_manage_exercises: e.target.checked })}
                  className="w-4 h-4 rounded accent-primary-600"
                />
                Может управлять упражнениями
              </label>
              <button
                onClick={createUser}
                disabled={creating || !createForm.email || !createForm.password}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                {creating ? 'Создание…' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
