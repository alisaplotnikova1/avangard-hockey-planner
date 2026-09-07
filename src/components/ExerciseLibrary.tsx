import { useState } from 'react';
import type { Exercise, Team } from '@/lib/types';
import { TEAMS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Plus, Search, Trash2, Save, Image, Video, Youtube, X } from 'lucide-react';

interface Props {
  exercises: Exercise[];
  onChanged: () => void;
}

export function ExerciseLibrary({ exercises, onChanged }: Props) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    tags: '',
    team: '',
    image_url: '',
    video_url: '',
    youtube_url: '',
  });

  const canManage = profile?.can_manage_exercises || profile?.role === 'head' || profile?.role === 'admin';

  const allTags = Array.from(new Set(exercises.flatMap(e => e.tags))).sort();

  const filtered = exercises.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !(e.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTag && !e.tags.includes(filterTag)) return false;
    return true;
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', tags: '', team: '', image_url: '', video_url: '', youtube_url: '' });
    setShowForm(true);
  };

  const openEdit = (e: Exercise) => {
    setEditing(e);
    setForm({
      name: e.name,
      description: e.description || '',
      tags: e.tags.join(', '),
      team: e.team || '',
      image_url: e.image_url || '',
      video_url: e.video_url || '',
      youtube_url: e.youtube_url || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    setBusy(true);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      description: form.description || null,
      tags,
      team: form.team || null,
      image_url: form.image_url || null,
      video_url: form.video_url || null,
      youtube_url: form.youtube_url || null,
    };
    let result;
    if (editing) {
      result = await supabase.from('exercises').update(payload).eq('id', editing.id);
    } else {
      result = await supabase.from('exercises').insert(payload);
    }
    setBusy(false);
    if (result.error) {
      showToast('error', result.error.message);
      return;
    }
    showToast('success', editing ? 'Упражнение обновлено' : 'Упражнение добавлено');
    setShowForm(false);
    setEditing(null);
    onChanged();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Упражнение удалено');
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск упражнений…"
            className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg pl-10 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:outline-none"
          />
        </div>
        <select
          value={filterTag}
          onChange={e => setFilterTag(e.target.value)}
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Все теги</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {canManage && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Добавить
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400">Нет упражнений</p>
          {canManage && <p className="text-sm text-slate-500 mt-1">Нажмите «Добавить» чтобы создать первое</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ex => (
            <div key={ex.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden group">
              {ex.image_url && (
                <div className="aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <img src={ex.image_url} alt={ex.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-medium text-slate-900 dark:text-white">{ex.name}</h3>
                {ex.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{ex.description}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {ex.tags.map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{t}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {ex.youtube_url && (
                    <a href={ex.youtube_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 hover:bg-error-100">
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {ex.video_url && (
                    <a href={ex.video_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-100">
                      <Video className="w-4 h-4" />
                    </a>
                  )}
                  {ex.image_url && (
                    <a href={ex.image_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200">
                      <Image className="w-4 h-4" />
                    </a>
                  )}
                  {canManage && (
                    <div className="ml-auto flex gap-1">
                      <button onClick={() => openEdit(ex)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(ex.id)} className="p-1.5 rounded-lg hover:bg-error-50 dark:hover:bg-error-500/10 text-slate-500 hover:text-error-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 dark:text-white">{editing ? 'Редактировать' : 'Новое упражнение'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Название"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Описание"
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm resize-none"
              />
              <input
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="Теги через запятую (Лёд, Скорость…)"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <select
                value={form.team}
                onChange={e => setForm({ ...form, team: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              >
                <option value="">Все команды</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="URL фото"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <input
                value={form.video_url}
                onChange={e => setForm({ ...form, video_url: e.target.value })}
                placeholder="URL видео"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <input
                value={form.youtube_url}
                onChange={e => setForm({ ...form, youtube_url: e.target.value })}
                placeholder="URL YouTube"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <button
                onClick={save}
                disabled={busy || !form.name}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                {busy ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
