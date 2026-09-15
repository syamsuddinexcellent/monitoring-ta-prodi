import React from 'react';
import { Search, X, Users, UserCheck } from 'lucide-react';

export default function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  angkatanFilter,
  onAngkatanFilterChange,
  availableAngkatan,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  lecturerFilter,
  onLecturerFilterChange,
  availableLecturers,
  unreportedCount,
  onOpenBulkReminder
}) {
  const isMyStudentsActive = lecturerFilter === 'M. Syamsuddin Wisnubroto, S.Si., M.Si.';

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Cari berdasarkan nama mahasiswa atau NIM..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter: Bimbingan MSW */}
        <button
          onClick={() => {
            if (isMyStudentsActive) {
              onLecturerFilterChange('all');
            } else {
              onLecturerFilterChange('M. Syamsuddin Wisnubroto, S.Si., M.Si.');
            }
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
            isMyStudentsActive
              ? 'bg-brand-600 text-white border-brand-700 shadow-xs'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
          }`}
          title="Filter cepat khusus mahasiswa bimbingan Pak M. Syamsuddin Wisnubroto"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>{isMyStudentsActive ? '✓ Mahasiswa Bimbingan Saya' : 'Mahasiswa Bimbingan Saya'}</span>
        </button>

        {/* Bulk Reminder to Group Button */}
        {unreportedCount > 0 && (
          <button
            onClick={onOpenBulkReminder}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-xs shrink-0"
            title="Kirim pengingat ke grup WhatsApp bimbingan"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kirim ke Grup WA ({unreportedCount} Belum Lapor)</span>
          </button>
        )}
      </div>

      {/* Filter Dropdowns Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">Semua Status Lapor</option>
          <option value="reported">Sudah Lapor</option>
          <option value="unreported">Belum Lapor</option>
        </select>

        {/* Angkatan Filter */}
        <select
          value={angkatanFilter}
          onChange={e => onAngkatanFilterChange(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">Semua Angkatan</option>
          {availableAngkatan.map(ang => (
            <option key={ang} value={ang}>
              Angkatan {ang}
            </option>
          ))}
        </select>

        {/* Dosen Pembimbing Filter */}
        <select
          value={lecturerFilter}
          onChange={e => onLecturerFilterChange(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 max-w-[220px] truncate"
        >
          <option value="all">Semua Dosen Pembimbing</option>
          {availableLecturers.map(lect => (
            <option key={lect} value={lect}>
              {lect}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={e => onCategoryFilterChange(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">Semua Tahapan</option>
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
