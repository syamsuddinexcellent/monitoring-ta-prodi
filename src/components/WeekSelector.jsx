import React from 'react';
import { Calendar, ChevronDown, LayoutGrid, ListFilter, Table2 } from 'lucide-react';

export default function WeekSelector({
  weekColumns,
  selectedWeek,
  onSelectWeek,
  viewMode,
  onViewModeChange,
  students,
  selectedSemester,
  onSelectSemester,
  availableSemesters = [],
  verifData = {},
}) {
  const total = students.length;
  const laporMap = {};
  const verifMap = {};
  weekColumns.forEach(w => {
    laporMap[w] = students.filter(s => s.weeklyUpdates[w]?.reported).length;
    verifMap[w] = students.filter(s => {
      const upd = s.weeklyUpdates[w];
      if (!upd?.reported) return false;
      return verifData[s.nim]?.[w]?.verified || upd?.sessionVerified;
    }).length;
  });

  const reversedWeeks = [...weekColumns].reverse();

  return (
    <div className="bg-white rounded-xl px-3 py-2.5 sm:px-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
      {/* Left: Semester + Periode dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">Periode:</span>

        {/* Semester dropdown */}
        <div className="relative">
          <select
            value={selectedSemester}
            onChange={e => onSelectSemester?.(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer"
          >
            {availableSemesters.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-600" />
        </div>

        {/* Periode dropdown */}
        <div className="relative">
          <select
            value={viewMode === 'matrix' ? '' : selectedWeek}
            onChange={e => {
              if (!e.target.value) return;
              onSelectWeek(e.target.value);
              if (viewMode === 'matrix') onViewModeChange('cards');
            }}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-white border border-slate-600 outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
          >
            {viewMode === 'matrix' && (
              <option value="">— Semua Periode —</option>
            )}
            {reversedWeeks.map((week) => {
              const pNum = weekColumns.indexOf(week) + 1;
              const lapor = laporMap[week] ?? 0;
              const verif = verifMap[week] ?? 0;
              const label = `P${pNum} · ${week}  (${verif} verif / ${lapor} lapor / ${total} total)`;
              return (
                <option key={week} value={week}>{label}</option>
              );
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
        </div>

      </div>

      {/* Right: View Mode Toggle */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto border border-slate-200 shrink-0">
        <button
          onClick={() => onViewModeChange('cards')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'cards'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Kartu</span>
        </button>

        <button
          onClick={() => onViewModeChange('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'table'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Tabel</span>
        </button>

        <button
          onClick={() => onViewModeChange('matrix')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'matrix'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Table2 className="w-3.5 h-3.5" />
          <span>Matriks Lintas Periode</span>
        </button>
      </div>
    </div>
  );
}
