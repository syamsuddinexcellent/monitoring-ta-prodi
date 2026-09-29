import React, { useMemo, useState, useEffect } from 'react';
import {
  GraduationCap, BookOpen, CheckCircle2, AlertCircle,
  ArrowRight, UserCheck, Calendar, TrendingUp, Clock,
  PlusCircle, CloudOff
} from 'lucide-react';
import { getCategoryBadgeStyle } from '../utils/helpers';
import LaporanModal, { getLocalReportsForNim } from './LaporanModal';

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

export default function MahasiswaView({ student, weekColumns, loggedInUser }) {
  const [isLaporanOpen, setIsLaporanOpen] = useState(false);
  const [localReports, setLocalReports] = useState({});

  const nim = student?.nim || loggedInUser?.nim || '';

  // Reload local reports when modal closes (after save)
  useEffect(() => {
    if (nim) setLocalReports(getLocalReportsForNim(nim));
  }, [nim, isLaporanOpen]);

  // Merged weekly data: local reports fill gaps from Google Sheets data
  const mergedUpdates = useMemo(() => {
    if (!student) return {};
    const merged = {};
    weekColumns.forEach(w => {
      const sheet = student.weeklyUpdates?.[w];
      const local = localReports[w];
      if (sheet?.reported) {
        merged[w] = { ...sheet, _source: 'sheet' };
      } else if (local?.reported) {
        merged[w] = { ...local, _source: 'local' };
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
                <span className="text-slate-600">Total pekan monitoring</span>
                <span className="font-bold text-slate-900">{weekColumns.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Sudah lapor</span>
                <span className="font-bold text-emerald-600">{reported.length} pekan</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Belum lapor</span>
                <span className="font-bold text-rose-500">{weekColumns.length - reported.length} pekan</span>
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
              {latestUpdate._source === 'local' && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <CloudOff className="w-3 h-3" />
                  Laporan lokal
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
                    <span className="text-[10px] font-bold text-brand-700 uppercase block mb-0.5">Target Pekan Depan</span>
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
            {weekColumns.map((week, idx) => {
              const upd = mergedUpdates[week];
              const isReported = upd?.reported;
              const isLocal = upd?._source === 'local';
              const badge = getCategoryBadgeStyle(upd?.category);
              return (
                <div key={week} className="relative group">
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                    isReported ? (isLocal ? 'bg-amber-400 ring-4 ring-amber-100' : 'bg-emerald-500 ring-4 ring-emerald-100') : 'bg-slate-200'
                  }`} />
                  <div className={`rounded-xl p-4 border transition-colors ${
                    isReported
                      ? 'bg-slate-50 border-slate-200 group-hover:bg-white'
                      : 'bg-rose-50/40 border-rose-100'
                  }`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Pekan {idx + 1}</span>
                        <span className="text-xs text-slate-400">({week})</span>
                        {isLocal && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            <CloudOff className="w-2.5 h-2.5" />
                            Lokal
                          </span>
                        )}
                      </div>
                      {isReported ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {upd.category}
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
                        {upd.next && (
                          <div className="flex items-start gap-1.5 bg-brand-50/60 p-2.5 rounded-lg border border-brand-100">
                            <ArrowRight className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                            <p className="text-slate-800 font-semibold">{upd.next}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-400 italic">
                          Belum ada laporan bimbingan untuk pekan ini.
                        </p>
                        <button
                          onClick={() => setIsLaporanOpen(true)}
                          className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline ml-2 shrink-0"
                        >
                          + Lapor
                        </button>
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
        onClose={() => setIsLaporanOpen(false)}
        weekColumns={weekColumns}
        nim={nim}
        mahasiswaName={student.nama || ''}
        existingData={mergedUpdates}
        pembimbing1={student.pembimbing1 || ''}
        pembimbing2={student.pembimbing2 || ''}
        penguji1={student.penguji1 || ''}
        penguji2={student.penguji2 || ''}
      />
    </>
  );
}
