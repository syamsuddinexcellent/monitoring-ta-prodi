import React, { useMemo, useState, useEffect } from 'react';
import {
  GraduationCap, BookOpen, CheckCircle2, AlertCircle,
  ArrowRight, UserCheck, Calendar, TrendingUp, Clock,
  PlusCircle, ShieldCheck, PencilLine, Trash2, XCircle, RefreshCw, CalendarDays, Lock, Plus, Printer
} from 'lucide-react';
import { getCategoryBadgeStyle } from '../utils/helpers';
import LaporanModal, { getLocalReportsForNim, parseWeekRange, getSubmitDeadline, deleteReport, deleteSession, getSessions, getSessionCount, MAX_SESSIONS } from './LaporanModal';
import { getVerifikasi, getPenolakan, cancelVerifikasi, cancelPenolakan } from '../utils/exportUtils';

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

function formatTanggal(str) {
  if (!str) return null;
  return new Date(str + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MahasiswaView({ student, weekColumns, loggedInUser, lockedPeriods = [] }) {
  const [isLaporanOpen, setIsLaporanOpen]     = useState(false);
  const [laporanForceWeek, setLaporanForceWeek] = useState('');
  const [laporanEditMode, setLaporanEditMode]   = useState(false);
  const [localReports, setLocalReports]         = useState({});
  const [verifData, setVerifData]               = useState({});
  const [tolkData, setTolkData]                 = useState({});

  const openAddSession = (weekStr = '') => {
    setLaporanForceWeek(weekStr);
    setLaporanEditMode(false);
    setIsLaporanOpen(true);
  };

  const openEdit = (weekStr) => {
    setLaporanForceWeek(weekStr);
    setLaporanEditMode(true);
    setIsLaporanOpen(true);
  };

  const handleClose = () => {
    setIsLaporanOpen(false);
    setLaporanForceWeek('');
    setLaporanEditMode(false);
  };

  const nim = student?.nim || loggedInUser?.nim || '';

  useEffect(() => {
    if (nim) {
      getLocalReportsForNim(nim).then(setLocalReports);
      getVerifikasi().then(all => setVerifData(all[nim] || {}));
      getPenolakan().then(all => setTolkData(all[nim] || {}));
    }
  }, [nim, isLaporanOpen]);

  // Check if a week has any verified session (from inline session data OR verifikasi_laporan)
  const isWeekVerified = (week) => {
    // Check verifikasi_laporan table (period-level)
    if (verifData[week]?.verified) return true;
    // Check inline session verification
    const sessions = mergedUpdates[week]?.sessions || [];
    return sessions.some(s => s.verified_at);
  };

  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'week'|'session', week, ke }

  const handleDelete = async (week) => {
    if (confirmDelete?.type === 'week' && confirmDelete.week === week) {
      setConfirmDelete(null);
      const ok = await deleteReport(nim, week);
      if (ok) {
        await Promise.all([cancelVerifikasi(nim, week), cancelPenolakan(nim, week)]);
        getLocalReportsForNim(nim).then(setLocalReports);
        const [newVerif, newTolk] = await Promise.all([getVerifikasi(), getPenolakan()]);
        setVerifData(newVerif[nim] || {});
        setTolkData(newTolk[nim] || {});
      }
    } else {
      setConfirmDelete({ type: 'week', week });
    }
  };

  const handleDeleteSession = async (week, ke) => {
    if (confirmDelete?.type === 'session' && confirmDelete.week === week && confirmDelete.ke === ke) {
      setConfirmDelete(null);
      const ok = await deleteSession(nim, week, ke);
      if (ok) getLocalReportsForNim(nim).then(setLocalReports);
    } else {
      setConfirmDelete({ type: 'session', week, ke });
    }
  };

  const mergedUpdates = useMemo(() => {
    if (!student) return {};
    const merged = {};
    weekColumns.forEach(w => {
      const sheet = student.weeklyUpdates?.[w];
      const local = localReports[w];
      if (local?.reported) {
        merged[w] = { ...local, _appReport: true };
      } else if (sheet?.reported) {
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

  // Check if a period can have more sessions added
  const canAddSession = (week) => {
    if (lockedPeriods.includes(week)) return false;
    if (isWeekVerified(week)) return false;
    const cnt = getSessionCount(mergedUpdates[week]);
    if (cnt >= MAX_SESSIONS) return false;
    const range = parseWeekRange(week);
    if (range) {
      // Periode 2-4: extended deadline for all angkatan until Oct 11 2026 23:59
      const EXTENDED_WEEKS = ['07 - 11 September 26', '14 - 18 September 26', '21 - 25 September 26'];
      if (EXTENDED_WEEKS.includes(week)) {
        if (new Date() > new Date(2026, 9, 11, 23, 59, 59, 999)) return false;
      } else {
        if (new Date() > getSubmitDeadline(range.end)) return false;
      }
    }
    return true;
  };

  const handlePrintPDF = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const reportedCount = weekColumns.filter(w => isWeekVerified(w) || mergedUpdates[w]?.reported).length;
    const totalCount = weekColumns.length;
    const pctVal = totalCount > 0 ? Math.round((reportedCount / totalCount) * 100) : 0;

    const tableRows = weekColumns.map((week, idx) => {
      const update = mergedUpdates[week];
      const verified = isWeekVerified(week);
      if (!verified) return '';
      const sessions = update ? getSessions(update) : [];
      const num = idx + 1;
      const lastSession = sessions[sessions.length - 1];

      const badge = verified
        ? `<span class="badge badge-verified">&#10003; Terverifikasi</span>`
        : update?.reported
        ? `<span class="badge badge-sudah">Sudah Lapor</span>`
        : `<span class="badge badge-belum">Belum Lapor</span>`;

      const cat = lastSession?.category ? `<div class="cat-text">${lastSession.category}</div>` : '';
      const progres = lastSession?.progress || '<span class="text-muted">-</span>';
      const target = lastSession?.next || '<span class="text-muted">-</span>';
      const dosenName = verified ? (verifData[week]?.dosenName?.split(',')[0] || lastSession?.dosen?.name || '') : '';

      return `<tr>
        <td><div class="p-label">P${num}</div><div class="p-range">${week}</div></td>
        <td>${badge}${cat}</td>
        <td>${progres}</td>
        <td>${target}</td>
        <td class="col-ttd">${verified ? `<div class="ttd-space"></div><div class="ttd-name">${dosenName}</div>` : ''}</td>
      </tr>`;
    }).join('');

    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const p1 = student.pembimbing1 || '-';
    const p2 = student.pembimbing2 || '-';

    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Riwayat Bimbingan TA — ${student.nama}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#1e293b;background:#fff;padding:32px 40px}
  @media print{body{padding:0}@page{margin:12mm 10mm;size:A4 portrait}.no-print{display:none!important}}

  .top-bar{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px}
  .doc-title h1{font-size:20px;font-weight:800;color:#0f172a}
  .doc-title p{font-size:12px;color:#64748b;margin-top:3px}
  .print-btn{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}

  .profile-card{border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px 24px}
  .profile-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .profile-value{font-size:13px;font-weight:600;color:#1e293b}
  .profile-value.mono{font-family:monospace}

  .progress-info{display:inline-flex;align-items:center;gap:8px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;margin-bottom:16px}
  .progress-pct{background:#16a34a;color:#fff;border-radius:999px;padding:1px 9px;font-size:11px;font-weight:700}

  table{width:100%;border-collapse:collapse;font-size:13px}
  thead th{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;background:#f8fafc}
  tbody tr{border-bottom:1px solid #f1f5f9}
  tbody tr:last-child{border-bottom:none}
  tbody td{padding:12px;vertical-align:top;line-height:1.6}
  th:first-child,td:first-child{width:120px}
  th:nth-child(2),td:nth-child(2){width:130px}
  .col-ttd{width:140px;text-align:center}
  .ttd-space{height:48px;border-bottom:1px solid #cbd5e1;margin-bottom:6px}
  .ttd-name{font-size:11px;color:#475569;text-align:center}

  .p-label{font-size:15px;font-weight:800;color:#0f172a}
  .p-range{font-size:11px;color:#94a3b8;margin-top:2px}

  .badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap;display:inline-block}
  .badge-verified{background:#dcfce7;color:#166534}
  .badge-sudah{background:#d1fae5;color:#065f46}
  .badge-belum{background:#fee2e2;color:#991b1b}
  .cat-text{font-size:11px;color:#64748b;margin-top:5px}
  .text-muted{color:#94a3b8}

  .doc-footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:right;font-size:11px;color:#94a3b8}
</style></head><body>

<div class="top-bar">
  <div class="doc-title">
    <h1>Riwayat Bimbingan Tugas Akhir</h1>
    <p>Program Studi Sains Data &middot; Semester Ganjil 2026/2027</p>
  </div>
  <button class="print-btn no-print" onclick="window.print()">Cetak / Simpan PDF</button>
</div>

<div class="profile-card">
  <div><div class="profile-label">Nama</div><div class="profile-value">${student.nama}</div></div>
  <div><div class="profile-label">NIM</div><div class="profile-value mono">${student.nim}</div></div>
  <div><div class="profile-label">Angkatan</div><div class="profile-value">${student.angkatan}</div></div>
  <div><div class="profile-label">Pembimbing 1</div><div class="profile-value">${p1}</div></div>
  <div><div class="profile-label">Pembimbing 2</div><div class="profile-value">${p2}</div></div>
  <div><div class="profile-label">Status TA</div><div class="profile-value">${student.statusTA || '-'}</div></div>
</div>

<div class="progress-info">
  ${reportedCount} dari ${totalCount} periode terlaporkan
  <span class="progress-pct">${pctVal}%</span>
</div>

<table>
  <thead><tr>
    <th>Periode</th><th>Status</th><th>Progres</th><th>Target Berikutnya</th><th class="col-ttd">Tanda Tangan</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>

<div class="doc-footer">Dicetak dari Sistem Monitoring TA Prodi Sains Data &middot; ${todayStr}</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

    printWin.document.write(html);
    printWin.document.close();
  };

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
              <div className="mt-3 flex items-center gap-2 sm:hidden">
                <button
                  onClick={handlePrintPDF}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all"
                  title="Cetak / Simpan PDF Riwayat Bimbingan"
                >
                  <Printer className="w-4 h-4" />
                  Cetak PDF
                </button>
                <button
                  onClick={() => openAddSession()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  Laporkan Progres
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 shrink-0">
              <ProgressRing pct={pct} />
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={handlePrintPDF}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all"
                  title="Cetak / Simpan PDF Riwayat Bimbingan"
                >
                  <Printer className="w-4 h-4" />
                  Cetak PDF
                </button>
                <button
                  onClick={() => openAddSession()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  Laporkan Progres
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Supervisor + Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <span className="text-slate-600">Terverifikasi</span>
                <span className="font-bold text-indigo-600">{weekColumns.filter(w => isWeekVerified(w)).length} periode</span>
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
              {isWeekVerified(latestWeek) && (
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
                    <span className="text-[10px] font-bold text-brand-700 uppercase block mb-0.5">Target Berikutnya</span>
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
              const weekVerified = isWeekVerified(week);
              const penolakanInfo = tolkData[week];
              const isTolak = !!penolakanInfo && !weekVerified;
              const isResubmitted = isTolak && upd?.submittedAt && penolakanInfo?.at &&
                new Date(upd.submittedAt) > new Date(penolakanInfo.at);
              const isLocked = lockedPeriods.includes(week);
              const sessions = upd?.sessions || [];
              const hasMultiSession = sessions.length > 1;

              return (
                <div key={week} className="relative group">
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                    isReported ? (weekVerified ? 'bg-emerald-500 ring-4 ring-emerald-100' : (isTolak && !isResubmitted) ? 'bg-red-400 ring-4 ring-red-100' : 'bg-brand-500 ring-4 ring-brand-100') : 'bg-slate-200'
                  }`} />
                  <div className={`rounded-xl border transition-colors ${
                    isReported
                      ? 'bg-slate-50 border-slate-200 group-hover:bg-white'
                      : 'bg-rose-50/40 border-rose-100'
                  }`}>
                    {/* Period header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap px-4 pt-3 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Periode {idx + 1}</span>
                        <span className="text-xs text-slate-400">({week})</span>
                        {weekVerified && (
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
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                          {sessions.length || 1}/{MAX_SESSIONS} sesi
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

                    {/* Sessions */}
                    {isReported ? (
                      <div className="px-4 pb-3 space-y-3">
                        {/* Multi-session display */}
                        {sessions.length > 0 ? (
                          <div className="space-y-2">
                            {sessions.map((sess, si) => {
                              const badge = getCategoryBadgeStyle(sess.category);
                              const sessVerified = !!sess.verified_at;
                              return (
                                <div key={sess.ke || si} className={`rounded-lg border p-3 text-xs ${
                                  sessVerified ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-100'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                                      Bimbingan ke-{sess.ke || si + 1}
                                    </span>
                                    {sess.dosen && (
                                      <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                                        {sess.dosen.label} · {sess.dosen.name.split(',')[0]}
                                      </span>
                                    )}
                                    {sess.category && (
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                                        <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                                        {sess.category}
                                      </span>
                                    )}
                                    <div className="ml-auto flex items-center gap-2">
                                      {sessVerified ? (
                                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
                                          <ShieldCheck className="w-3 h-3" />
                                          Verified
                                        </span>
                                      ) : sessions.length > 1 && isFromApp && (() => {
                                        const ke = sess.ke || si + 1;
                                        const isConfirming = confirmDelete?.type === 'session' && confirmDelete.week === week && confirmDelete.ke === ke;
                                        return isConfirming ? (
                                          <span className="flex items-center gap-1">
                                            <span className="text-[10px] text-rose-600 font-semibold">Yakin?</span>
                                            <button onClick={() => handleDeleteSession(week, ke)} className="text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-1.5 py-0.5 rounded">Ya</button>
                                            <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">Batal</button>
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => handleDeleteSession(week, ke)}
                                            className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-500 hover:text-rose-600"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            Hapus
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                  {sess.tanggal && (
                                    <div className="flex items-center gap-1 text-slate-400 mb-1">
                                      <CalendarDays className="w-3 h-3" />
                                      <span>{formatTanggal(sess.tanggal)}</span>
                                    </div>
                                  )}
                                  <p className="text-slate-800 font-medium leading-relaxed">{sess.progress}</p>
                                  {sess.next && (
                                    <div className="flex items-start gap-1 mt-1.5 text-brand-700">
                                      <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" />
                                      <span className="font-semibold">{sess.next}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Old format (no sessions array): show single entry
                          <div className="space-y-2 text-xs">
                            <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Progres</span>
                              <p className="text-slate-800 font-medium leading-relaxed">{upd.progress}</p>
                            </div>
                            {upd.tanggalBimbingan && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                <span>Tanggal: <span className="font-semibold text-slate-700">{formatTanggal(upd.tanggalBimbingan)}</span></span>
                              </div>
                            )}
                            {upd.dosenHadir?.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                          </div>
                        )}

                        {/* Rejection / Resubmission notices */}
                        {isTolak && !isResubmitted && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase tracking-wider">
                              <XCircle className="w-3 h-3" />
                              Laporan Ditolak Dosen
                            </div>
                            <p className="text-xs text-red-800 font-medium leading-relaxed">{penolakanInfo.alasan || '—'}</p>
                            <p className="text-[10px] text-red-400">Silakan edit dan kirim ulang laporan Anda.</p>
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

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            {/* Add session button */}
                            {canAddSession(week) && (
                              <button
                                onClick={() => openAddSession(week)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                + Lapor Bimbingan
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {weekVerified ? (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Sudah diverifikasi · tidak dapat diedit
                              </span>
                            ) : isReported && isLocked ? (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                <Lock className="w-3.5 h-3.5" />
                                Dikunci · tidak dapat diedit
                              </span>
                            ) : null}
                            {isReported && !weekVerified && !isLocked ? (
                              <>
                                {sessions.length <= 1 && (
                                  <button
                                    onClick={() => openEdit(week)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand-600 hover:underline"
                                  >
                                    <PencilLine className="w-3.5 h-3.5" />
                                    Edit
                                  </button>
                                )}
                                {confirmDelete?.type === 'week' && confirmDelete.week === week ? (
                                  <span className="flex items-center gap-1">
                                    <span className="text-[11px] text-rose-600 font-semibold">Hapus semua?</span>
                                    <button onClick={() => handleDelete(week)} className="text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-1.5 py-0.5 rounded">Ya</button>
                                    <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">Batal</button>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleDelete(week)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:underline"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Hapus Semua
                                  </button>
                                )}
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-4 pb-3 mt-1">
                        <p className="text-xs text-slate-400 italic">
                          {isLocked ? 'Periode ini dikunci oleh admin.' : 'Belum ada laporan bimbingan untuk periode ini.'}
                        </p>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {(isTolak || weekVerified) && (
                            confirmDelete?.type === 'week' && confirmDelete.week === week ? (
                              <span className="flex items-center gap-1">
                                <span className="text-[11px] text-rose-600 font-semibold">Hapus status?</span>
                                <button onClick={async () => { setConfirmDelete(null); await Promise.all([cancelPenolakan(nim, week), cancelVerifikasi(nim, week)]); const [nv, np] = await Promise.all([getVerifikasi(), getPenolakan()]); setVerifData(nv[nim] || {}); setTolkData(np[nim] || {}); }} className="text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-1.5 py-0.5 rounded">Ya</button>
                                <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">Batal</button>
                              </span>
                            ) : (
                              <button onClick={() => setConfirmDelete({ type: 'week', week })} className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:underline">
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus Status
                              </button>
                            )
                          )}
                          {!isLocked && canAddSession(week) && (
                            <button
                              onClick={() => openAddSession(week)}
                              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                            >
                              + Lapor
                            </button>
                          )}
                        </div>
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
        forceWeek={laporanForceWeek}
        lockedPeriods={lockedPeriods}
        editMode={laporanEditMode}
      />
    </>
  );
}
