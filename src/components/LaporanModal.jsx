import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle2, AlertCircle, FileText, Users, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';

const KATEGORI = [
  'BAP Proposal/Seminar Hasil/Sidang',
  'Penulisan Naskah BAB 1-5',
  'Coding/Implementasi',
  'SemPro/Semhas/Sidang',
  'Diskusi',
  'Lainnya',
];

export const MAX_SESSIONS = 4;

function getLocalReports(nim) {
  try {
    const all = JSON.parse(localStorage.getItem('mahasiswa_reports') || '{}');
    return all[nim] || {};
  } catch { return {}; }
}

// Handle both old (array) and new ({tanggal, list}) dosen_hadir formats
function normalizeDosenHadir(dh) {
  if (Array.isArray(dh)) return { list: dh, tanggal: null };
  if (dh && typeof dh === 'object') return { list: dh.list || [], tanggal: dh.tanggal || null };
  return { list: [], tanggal: null };
}

// Get sessions array from dosen_hadir field (handles old and new formats)
export function getSessions(dh) {
  if (!dh) return [];
  if (dh.sessions && Array.isArray(dh.sessions)) return dh.sessions;
  return [];
}

// Count sessions for a weekData object (handles old format as 1 session)
export function getSessionCount(weekData) {
  if (!weekData?.reported) return 0;
  if (weekData.sessions?.length > 0) return weekData.sessions.length;
  return 1; // Old format: treat as 1 session
}

// Migrate old dosen_hadir format + row data into a sessions array
function migrateToSessions(existingRow) {
  const old = normalizeDosenHadir(existingRow.dosen_hadir);
  const dosen = old.list[0] || null; // Old format could have multiple, take first
  return [{
    ke: 1,
    tanggal: old.tanggal || null,
    dosen: dosen,
    category: existingRow.category || KATEGORI[0],
    progress: existingRow.progress || '',
    next: existingRow.next_target || '',
    submitted_at: existingRow.submitted_at || null,
    verified_at: null,
    verified_by: null,
  }];
}

function trackReadLocally(nim, week, selectedDosen, mahasiswaName, submittedAt) {
  try {
    const inbox = JSON.parse(localStorage.getItem('dosen_laporan') || '{}');
    const dosenList = selectedDosen ? [selectedDosen] : [];
    dosenList.forEach(({ name: dosenName }) => {
      if (!dosenName) return;
      if (!inbox[dosenName]) inbox[dosenName] = [];
      inbox[dosenName] = inbox[dosenName].filter(r => !(r.nim === nim && r.week === week));
      inbox[dosenName].unshift({ nim, nama: mahasiswaName || nim, week, submittedAt, read: false });
    });
    localStorage.setItem('dosen_laporan', JSON.stringify(inbox));
  } catch {}
}

