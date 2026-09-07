import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { Team, TrainingType, Load } from '@/lib/types';
import { TEAMS, TRAINING_TYPES, LOADS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { Upload, FileSpreadsheet, Check, AlertCircle, X } from 'lucide-react';

interface ParsedRow {
  rowIndex: number;
  team: Team;
  date: string;
  type: TrainingType;
  focus: string;
  subtype: string | null;
  duration: number;
  load: Load;
  error?: string;
}

interface Props {
  defaultTeam: Team;
  canEditTeam: (team: Team) => boolean;
  onDone: () => void;
}

const HEADER_MAP: Record<string, string> = {
  'дата': 'date',
  'тип тренировки': 'type',
  'тип': 'type',
  'направленность': 'focus',
  'подтип': 'subtype',
  'объем': 'duration',
  'объём': 'duration',
  'объем (мин)': 'duration',
  'объём (мин)': 'duration',
  'уровень нагрузки': 'load',
  'нагрузка': 'load',
  'команда': 'team',
};

function normalizeDate(val: unknown): string | null {
  if (val == null || val === '') return null;
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  const d1 = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/);
  if (d1) {
    let y = d1[3];
    if (y.length === 2) y = '20' + y;
    return `${y}-${d1[2].padStart(2, '0')}-${d1[1].padStart(2, '0')}`;
  }
  const d2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (d2) return s;
  return null;
}

function normalizeDuration(val: unknown): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  const range = s.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) return parseInt(range[1], 10);
  const num = s.match(/(\d+)/);
  if (num) return parseInt(num[1], 10);
  return 0;
}

function normalizeType(val: unknown): TrainingType | null {
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (s.includes('льд') || s === 'л' || s.includes('на льду')) return 'На льду';
  if (s.includes('офп') || s.includes('сфп') || s === 'о' || s.includes('офп/сфп')) return 'ОФП/СФП';
  return null;
}

function normalizeLoad(val: unknown): Load | null {
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  for (const l of LOADS) {
    if (s === l.toLowerCase() || s === l.toLowerCase()[0]) return l;
  }
  return null;
}

