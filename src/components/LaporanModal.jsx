import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle2, AlertCircle, FileText, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

const KATEGORI = [
  'BAP Proposal/Seminar Hasil/Sidang',
  'Penulisan Naskah BAB 1-5',
  'Coding/Implementasi',
  'SemPro/Semhas/Sidang',
  'Diskusi',
  'Lainnya',
];

function getLocalReports(nim) {
  try {
    const all = JSON.parse(localStorage.getItem('mahasiswa_reports') || '{}');
    return all[nim] || {};
  } catch { return {}; }
}

function trackReadLocally(nim, week, dosenHadir, mahasiswaName, submittedAt) {
  try {
    const inbox = JSON.parse(localStorage.getItem('dosen_laporan') || '{}');
    (dosenHadir || []).forEach(({ name: dosenName }) => {
      if (!dosenName) return;
      if (!inbox[dosenName]) inbox[dosenName] = [];
      inbox[dosenName] = inbox[dosenName].filter(r => !(r.nim === nim && r.week === week));
      inbox[dosenName].unshift({ nim, nama: mahasiswaName || nim, week, submittedAt, read: false });
    });
    localStorage.setItem('dosen_laporan', JSON.stringify(inbox));
  } catch {}
}

async function saveReport(nim, week, data, mahasiswaName) {
  const submittedAt = new Date().toISOString();
  if (supabase) {
    const { error } = await supabase.from('laporan_bimbingan').upsert({
      nim, nama: mahasiswaName || nim, week,
      category: data.category,
      progress: data.progress,
      next_target: data.next,
      dosen_hadir: data.dosenHadir || [],
      submitted_at: submittedAt,
    }, { onConflict: 'nim,week' });
    if (!error) {
      trackReadLocally(nim, week, data.dosenHadir, mahasiswaName, submittedAt);
      return true;
    }
  }
  // Fallback: localStorage
  try {
    const all = JSON.parse(localStorage.getItem('mahasiswa_reports') || '{}');
    if (!all[nim]) all[nim] = {};
    all[nim][week] = { ...data, submittedAt, source: 'local' };
    localStorage.setItem('mahasiswa_reports', JSON.stringify(all));
    trackReadLocally(nim, week, data.dosenHadir, mahasiswaName, submittedAt);
    return true;
  } catch { return false; }
}

export async function getLocalReportsForNim(nim) {
  if (supabase) {
    const { data, error } = await supabase
      .from('laporan_bimbingan')
      .select('*')
      .eq('nim', nim);
    if (!error && data) {
      const result = {};
      data.forEach(r => {
        result[r.week] = {
          reported: true,
          progress: r.progress,
          next: r.next_target,
          category: r.category,
          dosenHadir: r.dosen_hadir,
          submittedAt: r.submitted_at,
        };
      });
      return result;
    }
  }
  return getLocalReports(nim);
}

export async function getDosenLaporan(dosenName) {
  if (supabase) {
    const { data, error } = await supabase
      .from('laporan_bimbingan')
      .select('*')
      .contains('dosen_hadir', [{ name: dosenName }])
      .order('submitted_at', { ascending: false });
    if (!error && data) {
      const inbox = JSON.parse(localStorage.getItem('dosen_laporan') || '{}');
      const readKeys = new Set(
        (inbox[dosenName] || []).filter(r => r.read).map(r => `${r.nim}|${r.week}`)
      );
      return data.map(r => ({
        nim: r.nim, nama: r.nama, week: r.week,
        category: r.category, progress: r.progress,
        next: r.next_target, dosenHadir: r.dosen_hadir,
        submittedAt: r.submitted_at,
        read: readKeys.has(`${r.nim}|${r.week}`),
      }));
    }
  }
  try {
    const inbox = JSON.parse(localStorage.getItem('dosen_laporan') || '{}');
    return inbox[dosenName] || [];
  } catch { return []; }
}

