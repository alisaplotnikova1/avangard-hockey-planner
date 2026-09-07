import { useMemo } from 'react';
import type { Training, Game, Team } from '@/lib/types';


interface Props {
  team: Team;
  trainings: Training[];
  games: Game[];
  month: Date;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (date: string) => void;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Exact HEX from original index.html CSS
const LCOL: Record<string, string> = {
  'Низкий': '#22c55e',
  'Средний': '#eab308',
  'Высокий': '#f97316',
  'Максимальный': '#ef4444',
};

const ABB: Record<string, string> = {
  'Аэробная': 'Аэр',
  'Скорость': 'Скор',
  'Скоростная выносливость': 'СВ',
  'Скоростно-силовая выносливость': 'ССВ',
  'Силовая работа': 'Сила',
  'Взрывная сила': 'Взрыв',
  'Гибкость/Мобильность': 'Гибк',
};

export function Calendar({ team, trainings, games, month, selectedDate, onSelectDate, onDragStart, onDrop }: Props) {
  const days = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const dim = new Date(year, m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(new Date(year, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const trainingsByDate = useMemo(() => {
    const m = new Map<string, Training[]>();
    for (const t of trainings) {
      if (!m.has(t.date)) m.set(t.date, []);
      m.get(t.date)!.push(t);
    }
    return m;
  }, [trainings]);

  const gamesByDate = useMemo(() => {
    const m = new Map<string, Game[]>();
    for (const g of games) {
      if (!m.has(g.date)) m.set(g.date, []);
      m.get(g.date)!.push(g);
    }
    return m;
  }, [games]);

  const todayKey = toKey(new Date());

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[104px] border-r border-b border-slate-100 dark:border-slate-800/50" />;
          const key = toKey(d);
          const dayTrainings = trainingsByDate.get(key) || [];
          const dayGames = gamesByDate.get(key) || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          return (
            <div
              key={i}
              onClick={() => onSelectDate(key)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); onDrop(key); }}
              className={`min-h-[104px] border-r border-b border-slate-200 dark:border-slate-800 p-1.5 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                isSelected ? 'ring-2 ring-inset ring-primary-500' : ''
              } ${isToday ? 'border-primary-500' : ''}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs font-bold ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {d.getDate()}
                </span>
                {dayGames.length > 0 && (
                  <span className="ml-auto bg-[#d92d3a] text-white text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded">
                    ИГРА
                  </span>
                )}
              </div>
              {dayTrainings.slice(0, 4).map(t => {
                const isIce = t.type === 'На льду';
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => onDragStart(t.id)}
                    onClick={e => { e.stopPropagation(); onSelectDate(key); }}
                    className="flex items-center gap-1 rounded mb-1 px-1.5 py-1 text-[10.5px] cursor-grab active:cursor-grabbing overflow-hidden whitespace-nowrap hover:outline hover:outline-1 hover:outline-primary-500 bg-slate-100 dark:bg-slate-800"
                    title={`${t.type} · ${t.focus}${t.subtype ? ' · ' + t.subtype : ''} · ${t.load} · ${t.duration} мин`}
                  >
                    <span
                      className={`text-[9px] font-bold tracking-wide px-1 rounded shrink-0 ${
                        isIce
                          ? 'bg-[rgba(61,139,253,0.18)] text-[#1a66d0] dark:text-[#3d8bfd]'
                          : 'bg-[rgba(139,92,246,0.16)] text-[#7c3aed] dark:bg-[rgba(167,139,250,0.22)] dark:text-[#a78bfa]'
                      }`}
                    >
                      {isIce ? 'ЛЁД' : 'ОФП'}
                    </span>
                    <span className="overflow-hidden text-ellipsis text-slate-800 dark:text-slate-100">
                      {ABB[t.focus] || t.focus}
                    </span>
                    <span className="ml-auto font-mono font-bold text-slate-700 dark:text-slate-200 shrink-0">
                      {t.duration ? `${t.duration}′` : '—'}
                    </span>
                  </div>
                );
              })}
              {dayTrainings.length > 4 && (
                <div className="text-[10px] text-slate-400 px-1.5">+{dayTrainings.length - 4}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { MONTHS, toKey };
