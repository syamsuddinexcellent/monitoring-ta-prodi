import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Users, UserCheck, ChevronDown, Check } from 'lucide-react';

function LecturerDropdown({ lecturerFilter, onLecturerFilterChange, availableLecturers }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isFiltered = lecturerFilter !== 'all';
  const filtered = availableLecturers.filter(l =>
    l.toLowerCase().includes(search.toLowerCase())
  );

  const label = isFiltered ? lecturerFilter : 'Mahasiswa Bimbingan';
  const shortLabel = isFiltered
    ? (lecturerFilter.includes('|') ? 'Dosen Luar' : lecturerFilter.split(',')[0])
    : 'Mahasiswa Bimbingan';

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all w-full max-w-[260px] ${
          isFiltered
            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
        }`}
      >
        <UserCheck className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1 text-left">{shortLabel}</span>
        {isFiltered && (
          <button
            onClick={e => { e.stopPropagation(); onLecturerFilterChange('all'); setOpen(false); }}
            className="ml-0.5 text-white/70 hover:text-white shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${isFiltered ? 'text-white/70' : 'text-indigo-400'}`} />
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-1.5 left-0 w-72 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Search inside dropdown */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama dosen..."
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {/* "Semua" option */}
            <button
              onClick={() => { onLecturerFilterChange('all'); setOpen(false); setSearch(''); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left ${
                !isFiltered ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-slate-600'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="flex-1">Semua Dosen (Tampilkan Semua)</span>
              {!isFiltered && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
            </button>

            <div className="h-px bg-slate-100 mx-2" />

            {filtered.length === 0 && (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">
                Tidak ada dosen ditemukan
              </div>
            )}
            {filtered.map(lect => {
              const active = lecturerFilter === lect;
              return (
                <button
                  key={lect}
                  onClick={() => { onLecturerFilterChange(lect); setOpen(false); setSearch(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left ${
                    active ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-slate-700'
                  }`}
                >
                  <UserCheck className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-indigo-500' : 'text-slate-300'}`} />
                  <span className="flex-1 truncate">{lect}</span>
                  {active && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
  onOpenBulkReminder,
  isAdmin = false,
  isDosen = false,
}) {
  return (
    <div className="bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-xs flex items-center gap-2 min-w-0">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Cari berdasarkan nama mahasiswa atau NIM..."
          className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
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

      {/* Right side: all filters in a row */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dosen Bimbingan — locked badge for dosen role, dropdown for admin */}
        {isDosen ? (
          <div className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border bg-indigo-600 text-white border-indigo-700 shadow-xs shrink-0">
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[160px] text-left">{lecturerFilter !== 'all' ? (lecturerFilter.includes('|') ? 'Dosen Luar' : lecturerFilter.split(',')[0]) : 'Mahasiswa Bimbingan'}</span>
          </div>
        ) : (
          <LecturerDropdown
            lecturerFilter={lecturerFilter}
            onLecturerFilterChange={onLecturerFilterChange}
            availableLecturers={availableLecturers}
          />
        )}

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value)}
          className="shrink-0 px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">Status Lapor</option>
          <option value="reported">Sudah Lapor</option>
          <option value="unreported">Belum Lapor</option>
        </select>

        {/* Angkatan Filter */}
        <select
          value={angkatanFilter}
          onChange={e => onAngkatanFilterChange(e.target.value)}
          className="shrink-0 px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">Angkatan</option>
          {availableAngkatan.map(ang => (
            <option key={ang} value={ang}>Angkatan {ang}</option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={e => onCategoryFilterChange(e.target.value)}
          className="shrink-0 px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">Tahapan</option>
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Bulk Reminder — admin only */}
        {isAdmin && unreportedCount > 0 && (
          <button
            onClick={onOpenBulkReminder}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-xs"
            title="Kirim pengingat ke grup WhatsApp bimbingan"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kirim ke Grup WA ({unreportedCount} Belum Lapor)</span>
          </button>
        )}
      </div>
    </div>
  );
}
