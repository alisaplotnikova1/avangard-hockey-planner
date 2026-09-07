import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import type { Training, Game, Exercise, Team } from '@/lib/types';
import { TEAMS } from '@/lib/types';
import { useDarkMode } from '@/lib/useDarkMode';
import { Calendar } from '@/components/Calendar';
import { DayPanel } from '@/components/DayPanel';
import { Analytics } from '@/components/Analytics';
import { ExerciseLibrary } from '@/components/ExerciseLibrary';
import { ExcelImport } from '@/components/ExcelImport';
import { UsersScreen } from '@/components/UsersScreen';
import { Shield, Moon, Sun, LogOut, CalendarDays, BarChart3, Dumbbell, Download, Upload, ChevronLeft, ChevronRight, Users } from 'lucide-react';

type Tab = 'plan' | 'analytics' | 'exercises' | 'users';
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function roleLabel(role: string | undefined, team: string | null): string {
  if (!role) return '';
  if (role === 'admin') return 'Администратор';
  if (role === 'head') return 'Главный тренер';
  return `Тренер${team ? ' · ' + team : ''}`;
}

export function Dashboard() {
  const { profile, signOut } = useAuth();
  const { showToast } = useToast();
  const { dark, toggle } = useDarkMode();
  const [tab, setTab] = useState<Tab>('plan');
  const [team, setTeam] = useState<Team>(profile?.team || TEAMS[0]);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';
  const isHead = profile?.role === 'head' || isAdmin;
  const availableTeams = isHead ? TEAMS : [profile?.team].filter(Boolean) as Team[];

  useEffect(() => {
    if (!isHead && profile?.team) setTeam(profile.team);
  }, [isHead, profile?.team]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [trRes, gmRes, exRes] = await Promise.all([
      supabase.from('trainings').select('*').eq('team', team),
      supabase.from('games').select('*').eq('team', team),
      supabase.from('exercises').select('*'),
    ]);
    setTrainings((trRes.data || []) as Training[]);
    setGames((gmRes.data || []) as Game[]);
    setExercises((exRes.data || []) as Exercise[]);
    setLoading(false);
  }, [team]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDrop = async (date: string) => {
    if (!dragId) return;
    const { error } = await supabase.from('trainings').update({ date }).eq('id', dragId);
    setDragId(null);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Тренировка перенесена');
    loadData();
  };

  const copyPrevDay = async () => {
    if (!selectedDate) return;
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const prevKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const prev = trainings.filter(t => t.date === prevKey);
    if (prev.length === 0) {
      showToast('info', 'Нет тренировок в предыдущий день');
      return;
    }
    const rows = prev.map(t => ({
      team, date: selectedDate, type: t.type, focus: t.focus, subtype: t.subtype,
      duration: t.duration, load: t.load, note: t.note,
    }));
    const { error } = await supabase.from('trainings').insert(rows);
    if (error) { showToast('error', error.message); return; }
    showToast('success', `Скопировано ${rows.length} тренировок`);
    loadData();
  };

  const exportJSON = () => {
    const data = { team, trainings, games };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avangard-${team}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.trainings) {
      const rows = data.trainings.map((t: Training) => ({
        team, date: t.date, type: t.type, focus: t.focus, subtype: t.subtype,
        duration: t.duration, load: t.load, note: t.note,
      }));
      const { error } = await supabase.from('trainings').insert(rows);
      if (error) { showToast('error', error.message); return; }
    }
    if (data.games) {
      const rows = data.games.map((g: Game) => ({ team, date: g.date, note: g.note }));
      const { error } = await supabase.from('games').insert(rows);
      if (error) { showToast('error', error.message); return; }
    }
    showToast('success', 'Импорт завершён');
    loadData();
  };

  const canEditTeam = (t: Team) => isHead || t === profile?.team;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-sm leading-tight tracking-wide">АВАНГАРД</h1>
              <p className="text-[10px] text-slate-500 leading-tight">{roleLabel(profile?.role, profile?.team ?? null)}</p>
            </div>
          </div>

          {isHead && (
            <select
              value={team}
              onChange={e => setTeam(e.target.value as Team)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm"
            >
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {!isHead && (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{team}</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 pb-2">
          <TabButton active={tab === 'plan'} onClick={() => setTab('plan')} icon={<CalendarDays className="w-4 h-4" />} label="План" />
          <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')} icon={<BarChart3 className="w-4 h-4" />} label="Аналитика" />
          <TabButton active={tab === 'exercises'} onClick={() => setTab('exercises')} icon={<Dumbbell className="w-4 h-4" />} label="Упражнения" />
          {isAdmin && (
            <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={<Users className="w-4 h-4" />} label="Пользователи" />
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'plan' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-slate-900 dark:text-white min-w-[120px] text-center">
                  {MONTHS[month.getMonth()]} {month.getFullYear()}
                </span>
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={exportJSON} className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg px-3 py-2 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                  <Download className="w-4 h-4" /> Экспорт JSON
                </button>
                <label className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg px-3 py-2 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" /> Импорт JSON
                  <input type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importJSON(f); }} />
                </label>
                <ExcelImport defaultTeam={team} canEditTeam={canEditTeam} onDone={loadData} />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 text-slate-400">Загрузка…</div>
            ) : (
              <Calendar
                team={team}
                trainings={trainings}
                games={games}
                month={month}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onDragStart={setDragId}
                onDrop={handleDrop}
              />
            )}
          </div>
        )}

        {tab === 'analytics' && (
          loading ? <div className="text-center py-20 text-slate-400">Загрузка…</div> :
          <Analytics
            team={team}
            trainings={trainings}
            games={games}
            month={month}
            setMonth={setMonth}
            onOpenDate={(date) => { setSelectedDate(date); setTab('plan'); }}
            onGoToExercises={() => setTab('exercises')}
          />
        )}

        {tab === 'exercises' && (
          <ExerciseLibrary exercises={exercises} onChanged={loadData} />
        )}

        {tab === 'users' && isAdmin && (
          <UsersScreen />
        )}
      </main>

      {selectedDate && tab === 'plan' && (
        <DayPanel
          team={team}
          date={selectedDate}
          trainings={trainings}
          games={games}
          onClose={() => setSelectedDate(null)}
          onChanged={loadData}
          onCopyPrev={copyPrevDay}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-primary-600 text-white'
          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon} {label}
    </button>
  );
}