export function ExcelImport({ defaultTeam, canEditTeam, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState<Team>(defaultTeam);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileTeam, setFileTeam] = useState<Team | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

    let headerRow = -1;
    let colMap: Record<string, number> = {};
    for (let i = 0; i < Math.min(raw.length, 20); i++) {
      const row = raw[i];
      let found = 0;
      const map: Record<string, number> = {};
      for (let c = 0; c < row.length; c++) {
        const h = String(row[c] || '').trim().toLowerCase();
        if (HEADER_MAP[h]) {
          map[HEADER_MAP[h]] = c;
          found++;
        }
      }
      if (found >= 2) {
        headerRow = i;
        colMap = map;
        break;
      }
    }

    if (headerRow === -1) {
      setRows([{ rowIndex: 0, team, date: '', type: 'На льду', focus: '', subtype: null, duration: 0, load: 'Низкий', error: 'Не найдена строка заголовков (Дата, Тип тренировки, Направленность…)' }]);
      return;
    }

    const detectedTeam = colMap['team'] !== undefined ? String(raw[headerRow][colMap['team']] || '').trim() as Team : null;
    if (detectedTeam && TEAMS.includes(detectedTeam)) {
      setFileTeam(detectedTeam);
      setTeam(detectedTeam);
    }

    const parsed: ParsedRow[] = [];
    for (let i = headerRow + 1; i < raw.length; i++) {
      const row = raw[i];
      if (row.every(c => c === '' || c == null)) continue;

      const rowIndex = i + 1;
      const dateRaw = colMap['date'] !== undefined ? row[colMap['date']] : '';
      const date = normalizeDate(dateRaw);
      const typeRaw = colMap['type'] !== undefined ? row[colMap['type']] : '';
      const type = normalizeType(typeRaw);
      const focus = colMap['focus'] !== undefined ? String(row[colMap['focus']] || '').trim() : '';
      const subtypeRaw = colMap['subtype'] !== undefined ? String(row[colMap['subtype']] || '').trim() : '';
      const subtype = subtypeRaw ? subtypeRaw : null;
      const duration = normalizeDuration(colMap['duration'] !== undefined ? row[colMap['duration']] : 0);
      const loadRaw = colMap['load'] !== undefined ? row[colMap['load']] : '';
      const load = normalizeLoad(loadRaw);

      const errors: string[] = [];
      if (!date) errors.push('дата не распознана');
      if (!type) errors.push('тип не распознан');
      if (!focus) errors.push('нет направленности');
      if (!load) errors.push('нагрузка не из списка');

      parsed.push({
        rowIndex,
        team,
        date: date || '',
        type: type || 'На льду',
        focus,
        subtype,
        duration,
        load: load || 'Низкий',
        error: errors.length > 0 ? errors.join('; ') : undefined,
      });
    }

    setRows(parsed);
    setResult(null);
  };

  const validRows = rows.filter(r => !r.error);
  const errorRows = rows.filter(r => r.error);

  const doImport = async () => {
    setImporting(true);
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < validRows.length; i += 50) {
      const batch = validRows.slice(i, i + 50).map(r => ({
        team: r.team,
        date: r.date,
        type: r.type,
        focus: r.focus,
        subtype: r.subtype,
        duration: r.duration,
        load: r.load,
        note: null,
      }));
      const { error } = await supabase.from('trainings').insert(batch);
      if (error) {
        fail += batch.length;
      } else {
        ok += batch.length;
      }
    }
    setImporting(false);
    setResult({ ok, fail });
    if (ok > 0) onDone();
  };

  const reset = () => {
    setRows([]);
    setResult(null);
    setFileTeam(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-success-600 hover:bg-success-700 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4" /> Импорт Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5" /> Импорт Excel
              </h2>
              <button onClick={close} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {rows.length === 0 && !result && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1.5">Команда</label>
                  <select
                    value={team}
                    onChange={e => setTeam(e.target.value as Team)}
                    className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm w-full max-w-xs"
                  >
                    {TEAMS.filter(t => canEditTeam(t)).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/5 transition-colors"
                >
                  <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">Выберите .xlsx файл</p>
                  <p className="text-xs text-slate-400 mt-1">Колонки: Дата, Тип тренировки, Направленность, Подтип, Объём (мин), Уровень нагрузки</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>
              </div>
            )}

            {rows.length > 0 && !result && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-success-600 dark:text-success-400 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" /> Будет импортировано: {validRows.length}
                  </span>
                  {errorRows.length > 0 && (
                    <span className="text-error-600 dark:text-error-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Ошибок: {errorRows.length}
                    </span>
                  )}
                </div>

                {errorRows.length > 0 && (
                  <div className="bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {errorRows.map((r, i) => (
                      <div key={i} className="text-xs text-error-700 dark:text-error-300">
                        Строка {r.rowIndex}: {r.error}
                      </div>
                    ))}
                  </div>
                )}

                <div className="overflow-x-auto max-h-[300px] border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                      <tr className="text-slate-500">
                        <th className="text-left px-2 py-1.5">Стр.</th>
                        <th className="text-left px-2 py-1.5">Дата</th>
                        <th className="text-left px-2 py-1.5">Тип</th>
                        <th className="text-left px-2 py-1.5">Направленность</th>
                        <th className="text-left px-2 py-1.5">Подтип</th>
                        <th className="text-right px-2 py-1.5">Мин</th>
                        <th className="text-left px-2 py-1.5">Нагрузка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className={`border-t border-slate-100 dark:border-slate-800/50 ${r.error ? 'bg-error-50/50 dark:bg-error-500/5' : ''}`}>
                          <td className="px-2 py-1 text-slate-400">{r.rowIndex}</td>
                          <td className="px-2 py-1 text-slate-700 dark:text-slate-300">{r.date || '—'}</td>
                          <td className="px-2 py-1 text-slate-700 dark:text-slate-300">{r.type}</td>
                          <td className="px-2 py-1 text-slate-700 dark:text-slate-300">{r.focus || '—'}</td>
                          <td className="px-2 py-1 text-slate-500">{r.subtype || '—'}</td>
                          <td className="px-2 py-1 text-right text-slate-700 dark:text-slate-300">{r.duration}</td>
                          <td className="px-2 py-1 text-slate-700 dark:text-slate-300">{r.load}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={doImport}
                    disabled={importing || validRows.length === 0}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
                  >
                    {importing ? 'Импорт…' : `Импортировать ${validRows.length} строк`}
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg py-2.5 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Другой файл
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div className="text-center py-8">
                <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center ${result.ok > 0 ? 'bg-success-100 dark:bg-success-500/20' : 'bg-error-100 dark:bg-error-500/20'}`}>
                  {result.ok > 0 ? <Check className="w-7 h-7 text-success-600" /> : <AlertCircle className="w-7 h-7 text-error-600" />}
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-white">Импортировано: {result.ok}</p>
                {result.fail > 0 && <p className="text-sm text-error-500 mt-1">Ошибок: {result.fail}</p>}
                <button onClick={close} className="mt-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-6 py-2 transition-colors">
                  Готово
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
