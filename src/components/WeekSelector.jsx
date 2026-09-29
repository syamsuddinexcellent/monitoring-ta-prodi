import React from 'react';
import { Calendar, LayoutGrid, ListFilter, Table2 } from 'lucide-react';

export default function WeekSelector({
  weekColumns,
  selectedWeek,
  onSelectWeek,
  viewMode,
  onViewModeChange,
  students
}) {
  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* Week Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        <div className="flex items-center gap-2 mr-2 shrink-0">
          <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-4 h-4 mr-1 text-slate-400" />
            Periode:
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
            Semester Ganjil 2026/2027
          </span>
        </div>
        {[...weekColumns].reverse().map((week, idx) => {
          const isSelected = selectedWeek === week && viewMode !== 'matrix';
          let count = 0;
          students.forEach(s => {
            if (s.weeklyUpdates[week]?.reported) count++;
          });
          const hasData = count > 0;

          return (
            <button
              key={week}
              onClick={() => {
                onSelectWeek(week);
                if (viewMode === 'matrix') onViewModeChange('cards');
              }}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
              }`}
            >
              <span>{week}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : hasData
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {count}/{students.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* View Mode Toggle: Cards, Table, Matrix */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start md:self-auto border border-slate-200 shrink-0">
        <button
          onClick={() => onViewModeChange('cards')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'cards'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Tampilan Kartu"
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
          title="Tampilan Tabel"
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
          title="Matriks Semua Minggu"
        >
          <Table2 className="w-3.5 h-3.5" />
          <span>Matriks Lintas Periode</span>
        </button>
      </div>
    </div>
  );
}
