import { useState } from 'react';
import type { Training, Game, Team, TrainingType, Load } from '@/lib/types';
import { TRAINING_TYPES, FOCI, SUBTYPES, LOADS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { X, Plus, Copy, Trophy, Trash2, Save } from 'lucide-react';

interface Props {
  team: Team;
  date: string;
  trainings: Training[];
  games: Game[];
  onClose: () => void;
  onChanged: () => void;
  onCopyPrev: () => void;
}

export function DayPanel({ team, date, trainings, games, onClose, onChanged, onCopyPrev }: Props) {
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'На льду' as TrainingType,
    focus: FOCI[0] as string,
    subtype: '' as string,
    duration: 60,
    load: 'Средний' as Load,
    note: '',
  });
  const [busy, setBusy] = useState(false);

  const dayTrainings = trainings.filter(t => t.date === date);
  const dayGames = games.filter(g => g.date === date);

  const openNew = () => {
    setEditingId(null);
    setForm({ type: 'На льду', focus: FOCI[0], subtype: '', duration: 60, load: 'Средний', note: '' });
    setShowForm(true);
  };

  const openEdit = (t: Training) => {
    setEditingId(t.id);
    setForm({
      type: t.type,
      focus: t.focus,
      subtype: t.subtype || '',
      duration: t.duration,
      load: t.load,
      note: t.note || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    setBusy(true);
    const payload = {
      team,
      date,
      type: form.type,
      focus: form.focus,
      subtype: form.type === 'ОФП/СФП' && form.subtype ? form.subtype : null,
      duration: form.duration,
      load: form.load,
      note: form.note || null,
    };
    let result;
    if (editingId) {
      result = await supabase.from('trainings').update(payload).eq('id', editingId);
    } else {
      result = await supabase.from('trainings').insert(payload);
    }
    setBusy(false);
    if (result.error) {
      showToast('error', result.error.message);
      return;
    }
    showToast('success', editingId ? 'Тренировка обновлена' : 'Тренировка добавлена');
    setShowForm(false);
    setEditingId(null);
    onChanged();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('trainings').delete().eq('id', id);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', 'Тренировка удалена');
    onChanged();
  };

  const toggleGame = async () => {
    if (dayGames.length > 0) {
      const { error } = await supabase.from('games').delete().eq('id', dayGames[0].id);
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Игра убрана');
    } else {
      const { error } = await supabase.from('games').insert({ team, date, note: null });
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Игра отмечена');
    }
    onChanged();
  };

  return (
    <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">{formatDate(date)}</h2>
          <p className="text-xs text-slate-500">{team}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {dayGames.length > 0 && (
          <div className="flex items-center gap-2 bg-accent-50 dark:bg-accent-500/10 border border-accent-200 dark:border-accent-500/20 rounded-lg p-3">
            <Trophy className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            <span className="text-sm font-medium text-accent-700 dark:text-accent-300">Игровой день</span>
            <button onClick={toggleGame} className="ml-auto text-xs text-accent-600 dark:text-accent-400 hover:underline">Убрать</button>
          </div>
        )}

        {dayTrainings.map(t => (
          <div key={t.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300">
                {t.type}
              </span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(t.id)} className="p-1 rounded hover:bg-error-100 dark:hover:bg-error-500/20 text-slate-500 hover:text-error-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{t.focus}</p>
            {t.subtype && <p className="text-xs text-slate-500 mt-0.5">{t.subtype}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>{t.duration} мин</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">{t.load}</span>
            </div>
            {t.note && <p className="text-xs text-slate-400 mt-2 italic">{t.note}</p>}
          </div>
        ))}

        {dayTrainings.length === 0 && dayGames.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">Нет тренировок в этот день</p>
        )}

        {showForm && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Тип тренировки</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as TrainingType, subtype: '' })}
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              >
                {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Направленность</label>
              <select
                value={form.focus}
                onChange={e => setForm({ ...form, focus: e.target.value as string })}
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              >
                {FOCI.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {form.type === 'ОФП/СФП' && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Подтип</label>
                <select
                  value={form.subtype}
                  onChange={e => setForm({ ...form, subtype: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {SUBTYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Объём (мин)</label>
                <input
                  type="number"
                  min={0}
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: +e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Нагрузка</label>
                <select
                  value={form.load}
                  onChange={e => setForm({ ...form, load: e.target.value as Load })}
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
                >
                  {LOADS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Заметка</label>
              <textarea
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                rows={2}
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
              >
                {busy ? 'Сохранение…' : editingId ? 'Обновить' : 'Добавить'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg py-2 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {!showForm && (
          <>
            <button
              onClick={openNew}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Тренировочный блок
            </button>
            <button
              onClick={onCopyPrev}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg py-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Copy className="w-4 h-4" /> Копировать пред. день
            </button>
            <button
              onClick={toggleGame}
              className="w-full flex items-center justify-center gap-2 bg-accent-100 dark:bg-accent-500/20 text-accent-700 dark:text-accent-300 text-sm font-medium rounded-lg py-2.5 hover:bg-accent-200 dark:hover:bg-accent-500/30 transition-colors"
            >
              <Trophy className="w-4 h-4" /> {dayGames.length > 0 ? 'Убрать игру' : 'Отметить игру'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function formatDate(d: string): string {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}