// Append a new session or replace the last session (editMode)
async function saveReport(nim, week, data, mahasiswaName, editMode = false) {
  const submittedAt = new Date().toISOString();

  if (supabase) {
    // Fetch existing row to preserve/migrate sessions
    const { data: existing } = await supabase
      .from('laporan_bimbingan')
      .select('*')
      .eq('nim', nim)
      .eq('week', week)
      .maybeSingle();

    let existingSessions = getSessions(existing?.dosen_hadir);

    // Migrate old format to sessions if needed
    if (existingSessions.length === 0 && existing && (existing.progress || existing.category)) {
      existingSessions = migrateToSessions(existing);
    }

    const newSession = {
      ke: editMode ? (existingSessions.length || 1) : existingSessions.length + 1,
      tanggal: data.tanggalBimbingan || null,
      dosen: data.selectedDosen || null,
      category: data.category,
      progress: data.progress,
      next: data.next,
      submitted_at: submittedAt,
      verified_at: null,
      verified_by: null,
    };

    let sessions;
    if (editMode && existingSessions.length > 0) {
      // Replace last session
      sessions = [...existingSessions.slice(0, -1), newSession];
    } else {
      // Append new session
      sessions = [...existingSessions, newSession];
    }

    const { error } = await supabase.from('laporan_bimbingan').upsert({
      nim, nama: mahasiswaName || nim, week,
      category: data.category,
      progress: data.progress,
      next_target: data.next,
      dosen_hadir: { sessions },
      submitted_at: submittedAt,
    }, { onConflict: 'nim,week' });

    if (!error) {
      trackReadLocally(nim, week, data.selectedDosen, mahasiswaName, submittedAt);
      return true;
    }
  }

  // Fallback: localStorage
  try {
    const all = JSON.parse(localStorage.getItem('mahasiswa_reports') || '{}');
    if (!all[nim]) all[nim] = {};
    all[nim][week] = { ...data, submittedAt, source: 'local' };
    localStorage.setItem('mahasiswa_reports', JSON.stringify(all));
    trackReadLocally(nim, week, data.selectedDosen, mahasiswaName, submittedAt);
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
        let sessions = getSessions(r.dosen_hadir);
        // Migrate old format
        if (sessions.length === 0 && (r.progress || r.category)) {
          sessions = migrateToSessions(r);
        }
        const lastSession = sessions[sessions.length - 1];
        result[r.week] = {
          reported: true,
          sessions,
          progress: lastSession?.progress || r.progress,
          next: lastSession?.next || r.next_target,
          category: lastSession?.category || r.category,
          dosenHadir: sessions.map(s => s.dosen).filter(Boolean),
          tanggalBimbingan: lastSession?.tanggal || normalizeDosenHadir(r.dosen_hadir).tanggal,
          submittedAt: r.submitted_at,
          _appReport: true,
        };
      });
      return result;
    }
  }
  return getLocalReports(nim);
}