export async function deleteReport(nim, week) {
  if (supabase) {
    const { error } = await supabase
      .from('laporan_bimbingan')
      .delete()
      .eq('nim', nim)
      .eq('week', week);
    if (!error) {
      // Clean up local read-tracking too
      try {
        const inbox = JSON.parse(localStorage.getItem('dosen_laporan') || '{}');
        Object.keys(inbox).forEach(d => {
          inbox[d] = inbox[d].filter(r => !(r.nim === nim && r.week === week));
        });
        localStorage.setItem('dosen_laporan', JSON.stringify(inbox));
      } catch {}
      return true;
    }
  }
  // Fallback: localStorage
  try {
    const all = JSON.parse(localStorage.getItem('mahasiswa_reports') || '{}');
    if (all[nim]) {
      delete all[nim][week];
      localStorage.setItem('mahasiswa_reports', JSON.stringify(all));
    }
    return true;
  } catch { return false; }
}

export function markDosenLaporanRead(dosenName, nim, week) {
  try {
    const inbox = JSON.parse(localStorage.getItem('dosen_laporan') || '{}');
    if (!inbox[dosenName]) inbox[dosenName] = [];
    const idx = inbox[dosenName].findIndex(r => r.nim === nim && r.week === week);
    if (idx >= 0) {
      inbox[dosenName][idx] = { ...inbox[dosenName][idx], read: true };
    } else {
      inbox[dosenName].unshift({ nim, week, read: true });
    }
    localStorage.setItem('dosen_laporan', JSON.stringify(inbox));
  } catch {}
}

const MONTH_ID = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

export function parseWeekRange(weekStr) {
  const match = weekStr.match(/^(\d+)\s*-\s*(\d+)\s+(\w+)\s+(\d+)/);
  if (!match) return null;
  const [, startDay, endDay, monthName, yearSuffix] = match;
  const endMonth = MONTH_ID[monthName.toLowerCase()];
  if (endMonth === undefined) return null;
  const year = 2000 + parseInt(yearSuffix, 10);
  const end = new Date(year, endMonth, parseInt(endDay, 10));
  let startMonth = endMonth;
  let startYear = year;
  if (parseInt(startDay, 10) > parseInt(endDay, 10)) {
    startMonth = endMonth - 1;
    if (startMonth < 0) { startMonth = 11; startYear -= 1; }
  }
  return { start: new Date(startYear, startMonth, parseInt(startDay, 10)), end };
}

function findCurrentWeek(weekColumns) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const w of weekColumns) {
    const range = parseWeekRange(w);
    if (range && today >= range.start && today <= range.end) return w;
  }
  return null;
}

function getDefaultWeek(weekColumns, existingData) {
  const unreported = weekColumns.filter(w => !existingData?.[w]?.reported);
  const current = findCurrentWeek(unreported);
  if (current) return current;
  return unreported[0] || '';
}

