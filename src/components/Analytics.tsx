import { useState, useMemo } from 'react';
import type { Training, Game, Team } from '@/lib/types';
import { FOCI, LOADS } from '@/lib/types';
import { ChevronLeft, ChevronRight, Plus, ArrowLeft } from 'lucide-react';

const LCOL: Record<string, string> = {
  'Низкий': '#22c55e', 'Средний': '#eab308', 'Высокий': '#f97316', 'Максимальный': '#ef4444',
};
const LH: Record<string, number> = {
  'Низкий': 45, 'Средний': 90, 'Высокий': 135, 'Максимальный': 180,
};
const FCOL: Record<string, string> = {
  'Аэробная': '#0ea5e9', 'Скорость': '#6366f1', 'Скоростная выносливость': '#8b5cf6',
  'Скоростно-силовая выносливость': '#d946ef', 'Силовая работа': '#92400e',
  'Взрывная сила': '#0f766e', 'Гибкость/Мобильность': '#64748b',
};
const ABB: Record<string, string> = {
  'Аэробная': 'Аэр', 'Скорость': 'Скор', 'Скоростная выносливость': 'СВ',
  'Скоростно-силовая выносливость': 'ССВ', 'Силовая работа': 'Сила',
  'Взрывная сила': 'Взрыв', 'Гибкость/Мобильность': 'Гибк',
};
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const iso = (y: number, m: number, d: number) =>
  y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
const parseDate = (s: string): Date => {
  const [a, b, c] = s.split('-').map(Number);
  return new Date(a, b - 1, c);
};
const mondayOf = (ds: string): Date => {
  const d = parseDate(ds);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d;
};
const fmtD = (d: Date): string =>
  String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
const getToday = (): string => {
  const n = new Date();
  return iso(n.getFullYear(), n.getMonth(), n.getDate());
};

interface Props {
  team: Team;
  trainings: Training[];
  games: Game[];
  month: Date;
  setMonth: (d: Date) => void;
  onOpenDate: (date: string) => void;
  onGoToExercises: () => void;
}

