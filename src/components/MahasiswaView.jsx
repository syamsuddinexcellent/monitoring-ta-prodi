import React, { useMemo, useState, useEffect } from 'react';
import {
  GraduationCap, BookOpen, CheckCircle2, AlertCircle,
  ArrowRight, UserCheck, Calendar, TrendingUp, Clock,
  PlusCircle, ShieldCheck, PencilLine, Trash2, XCircle, RefreshCw, CalendarDays, Lock
} from 'lucide-react';
import { getCategoryBadgeStyle } from '../utils/helpers';
import LaporanModal, { getLocalReportsForNim, parseWeekRange, deleteReport } from './LaporanModal';
import { getVerifikasi, getPenolakan } from '../utils/exportUtils';

function ProgressRing({ pct }) {
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none"
        stroke="#4f46e5" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="44" y="44" dominantBaseline="middle" textAnchor="middle"
        className="rotate-90" fill="#1e293b"
        style={{ fontSize: 16, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '44px 44px' }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function MahasiswaView({ student, weekColumns, loggedInUser, lockedPeriods = [] }) {
  const [isLaporanOpen, setIsLaporanOpen] = useState(false);
  const [editWeek, setEditWeek] = useState('');
  const [localReports, setLocalReports] = useState({});
  const [verifData, setVerifData] = useState({});
  const [tolkData, setTolkData] = useState({});

  const openEdit = (weekStr) => {
    setEditWeek(weekStr);
    setIsLaporanOpen(true);
  };

  const handleClose = () => {
    setIsLaporanOpen(false);
    setEditWeek('');
  };

  const nim = student?.nim || loggedInUser?.nim || '';

  // Reload reports & verifikasi from Supabase when modal closes (after save)
  useEffect(() => {
    if (nim) {
      getLocalReportsForNim(nim).then(setLocalReports);
      getVerifikasi().then(all => setVerifData(all[nim] || {}));
      getPenolakan().then(all => setTolkData(all[nim] || {}));
    }
  }, [nim, isLaporanOpen]);

  const isVerifiedByDosen = (week) => verifData[week]?.verified === true;

  const handleDelete = async (week) => {
    if (!window.confirm(`Hapus laporan Periode ini? Tindakan ini tidak dapat dibatalkan.`)) return;
    const ok = await deleteReport(nim, week);
    if (ok) {
      getLocalReportsForNim(nim).then(setLocalReports);
    }
  };

  // Merged weekly data: app reports (Supabase/_appReport) take priority over sheet data
  const mergedUpdates = useMemo(() => {
    if (!student) return {};
    const merged = {};
    weekColumns.forEach(w => {
      const sheet = student.weeklyUpdates?.[w];
      const local = localReports[w];
      // Prefer local (Supabase) report if it exists
      if (local?.reported) {
        merged[w] = { ...local, _appReport: true };
      } else if (sheet?.reported) {
        // Sheet data that came from mergeSupabaseReports also has _appReport
        merged[w] = { ...sheet };
      } else {
        merged[w] = sheet || {};
      }
    });
    return merged;
  }, [student, weekColumns, localReports]);

  if (!student) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Data tidak ditemukan</h2>
        <p className="text-sm text-slate-500 max-w-xs">
          Data TA untuk akun <span className="font-medium text-slate-700">{loggedInUser?.name}</span> belum tersedia di sistem.
          Pastikan NIM yang didaftarkan sudah benar.
        </p>
      </div>
    );
  }

  const reported = useMemo(() =>
    weekColumns.filter(w => mergedUpdates[w]?.reported), [weekColumns, mergedUpdates]);
  const pct = Math.round((reported.length / (weekColumns.length || 1)) * 100);
  const latestWeek = [...weekColumns].reverse().find(w => mergedUpdates[w]?.reported);
  const latestUpdate = latestWeek ? mergedUpdates[latestWeek] : null;

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-brand-600 to-indigo-500" />
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center shadow-md shrink-0">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{student.nama}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  NIM {student.nim}
                </span>
                <span className="text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                  Angkatan {student.angkatan}
                </span>
                {student.statusTA && (
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {student.statusTA}
                  </span>
                )}
              </div>
              {/* Laporan button below name on mobile */}
              <button
                onClick={() => setIsLaporanOpen(true)}
                className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow transition-all sm:hidden"
              >
                <PlusCircle className="w-4 h-4" />
                Laporkan Progres
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 shrink-0">
              <ProgressRing pct={pct} />
              {/* Laporan button below ring on desktop */}
              <button
                onClick={() => setIsLaporanOpen(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Laporkan Progres
              </button>
            </div>
          </div>
        </div>

        {/* Supervisor + Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Supervisors */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Dosen Pembimbing
            </h3>
            {student.pembimbing1 && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5">P1</span>
                <span className="text-sm font-medium text-slate-800">{student.pembimbing1}</span>
              </div>
            )}
            {student.pembimbing2 && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5">P2</span>
                <span className="text-sm text-slate-700">{student.pembimbing2}</span>
              </div>
            )}
            {student.target && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target</span>
                <span className="text-sm font-semibold text-brand-700">{student.target}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Ringkasan Keaktifan
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Total periode monitoring</span>
                <span className="font-bold text-slate-900">{weekColumns.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Sudah lapor</span>
                <span className="font-bold text-emerald-600">{reported.length} periode</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Belum lapor</span>
                <span className="font-bold text-rose-500">{weekColumns.length - reported.length} periode</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-brand-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }} />
            </div>
            {latestWeek && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                <Clock className="w-3 h-3 shrink-0" />
                Update terakhir: <span className="font-medium text-slate-700">{latestWeek}</span>
              </div>
            )}
          </div>
        </div>

        {/* Latest update highlight */}
        {latestUpdate && (
          <div className="bg-gradient-to-br from-indigo-50 to-brand-50 rounded-2xl border border-indigo-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Update Terbaru — {latestWeek}
              </h3>
              {isVerifiedByDosen(latestWeek) && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Terverifikasi
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="bg-white rounded-xl p-3.5 border border-indigo-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Progres</span>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">{latestUpdate.progress}</p>
              </div>
              {latestUpdate.next && (
                <div className="bg-white rounded-xl p-3.5 border border-indigo-100 flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-brand-700 uppercase block mb-0.5">Target Periode Depan</span>
                    <p className="text-sm text-slate-800 font-semibold">{latestUpdate.next}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Riwayat Bimbingan
          </h3>
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-5">
            {[...weekColumns].map((week, idx) => ({ week, idx })).reverse().map(({ week, idx }) => {
              const upd = mergedUpdates[week];
              const isReported = upd?.reported;
              const isFromApp = upd?._appReport === true;
              const isVerified = isVerifiedByDosen(week);
              const penolakanInfo = tolkData[week];
              const isTolak = !!penolakanInfo && !isVerified;
              const isResubmitted = isTolak && upd?.submittedAt && penolakanInfo?.at &&
                new Date(upd.submittedAt) > new Date(penolakanInfo.at);
              const badge = getCategoryBadgeStyle(upd?.category);
              const isLocked = lockedPeriods.includes(week);
              return (
                <div key={week} className="relative group">
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                    isReported ? (isVerified ? 'bg-emerald-500 ring-4 ring-emerald-100' : (isTolak && !isResubmitted) ? 'bg-red-400 ring-4 ring-red-100' : 'bg-brand-500 ring-4 ring-brand-100') : 'bg-slate-200'
                  }`} />
                  <div className={`rounded-xl p-4 border transition-colors ${
                    isReported
                      ? 'bg-slate-50 border-slate-200 group-hover:bg-white'
                      : 'bg-rose-50/40 border-rose-100'
                  }`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Periode {idx + 1}</span>
                        <span className="text-xs text-slate-400">({week})</span>
                        {isVerified && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Terverifikasi
                          </span>
                        )}
                        {isTolak && !isResubmitted && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                            <XCircle className="w-2.5 h-2.5" />
                            Ditolak
                          </span>
                        )}
                        {isResubmitted && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">
                            <RefreshCw className="w-2.5 h-2.5" />
                            Diajukan Kembali
                          </span>
                        )}
                      </div>
                      {isReported ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {upd.category}
                        </span>
                      ) : isLocked ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          <Lock className="w-3 h-3" />
                          Dikunci
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-100 text-rose-600 border border-rose-200">
                          <AlertCircle className="w-3 h-3" />
                          Belum lapor
                        </span>
                      )}
                    </div>
                    {isReported ? (
                      <div className="space-y-2 text-xs">
                        <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Progres</span>
                          <p className="text-slate-800 font-medium leading-relaxed">{upd.progress}</p>
                        </div>
                        {upd.tanggalBimbingan && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            <span>Tanggal bimbingan: <span className="font-semibold text-slate-700">{new Date(upd.tanggalBimbingan + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></span>
                          </div>
                        )}
                        {upd.dosenHadir?.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[11px] text-slate-500">Bimbingan dengan:</span>
                            {upd.dosenHadir.map(d => (
                              <span key={d.label} className="text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                                {d.label} · {d.name.split(',')[0]}
                              </span>
                            ))}
                          </div>
                        )}
                        {upd.next && (
                          <div className="flex items-start gap-1.5 bg-brand-50/60 p-2.5 rounded-lg border border-brand-100">
                            <ArrowRight className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                            <p className="text-slate-800 font-semibold">{upd.next}</p>
                          </div>
                        )}
                        {isTolak && !isResubmitted && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase tracking-wider">
                              <XCircle className="w-3 h-3" />
                              Laporan Ditolak Dosen
                            </div>
                            <p className="text-xs text-red-800 font-medium leading-relaxed">
                              {penolakanInfo.alasan || '—'}
                            </p>
                            <p className="text-[10px] text-red-400">
                              Silakan edit dan kirim ulang laporan Anda.
                            </p>
                          </div>
                        )}
                        {isResubmitted && (
                          <div className="bg-brand-50 border border-brand-200 rounded-lg p-2.5 space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                              <RefreshCw className="w-3 h-3" />
                              Laporan Diajukan Kembali
                            </div>
                            <p className="text-xs text-brand-800 font-medium leading-relaxed">
                              Laporan telah dikirim ulang. Menunggu verifikasi dari dosen pembimbing.
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-3 pt-1">
                          {isVerified ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Sudah diverifikasi dosen · tidak dapat diedit
                            </span>
                          ) : isFromApp ? (
                            <>
                              <button
                                onClick={() => openEdit(week)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                              >
                                <PencilLine className="w-3.5 h-3.5" />
                                Edit Laporan
                              </button>
                              <button
                                onClick={() => handleDelete(week)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:underline"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-400 italic">
                          {isLocked ? 'Periode ini dikunci oleh admin.' : 'Belum ada laporan bimbingan untuk periode ini.'}
                        </p>
                        {!isLocked && (
                          <button
                            onClick={() => setIsLaporanOpen(true)}
                            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline ml-2 shrink-0"
                          >
                            + Lapor
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <LaporanModal
        isOpen={isLaporanOpen}
        onClose={handleClose}
        weekColumns={weekColumns}
        nim={nim}
        mahasiswaName={student.nama || ''}
        existingData={mergedUpdates}
        pembimbing1={student.pembimbing1 || ''}
        pembimbing2={student.pembimbing2 || ''}
        penguji1={student.penguji1 || ''}
        penguji2={student.penguji2 || ''}
        forceWeek={editWeek}
        lockedPeriods={lockedPeriods}
      />
    </>
  );
}