export default function LaporanModal({
  isOpen, onClose, weekColumns, nim, mahasiswaName = '', existingData,
  pembimbing1 = '', pembimbing2 = '', penguji1 = '', penguji2 = '',
  forceWeek = '',
}) {
  const dosenList = [
    { key: 'p1',  label: 'P1',  name: pembimbing1 },
    { key: 'p2',  label: 'P2',  name: pembimbing2 },
    { key: 'pj1', label: 'Pj1', name: penguji1 },
    { key: 'pj2', label: 'Pj2', name: penguji2 },
  ].filter(d => d.name);

  const [week, setWeek]           = useState(() => getDefaultWeek(weekColumns, existingData));
  const [kategori, setKategori]   = useState(KATEGORI[0]);
  const [progres, setProgres]     = useState('');
  const [next, setNext]           = useState('');
  const [dosenHadir, setDosenHadir] = useState(new Set());
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  const toggleDosen = (key) => {
    setDosenHadir(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Reset form each time the modal opens
  useEffect(() => {
    if (isOpen) {
      if (forceWeek) {
        // Edit mode: pre-fill with existing data for that week
        setWeek(forceWeek);
        const existing = existingData?.[forceWeek];
        setProgres(existing?.progress || '');
        setNext(existing?.next || '');
        setKategori(existing?.category && KATEGORI.includes(existing.category) ? existing.category : KATEGORI[0]);
        const existingDosen = new Set(
          (existing?.dosenHadir || []).map(d =>
            d.label === 'P1' ? 'p1' : d.label === 'P2' ? 'p2' : d.label === 'Pj1' ? 'pj1' : d.label === 'Pj2' ? 'pj2' : null
          ).filter(Boolean)
        );
        setDosenHadir(existingDosen);
      } else {
        const defaultWeek = getDefaultWeek(weekColumns, existingData);
        setWeek(defaultWeek);
        setProgres(''); setNext(''); setKategori(KATEGORI[0]);
        setDosenHadir(new Set());
      }
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  // When week changes in new-report mode, pre-fill if existing data is available
  useEffect(() => {
    if (!forceWeek && week) {
      const existing = existingData?.[week];
      if (existing?.reported) {
        setProgres(existing.progress || '');
        setNext(existing.next || '');
        setKategori(existing.category && KATEGORI.includes(existing.category) ? existing.category : KATEGORI[0]);
        const existingDosen = new Set(
          (existing.dosenHadir || []).map(d =>
            d.label === 'P1' ? 'p1' : d.label === 'P2' ? 'p2' : d.label === 'Pj1' ? 'pj1' : d.label === 'Pj2' ? 'pj2' : null
          ).filter(Boolean)
        );
        setDosenHadir(existingDosen);
      } else {
        setProgres(''); setNext(''); setKategori(KATEGORI[0]);
        setDosenHadir(new Set());
      }
    }
  }, [week]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!week) { setError('Pilih periode terlebih dahulu.'); return; }
    if (!progres.trim()) { setError('Isian progres tidak boleh kosong.'); return; }
    const selectedDosen = dosenList
      .filter(d => dosenHadir.has(d.key))
      .map(d => ({ label: d.label, name: d.name }));
    const ok = await saveReport(nim, week, {
      reported: true,
      progress: progres.trim(),
      next: next.trim(),
      category: kategori,
      dosenHadir: selectedDosen,
    }, mahasiswaName);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setWeek(''); setProgres(''); setNext(''); setKategori(KATEGORI[0]);
        setDosenHadir(new Set());
        onClose();
      }, 1400);
    } else {
      setError('Gagal menyimpan. Coba lagi.');
    }
  };

  // Only show weeks that haven't been reported yet (but include forceWeek for editing)
  const unreported = weekColumns.filter(w => !existingData?.[w]?.reported || w === forceWeek);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Laporan Progres Bimbingan</h2>
              <p className="text-xs text-white/70">Isi progres TA periode ini</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Semua periode sudah terkunci */}
        {unreported.length === 0 && (
          <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Semua periode sudah dilaporkan</p>
              <p className="text-xs text-slate-500 mt-1">Tidak ada periode yang tersisa untuk dilaporkan.</p>
            </div>
            <button type="button" onClick={onClose}
              className="mt-2 px-5 py-2 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-colors">
              Tutup
            </button>
          </div>
        )}

        {/* Form */}
        {unreported.length > 0 && <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Laporan berhasil disimpan!
            </div>
          )}

          {/* Periode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Periode <span className="text-red-500">*</span>
            </label>
            <select
              value={week}
              onChange={e => setWeek(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 text-slate-800"
            >
              <option value="">-- Pilih Periode --</option>
              {unreported.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          {/* Kategori Tahapan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tahapan / Kategori</label>
            <select
              value={kategori}
              onChange={e => setKategori(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 text-slate-800"
            >
              {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Progres */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Progres Periode Ini <span className="text-red-500">*</span>
            </label>
            <textarea
              value={progres}
              onChange={e => setProgres(e.target.value)}
              placeholder="Contoh: Sudah menyelesaikan implementasi model, akurasi mencapai 87%..."
              rows={3}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Next */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Periode Depan
            </label>
            <textarea
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="Contoh: Menyelesaikan bab 4 dan mulai penulisan bab 5..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Pilihan Dosen */}
          {dosenList.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bimbingan dengan</span>
                <span className="ml-auto text-[10px] text-slate-400">Pilih yang hadir</span>
              </div>
              <div className="p-3 flex flex-col gap-2">
                {dosenList.map(d => {
                  const selected = dosenHadir.has(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDosen(d.key)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'bg-brand-50 border-brand-400 ring-1 ring-brand-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected ? 'bg-brand-600 border-brand-600' : 'border-slate-300'
                      }`}>
                        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-bold uppercase tracking-wider mr-1.5 ${selected ? 'text-brand-600' : 'text-slate-400'}`}>
                          {d.label}
                        </span>
                        <span className="text-sm font-medium text-slate-800 truncate block">{d.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button type="submit" disabled={success}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg transition-all shadow-sm">
            <Send className="w-4 h-4" />
            Simpan Laporan
          </button>
        </form>}
      </div>
    </div>
  );
}