export async function getDosenLaporan(dosenName) {
  const dosenNames = dosenName.split('|').map(n => n.trim()).filter(Boolean);
  if (supabase) {
    const { data, error } = await supabase
      .from('laporan_bimbingan')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (!error && data) {
      const inbox = JSON.parse(localStorage.getItem('dosen_laporan') || '{}');
      const readKeys = new Set(
        dosenNames.flatMap(n => (inbox[n] || []).filter(r => r.read).map(r => `${r.nim}|${r.week}`))
      );
      return data
        .filter(r => {
          const sessions = getSessions(r.dosen_hadir);
          if (sessions.length > 0) {
            return sessions.some(s => s.dosen && dosenNames.includes(s.dosen.name));
          }
          return normalizeDosenHadir(r.dosen_hadir).list.some(d => dosenNames.includes(d.name));
        })
        .map(r => {
          const sessions = getSessions(r.dosen_hadir);
          const dosenSessions = sessions.length > 0
            ? sessions.filter(s => s.dosen && dosenNames.includes(s.dosen.name))
            : normalizeDosenHadir(r.dosen_hadir).list
                .filter(d => dosenNames.includes(d.name))
                .map(d => ({ ke: 1, dosen: d, tanggal: normalizeDosenHadir(r.dosen_hadir).tanggal }));
          return {
            nim: r.nim, nama: r.nama, week: r.week,
            category: r.category, progress: r.progress,
            next: r.next_target,
            dosenHadir: normalizeDosenHadir(r.dosen_hadir).list,
            sessions: dosenSessions,
            allSessions: sessions,
            tanggalBimbingan: normalizeDosenHadir(r.dosen_hadir).tanggal,
            submittedAt: r.submitted_at,
            read: readKeys.has(`${r.nim}|${r.week}`),
          };
        });
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
  try {
    const all = JSON.parse(localStorage.getItem('mahasiswa_reports') || '{}');
    if (all[nim]) {
      delete all[nim][week];
      localStorage.setItem('mahasiswa_reports', JSON.stringify(all));
    }
    return true;
  } catch { return false; }
}

// Save verification for a specific session inline in dosen_hadir
export async function saveVerifikasiSession(nim, week, ke, dosenName) {
  if (supabase) {
    const { data: existing } = await supabase
      .from('laporan_bimbingan')
      .select('dosen_hadir')
      .eq('nim', nim)
      .eq('week', week)
      .maybeSingle();
    const sessions = getSessions(existing?.dosen_hadir);
    const idx = sessions.findIndex(s => s.ke === ke);
    if (idx >= 0) {
      sessions[idx].verified_at = new Date().toISOString();
      sessions[idx].verified_by = dosenName;
      await supabase.from('laporan_bimbingan')
        .update({ dosen_hadir: { sessions } })
        .eq('nim', nim)
        .eq('week', week);
    }
  }
}

// Cancel verification for a specific session
export async function cancelVerifikasiSession(nim, week, ke) {
  if (supabase) {
    const { data: existing } = await supabase
      .from('laporan_bimbingan')
      .select('dosen_hadir')
      .eq('nim', nim)
      .eq('week', week)
      .maybeSingle();
    const sessions = getSessions(existing?.dosen_hadir);
    const idx = sessions.findIndex(s => s.ke === ke);
    if (idx >= 0) {
      sessions[idx].verified_at = null;
      sessions[idx].verified_by = null;
      await supabase.from('laporan_bimbingan')
        .update({ dosen_hadir: { sessions } })
        .eq('nim', nim)
        .eq('week', week);
    }
  }
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

// Periods that still have room for more sessions
function getPeriodsWithRoom(weekColumns, existingData, lockedPeriods, forceWeek) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return weekColumns.filter(w => {
    if (w === forceWeek) return true;
    if (lockedPeriods.includes(w)) return false;
    const sessionCount = getSessionCount(existingData?.[w]);
    if (sessionCount >= MAX_SESSIONS) return false;
    const range = parseWeekRange(w);
    if (range && today > range.end) return false;
    return true;
  });
}

function getDefaultWeek(periodsWithRoom, existingData) {
  const unreported = periodsWithRoom.filter(w => !existingData?.[w]?.reported);
  const current = findCurrentWeek(unreported.length ? unreported : periodsWithRoom);
  if (current) return current;
  return unreported[0] || periodsWithRoom[0] || '';
}

export default function LaporanModal({
  isOpen, onClose, weekColumns, nim, mahasiswaName = '', existingData,
  pembimbing1 = '', pembimbing2 = '', penguji1 = '', penguji2 = '',
  forceWeek = '',
  lockedPeriods = [],
  editMode = false,
}) {
  const dosenList = [
    { key: 'p1',  label: 'P1',  name: pembimbing1 },
    { key: 'p2',  label: 'P2',  name: pembimbing2 },
    { key: 'pj1', label: 'Pj1', name: penguji1 },
    { key: 'pj2', label: 'Pj2', name: penguji2 },
  ].filter(d => d.name);

  const todayStr = () => new Date().toISOString().split('T')[0];

  const periodsWithRoom = getPeriodsWithRoom(weekColumns, existingData, lockedPeriods, forceWeek);

  const [week, setWeek]                         = useState(() => forceWeek || getDefaultWeek(periodsWithRoom, existingData));
  const [kategori, setKategori]                 = useState(KATEGORI[0]);
  const [progres, setProgres]                   = useState('');
  const [next, setNext]                         = useState('');
  const [selectedDosenKey, setSelectedDosenKey] = useState('');
  const [tanggalBimbingan, setTanggalBimbingan] = useState(todayStr);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState(false);

  // Reset form each time the modal opens
  useEffect(() => {
    if (isOpen) {
      const targetWeek = forceWeek || getDefaultWeek(periodsWithRoom, existingData);
      setWeek(targetWeek);
      setError('');
      setSuccess(false);

      if (editMode && targetWeek) {
        // Edit mode: pre-fill with last session's data
        const existing = existingData?.[targetWeek];
        const sessions = existing?.sessions || [];
        const lastSession = sessions[sessions.length - 1];
        setProgres(lastSession?.progress || existing?.progress || '');
        setNext(lastSession?.next || existing?.next || '');
        setKategori(lastSession?.category || existing?.category || KATEGORI[0]);
        setTanggalBimbingan(lastSession?.tanggal || existing?.tanggalBimbingan || todayStr());
        const dosenName = lastSession?.dosen?.name || (existing?.dosenHadir?.[0]?.name);
        const found = dosenList.find(d => d.name === dosenName);
        setSelectedDosenKey(found?.key || '');
      } else {
        // Add mode: blank form
        setProgres(''); setNext(''); setKategori(KATEGORI[0]);
        setTanggalBimbingan(todayStr());
        setSelectedDosenKey('');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSessionCount = getSessionCount(existingData?.[week]);
  const isAtMax = !editMode && currentSessionCount >= MAX_SESSIONS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!week) { setError('Pilih periode terlebih dahulu.'); return; }
    if (!progres.trim()) { setError('Isian progres tidak boleh kosong.'); return; }
    if (!editMode && currentSessionCount >= MAX_SESSIONS) {
      setError(`Periode ini sudah mencapai batas maksimum ${MAX_SESSIONS}x bimbingan.`);
      return;
    }

    const selectedDosen = dosenList.find(d => d.key === selectedDosenKey);
    const ok = await saveReport(nim, week, {
      progress: progres.trim(),
      next: next.trim(),
      category: kategori,
      selectedDosen: selectedDosen ? { label: selectedDosen.label, name: selectedDosen.name } : null,
      tanggalBimbingan: tanggalBimbingan || null,
    }, mahasiswaName, editMode);

    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setWeek(''); setProgres(''); setNext(''); setKategori(KATEGORI[0]);
        setTanggalBimbingan(todayStr());
        setSelectedDosenKey('');
        onClose();
      }, 1400);
    } else {
      setError('Gagal menyimpan. Coba lagi.');
    }
  };

  const hasNoRoom = periodsWithRoom.length === 0;

  // Label for the session being added
  const sessionLabel = editMode
    ? `Edit sesi terakhir`
    : `Sesi ke-${currentSessionCount + 1}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
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
              <p className="text-xs text-white/70">
                {editMode ? 'Edit laporan periode ini' : `Tambah bimbingan (maks. ${MAX_SESSIONS}x per periode)`}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* No room available */}
        {hasNoRoom && (
          <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Semua periode sudah penuh</p>
              <p className="text-xs text-slate-500 mt-1">Semua periode sudah mencapai batas bimbingan atau sudah berakhir.</p>
            </div>
            <button type="button" onClick={onClose}
              className="mt-2 px-5 py-2 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-colors">
              Tutup
            </button>
          </div>
        )}

        {/* Form */}
        {!hasNoRoom && (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
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
              {forceWeek ? (
                <div className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-medium flex items-center justify-between">
                  <span>{forceWeek}</span>
                  {!editMode && currentSessionCount > 0 && (
                    <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      {sessionLabel}
                    </span>
                  )}
                </div>
              ) : (
                <select
                  value={week}
                  onChange={e => setWeek(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 text-slate-800"
                >
                  <option value="">-- Pilih Periode --</option>
                  {periodsWithRoom.map(w => {
                    const cnt = getSessionCount(existingData?.[w]);
                    const sisa = MAX_SESSIONS - cnt;
                    return (
                      <option key={w} value={w}>
                        {w}{cnt > 0 ? ` (${cnt}/${MAX_SESSIONS} sesi)` : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Bimbingan dengan — single-select dropdown */}
            {dosenList.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Bimbingan dengan <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDosenKey}
                  onChange={e => setSelectedDosenKey(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 text-slate-800"
                >
                  <option value="">-- Pilih Dosen --</option>
                  {dosenList.map(d => (
                    <option key={d.key} value={d.key}>
                      {d.label} · {d.name.split(',')[0]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tanggal Bimbingan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                Tanggal Bimbingan
              </label>
              <input
                type="date"
                value={tanggalBimbingan}
                onChange={e => setTanggalBimbingan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 text-slate-800"
              />
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
                Progres Bimbingan Ini <span className="text-red-500">*</span>
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
                Target Bimbingan Berikutnya
              </label>
              <textarea
                value={next}
                onChange={e => setNext(e.target.value)}
                placeholder="Contoh: Menyelesaikan bab 4 dan mulai penulisan bab 5..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 placeholder:text-slate-400 resize-none"
              />
            </div>

            <button type="submit" disabled={success || isAtMax}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg transition-all shadow-sm">
              <Send className="w-4 h-4" />
              {editMode ? 'Simpan Perubahan' : 'Simpan Laporan'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