export function Analytics({ team, trainings, games, month, setMonth, onOpenDate, onGoToExercises }: Props) {
  const [period, setPeriod] = useState<'week' | 'month' | 'custom'>('month');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ice' | 'off'>('all');
  const [focusFilter, setFocusFilter] = useState<string>('all');
  const [selDate, setSelDate] = useState(getToday());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [drillDown, setDrillDown] = useState(false);

  const y = month.getFullYear();
  const m = month.getMonth();

  const typeFiltered = useMemo(() => {
    return trainings.filter(t => {
      if (typeFilter !== 'all' && (typeFilter === 'ice') !== (t.type === 'На льду')) return false;
      if (focusFilter !== 'all' && t.focus !== focusFilter) return false;
      return true;
    });
  }, [trainings, typeFilter, focusFilter]);

  const range = useMemo((): [Date, Date] => {
    if (period === 'week') {
      const a = mondayOf(selDate);
      const b = new Date(a);
      b.setDate(a.getDate() + 6);
      return [a, b];
    }
    if (period === 'custom' && customFrom && customTo) {
      let a = parseDate(customFrom), b = parseDate(customTo);
      if (a > b) { const t = a; a = b; b = t; }
      return [a, b];
    }
    return [new Date(y, m, 1), new Date(y, m + 1, 0)];
  }, [period, selDate, customFrom, customTo, y, m]);

  const chart1 = useMemo(() => {
    const [a, b] = range;
    const days: string[] = [];
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1))
      days.push(iso(d.getFullYear(), d.getMonth(), d.getDate()));
    let maxMin = 1;
    const data = days.map(ds => {
      const groups = (['На льду', 'ОФП/СФП'] as const).map(tp => {
        const items: { f: string; l: string; m: number }[] = [];
        FOCI.forEach(f => {
          LOADS.forEach(l => {
            const minutes = typeFiltered
              .filter(t => t.date === ds && t.type === tp && t.focus === f && t.load === l)
              .reduce((s, t) => s + t.duration, 0);
            if (minutes > 0) {
              items.push({ f, l, m: minutes });
              if (minutes > maxMin) maxMin = minutes;
            }
          });
        });
        return { tp, items };
      }).filter(g => g.items.length > 0);
      return { ds, groups };
    }).filter(dd => dd.groups.length > 0);
    return { data, maxMin };
  }, [range, typeFiltered]);

  const chart2 = useMemo(() => {
    let dl: string[] = [];
    if (period === 'custom' && customFrom && customTo) {
      let a = parseDate(customFrom), b = parseDate(customTo);
      if (a > b) { const t = a; a = b; b = t; }
      for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1))
        dl.push(iso(d.getFullYear(), d.getMonth(), d.getDate()));
    } else {
      const n = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= n; d++) dl.push(iso(y, m, d));
    }
    const types = typeFilter === 'all' ? ['На льду', 'ОФП/СФП'] : (typeFilter === 'ice' ? ['На льду'] : ['ОФП/СФП']);
    let maxMin = 1;
    const data = dl.map(ds => {
      const groups: { tp: string; b: { f: string; m: number; l: string } }[] = [];
      types.forEach(tp => {
        const candidates: { f: string; m: number; l: string }[] = [];
        FOCI.forEach(f => {
          const tr = typeFiltered.filter(t => t.date === ds && t.type === tp && t.focus === f);
          const mm = tr.reduce((s, t) => s + t.duration, 0);
          if (mm > 0) {
            const loadMinutes = LOADS.map(l => ({
              l,
              lm: tr.filter(t => t.load === l).reduce((s, t) => s + t.duration, 0),
            })).filter(x => x.lm > 0);
            const topLoad = loadMinutes.length > 0
              ? loadMinutes.reduce((a, b) => a.lm >= b.lm ? a : b)
              : null;
            candidates.push({ f, m: mm, l: topLoad ? topLoad.l : 'Средний' });
          }
        });
        if (candidates.length > 0) {
          const best = candidates.reduce((a, b) => a.m >= b.m ? a : b);
          groups.push({ tp, b: best });
          if (best.m > maxMin) maxMin = best.m;
        }
      });
      return { ds, groups };
    });
    return { data, maxMin };
  }, [period, customFrom, customTo, y, m, typeFilter, typeFiltered]);

  const chart3 = useMemo(() => {
    const dates = typeFiltered.map(t => t.date).sort();
    if (dates.length === 0) return { rows: [] as { ws: string; we: string; segs: { f: string; m: number }[]; tot: number; hm: number }[], maxTot: 1 };
    let a = mondayOf(dates[0]);
    let b = mondayOf(dates[dates.length - 1]);
    const weeks: string[] = [];
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 7))
      weeks.push(iso(d.getFullYear(), d.getMonth(), d.getDate()));
    let maxTot = 1;
    const rows = weeks.map(ws => {
      const we = new Date(parseDate(ws));
      we.setDate(we.getDate() + 6);
      const tr = typeFiltered.filter(t => {
        const d = parseDate(t.date);
        return d >= parseDate(ws) && d <= we;
      });
      const segs = FOCI.map(f => ({
        f,
        m: tr.filter(t => t.focus === f).reduce((s, t) => s + t.duration, 0),
      })).filter(x => x.m > 0);
      const tot = segs.reduce((s, x) => s + x.m, 0);
      const hm = tr.filter(t => t.load === 'Высокий' || t.load === 'Максимальный').reduce((s, t) => s + t.duration, 0);
      if (tot > maxTot) maxTot = tot;
      return {
        ws,
        we: iso(we.getFullYear(), we.getMonth(), we.getDate()),
        segs, tot,
        hm: tot ? Math.round(hm / tot * 100) : 0,
      };
    });
    return { rows, maxTot };
  }, [typeFiltered]);

  const weekStats = useMemo(() => {
    const mon = mondayOf(selDate);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const ts = trainings.filter(t => {
      const d = parseDate(t.date);
      return d >= mon && d <= sun;
    });
    const ice = ts.filter(t => t.type === 'На льду');
    const off = ts.filter(t => t.type !== 'На льду');
    const sum = (a: Training[]) => a.reduce((x, t) => x + t.duration, 0);
    const hi = ts.filter(t => t.load === 'Высокий' || t.load === 'Максимальный').length;
    const tcount = new Set(ts.map(t => t.date + '|' + t.type)).size;
    return {
      tcount, iceMin: sum(ice), iceCount: ice.length,
      offMin: sum(off), offCount: off.length,
      hiPct: ts.length ? Math.round(hi / ts.length * 100) : 0,
      loadCounts: LOADS.map(l => ts.filter(t => t.load === l).length),
    };
  }, [selDate, trainings]);

  const warns = useMemo(() => {
    const out: string[] = [];
    const days = new Date(y, m + 1, 0).getDate();
    const heavy = (d: number) => trainings.some(t => t.date === iso(y, m, d) && (t.load === 'Высокий' || t.load === 'Максимальный'));
    let run = 0;
    for (let d = 1; d <= days; d++) {
      if (heavy(d)) {
        run++;
        if (run === 3) out.push(`3 дня подряд высокой нагрузки: ${d - 2}–${d} ${MONTHS[m].toLowerCase()}`);
      } else run = 0;
    }
    let start = mondayOf(iso(y, m, 1));
    const last = new Date(y, m, days);
    while (start <= last) {
      const sun = new Date(start);
      sun.setDate(start.getDate() + 6);
      const ice = trainings.filter(t => {
        const d = parseDate(t.date);
        return d >= start && d <= sun && t.type === 'На льду';
      }).length;
      if (ice > 0 && ice < 2) out.push(`Неделя ${fmtD(start)}: меньше 2 ледовых тренировок (${ice})`);
      start = new Date(sun);
      start.setDate(sun.getDate() + 1);
    }
    games.forEach(g => {
      const d = parseDate(g.date);
      if (d.getFullYear() === y && d.getMonth() === m) {
        const p = new Date(d);
        p.setDate(d.getDate() - 1);
        const pt = trainings.filter(t => t.date === iso(p.getFullYear(), p.getMonth(), p.getDate()));
        if (!(pt.length && pt.every(t => t.load === 'Низкий' || t.load === 'Средний')))
          out.push(`Нет восстановительного дня перед игрой ${g.date.slice(8, 10)}.${g.date.slice(5, 7)}`);
      }
    });
    return out;
  }, [trainings, games, y, m]);

  const weekOptions = useMemo(() => {
    const ds = trainings.map(t => t.date).sort();
    let a: Date, b: Date;
    if (ds.length) {
      a = mondayOf(ds[0]);
      b = mondayOf(ds[ds.length - 1]);
    } else {
      a = mondayOf(iso(y, m, 1));
      b = new Date(a);
    }
    const cs = mondayOf(selDate);
    if (cs < a) a = new Date(cs);
    if (cs > b) b = new Date(cs);
    const opts: { value: string; label: string }[] = [];
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 7)) {
      const e = new Date(d);
      e.setDate(d.getDate() + 6);
      opts.push({
        value: iso(d.getFullYear(), d.getMonth(), d.getDate()),
        label: fmtD(d) + '–' + fmtD(e),
      });
    }
    return opts;
  }, [trainings, selDate, y, m]);

  const currentWeekValue = useMemo(() => {
    const cs = mondayOf(selDate);
    return iso(cs.getFullYear(), cs.getMonth(), cs.getDate());
  }, [selDate]);

  const periodLabel = useMemo(() => {
    if (period === 'week') {
      const mon = mondayOf(selDate);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return fmtD(mon) + '–' + fmtD(sun);
    }
    if (period === 'custom' && customFrom && customTo)
      return fmtD(parseDate(customFrom)) + '–' + fmtD(parseDate(customTo));
    return MONTHS[m] + ' ' + y;
  }, [period, selDate, customFrom, customTo, y, m]);

  const prev = () => {
    if (period === 'week') {
      const d = mondayOf(selDate);
      d.setDate(d.getDate() - 7);
      setSelDate(iso(d.getFullYear(), d.getMonth(), d.getDate()));
    } else if (period === 'month') {
      setMonth(new Date(y, m - 1, 1));
    }
  };
  const next = () => {
    if (period === 'week') {
      const d = mondayOf(selDate);
      d.setDate(d.getDate() + 7);
      setSelDate(iso(d.getFullYear(), d.getMonth(), d.getDate()));
    } else if (period === 'month') {
      setMonth(new Date(y, m + 1, 1));
    }
  };
  const goToday = () => {
    const n = new Date();
    setMonth(new Date(n.getFullYear(), n.getMonth(), 1));
    setSelDate(iso(n.getFullYear(), n.getMonth(), n.getDate()));
    setDrillDown(false);
  };
  const onWeekClick = (ws: string) => {
    setSelDate(ws);
    setPeriod('week');
    setDrillDown(true);
  };
  const goBack = () => {
    setPeriod('month');
    setDrillDown(false);
  };
  const resetFilters = () => {
    setPeriod('month');
    setTypeFilter('all');
    setFocusFilter('all');
    setDrillDown(false);
  };

  const cardCls = 'bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm';
  const titleCls = 'text-[11px] tracking-wider text-slate-500 uppercase mb-2.5';
  const btnCls = 'px-2.5 py-1 text-xs rounded border transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary-500';
  const btnOnCls = 'px-2.5 py-1 text-xs rounded border font-semibold bg-primary-600 text-white border-primary-600';
  const flCls = 'text-[11px] text-slate-500 uppercase tracking-wide ml-1';

  const VAxis = () => (
    <div className="relative flex-none" style={{ height: 180, width: 36 }}>
      <span className="absolute right-1 font-mono text-[9px] text-slate-500" style={{ bottom: 168 }}>Макс</span>
      <span className="absolute right-1 font-mono text-[9px] text-slate-500" style={{ bottom: 123 }}>Выс</span>
      <span className="absolute right-1 font-mono text-[9px] text-slate-500" style={{ bottom: 78 }}>Сред</span>
      <span className="absolute right-1 font-mono text-[9px] text-slate-500" style={{ bottom: 33 }}>Низ</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Period navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={prev} className={btnCls}>‹</button>
        <span className="font-mono text-sm font-bold min-w-[120px] text-center text-slate-900 dark:text-white">{periodLabel}</span>
        <button onClick={next} className={btnCls}>›</button>
        <button onClick={goToday} className={btnCls}>Сегодня</button>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => setPeriod('week')} className={period === 'week' ? btnOnCls : btnCls}>Неделя</button>
          <button onClick={() => { setPeriod('month'); setDrillDown(false); }} className={period === 'month' ? btnOnCls : btnCls}>Месяц</button>
          <button onClick={() => setPeriod('custom')} className={period === 'custom' ? btnOnCls : btnCls}>Диапазон</button>
        </div>
        {period === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs" />
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs" />
            <button onClick={() => setPeriod('custom')} className={btnOnCls}>Применить</button>
          </>
        )}
        {period === 'week' && (
          <select
            value={currentWeekValue}
            onChange={e => setSelDate(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
          >
            {weekOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={flCls}>Тип</span>
        <button onClick={() => setTypeFilter('all')} className={typeFilter === 'all' ? btnOnCls : btnCls}>Всё</button>
        <button onClick={() => setTypeFilter('ice')} className={typeFilter === 'ice' ? btnOnCls : btnCls}>Лёд</button>
        <button onClick={() => setTypeFilter('off')} className={typeFilter === 'off' ? btnOnCls : btnCls}>ОФП</button>
        <span className={flCls}>Направленность</span>
        <select
          value={focusFilter}
          onChange={e => setFocusFilter(e.target.value)}
          className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs"
        >
          <option value="all">Все</option>
          {FOCI.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {drillDown && (
          <button onClick={goBack} className="border-primary-500 text-primary-500 font-semibold px-2.5 py-1 text-xs rounded border transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Вернуться
          </button>
        )}
        <button onClick={resetFilters} className={`${btnCls} ml-auto`}>Сбросить фильтры</button>
        <button onClick={onGoToExercises} className={`${btnOnCls} flex items-center gap-1`}>
          <Plus className="w-3 h-3" /> Упражнение
        </button>
      </div>

      {/* Charts + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4 min-w-0">
          {/* Chart 1 */}
          <div className={cardCls}>
            <h3 className={titleCls}>Тренировки за период · высота — уровень нагрузки · ширина — минуты · клик по дню — открыть</h3>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {FOCI.map(f => (
                <span key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-full bg-white dark:bg-slate-900 text-[10px] shadow-sm">
                  <i className="w-2 h-2 rounded-full flex-none" style={{ background: FCOL[f] }} />
                  <b style={{ color: FCOL[f] }}>{ABB[f] || f}</b>
                  <em className="not-italic text-slate-500">{f}</em>
                </span>
              ))}
            </div>
            {chart1.data.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Нет данных за период</p>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-1 items-start">
                <VAxis />
                <div className="flex items-end" style={{ gap: 26 }}>
                  {chart1.data.map(dd => (
                    <div key={dd.ds} className="flex flex-col gap-[3px] flex-none cursor-pointer" onClick={() => onOpenDate(dd.ds)}>
                      <div className="flex items-end" style={{ gap: 6 }}>
                        {dd.groups.map((g, gi) => (
                          <div key={gi} className="flex flex-col items-center">
                            <div className="flex items-end" style={{ height: 180 }}>
                              {g.items.map((it, i) => (
                                <div
                                  key={i}
                                  className={`relative flex flex-col justify-end ${i > 0 ? 'border-l border-white dark:border-slate-900' : ''}`}
                                  style={{ height: 180, width: Math.max(16, Math.round(10 + it.m / chart1.maxMin * 70)) }}
                                  title={`${it.f} · ${it.l} · ${g.tp === 'На льду' ? 'Лёд' : 'ОФП'} · ${it.m} мин`}
                                >
                                  <i style={{ display: 'block', width: '100%', height: LH[it.l], background: LCOL[it.l] }} />
                                  <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[10px] text-slate-500" style={{ top: '100%', marginTop: 2 }}>{it.m}</span>
                                  <span className="absolute left-1/2 -translate-x-1/2 text-[8px] font-bold whitespace-nowrap" style={{ top: '100%', marginTop: 13, color: FCOL[it.f] }}>{ABB[it.f] || it.f}</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-[9px] font-bold text-slate-500 tracking-wide" style={{ marginTop: 26 }}>{g.tp === 'На льду' ? 'ЛЁД' : 'ОФП'}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-center font-mono text-[10px] font-bold">{dd.ds.slice(8, 10)}.{dd.ds.slice(5, 7)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chart 2 */}
          <div className={cardCls}>
            <h3 className={titleCls}>Месяц · доминирующая направленность дня · высота — нагрузка · ширина — минуты · клик по дню — открыть</h3>
            {chart2.data.every(dd => dd.groups.length === 0) ? (
              <p className="text-sm text-slate-400 py-8 text-center">Нет данных за месяц</p>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-1 items-start">
                <VAxis />
                <div className="flex items-end" style={{ gap: 10 }}>
                  {chart2.data.map(dd => (
                    <div key={dd.ds} className="flex flex-col gap-[3px] flex-none cursor-pointer" onClick={() => onOpenDate(dd.ds)}>
                      <div className="flex items-end" style={{ gap: 2 }}>
                        {dd.groups.map((g, gi) => {
                          const it = g.b;
                          return (
                            <div key={gi} className="flex flex-col items-center">
                              <div className="flex items-end" style={{ height: 180 }}>
                                <div
                                  className="relative flex flex-col justify-end"
                                  style={{ height: 180, width: Math.max(16, Math.round(10 + it.m / chart2.maxMin * 70)) }}
                                  title={`${it.f} · ${it.l} · ${g.tp === 'На льду' ? 'Лёд' : 'ОФП'} · ${it.m} мин`}
                                >
                                  <i style={{ display: 'block', width: '100%', height: LH[it.l], background: LCOL[it.l] }} />
                                  <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[8px] text-slate-500" style={{ top: '100%', marginTop: 2 }}>{it.m}</span>
                                </div>
                              </div>
                              <div className="text-[8px] font-bold text-slate-500" style={{ marginTop: 26 }}>
                                {g.tp === 'На льду' ? 'ЛЁД' : 'ОФП'} · <span style={{ color: FCOL[it.f] }}>{ABB[it.f] || it.f}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-center font-mono text-[9px] font-bold">{dd.ds.slice(8, 10)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chart 3 */}
          <div className={cardCls}>
            <h3 className={titleCls}>Структура направленностей по неделям · длина полосы — минуты · клик по неделе — открыть её в верхнем графике</h3>
            {chart3.rows.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Нет данных</p>
            ) : (
              <div className="flex flex-col gap-2">
                {chart3.rows.map(r => (
                  <div key={r.ws} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => onWeekClick(r.ws)}>
                    <div className="w-[86px] flex-none font-mono text-[10px] text-slate-500 text-right group-hover:text-primary-500">
                      {fmtD(parseDate(r.ws))}–{fmtD(parseDate(r.we))}
                    </div>
                    <div className="flex-1 flex h-[26px] rounded overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {r.segs.map((s, i) => (
                        <div
                          key={i}
                          className="h-full flex items-center justify-center text-[9px] font-bold text-white overflow-hidden whitespace-nowrap"
                          style={{ width: `${(s.m / chart3.maxTot * 100)}%`, background: FCOL[s.f] }}
                          title={`${s.f} · ${s.m} мин`}
                        >
                          {s.m / chart3.maxTot > 0.07 ? (ABB[s.f] || '') : ''}
                        </div>
                      ))}
                    </div>
                    <div className="w-[140px] flex-none font-mono text-[10px] text-slate-500" title="В+М — доля минут с высокой и максимальной нагрузкой от общего объёма недели">
                      {r.tot ? `${r.tot} мин · В+М ${r.hm}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          <div className={cardCls}>
            <h3 className={`${titleCls} flex items-center`}>
              Неделя
              <select
                value={currentWeekValue}
                onChange={e => setSelDate(e.target.value)}
                className="ml-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono px-1 py-0.5"
              >
                {weekOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </h3>
            <div>
              <StatRow label="Тренировок" value={String(weekStats.tcount)} />
              <StatRow label="Лёд (мин / трен. блоков)" value={`${weekStats.iceMin} / ${weekStats.iceCount}`} />
              <StatRow label="ОФП (мин / трен. блоков)" value={`${weekStats.offMin} / ${weekStats.offCount}`} />
              <StatRow label="Высокая+макс" value={`${weekStats.hiPct}%`} />
              {LOADS.map((l, i) => (
                <StatRow key={l} label={l} value={String(weekStats.loadCounts[i])} />
              ))}
            </div>
          </div>

          <div className={cardCls}>
            <h3 className={titleCls}>Контроль нагрузок</h3>
            <div>
              {warns.length > 0 ? (
                warns.map((w, i) => (
                  <div key={i} className="bg-red-500/10 border border-red-500/40 rounded px-2 py-1.5 text-xs mb-1.5">
                    ⚠ {w}
                  </div>
                ))
              ) : (
                <div className="bg-green-500/10 border border-green-500/40 rounded px-2 py-1.5 text-xs">
                  ✓ Дисбалансов не обнаружено
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 text-[13px] last:border-0">
      <span className="text-slate-500">{label}</span>
      <b className="font-mono">{value}</b>
    </div>
  );
}
