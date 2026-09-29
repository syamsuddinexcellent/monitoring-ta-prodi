import React, { useState, useEffect } from 'react';
import {
  X, Users, Database, ShieldCheck, GraduationCap, User,
  Trash2, RefreshCw, AlertTriangle, CheckCircle2, Inbox,
  RotateCcw, BookOpen, Calendar, Layers, Clock, Wifi, WifiOff
} from 'lucide-react';
import { getStoredUsersList, deleteStoredUser } from './AuthModal';

function getRoleLabel(role) {
  if (role === 'dosen') return { label: 'Dosen', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  if (role === 'mahasiswa') return { label: 'Mahasiswa', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return { label: role, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

function getLocalReportsSummary() {
  try {
    const all = JSON.parse(localStorage.getItem('mahasiswa_reports') || '{}');
    const students = Object.keys(all).length;
    const total = Object.values(all).reduce((sum, reports) => sum + Object.keys(reports).length, 0);
    return { students, total, raw: all };
  } catch { return { students: 0, total: 0, raw: {} }; }
}

function getDosenLaporanSummary() {
  try {
    const all = JSON.parse(localStorage.getItem('dosen_laporan') || '{}');
    return Object.entries(all).map(([dosen, items]) => ({
      dosen,
      total: items.length,
      unread: items.filter(i => !i.read).length
    }));
  } catch { return []; }
}

export default function AdminPanelModal({ isOpen, onClose, sheetsData, isRefreshing, onRefreshSheets }) {
  const [tab, setTab] = useState('akun');
  const [users, setUsers] = useState([]);
  const [reportsSummary, setReportsSummary] = useState({ students: 0, total: 0 });
  const [dosenSummary, setDosenSummary] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [flash, setFlash] = useState('');

  const refresh = () => {
    setUsers(getStoredUsersList());
    setReportsSummary(getLocalReportsSummary());
    setDosenSummary(getDosenLaporanSummary());
  };

  useEffect(() => { if (isOpen) { refresh(); setConfirmDelete(null); setFlash(''); } }, [isOpen]);

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 2500); };

  const handleDeleteUser = (email) => {
    if (confirmDelete === email) {
      deleteStoredUser(email);
      showFlash(`Akun ${email} berhasil dihapus.`);
      setConfirmDelete(null);
      refresh();
    } else {
      setConfirmDelete(email);
    }
  };

  const handleClearReports = () => {
    localStorage.removeItem('mahasiswa_reports');
    showFlash('Semua laporan lokal mahasiswa berhasil dihapus.');
    refresh();
  };

  const handleClearDosenInbox = () => {
    localStorage.removeItem('dosen_laporan');
    showFlash('Semua inbox laporan dosen berhasil dihapus.');
    refresh();
  };

  const handleClearResetTokens = () => {
    localStorage.removeItem('reset_tokens');
    showFlash('Token reset password berhasil dihapus.');
  };

  if (!isOpen) return null;

  const dosenUsers = users.filter(u => u.role === 'dosen');
  const mahasiswaUsers = users.filter(u => u.role === 'mahasiswa');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-indigo-700 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Panel Admin</h2>
              <p className="text-xs text-white/70">Kelola akun & data aplikasi</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0 bg-slate-50">
          {[
            { key: 'akun', label: 'Kontrol Akun', icon: Users },
            { key: 'data', label: 'Kontrol Data', icon: Database },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                tab === key
                  ? 'border-brand-600 text-brand-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          <div className="flex-1 flex justify-end items-center pr-3">
            <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors" title="Muat ulang">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Flash message */}
        {flash && (
          <div className="mx-5 mt-4 shrink-0 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {flash}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* === KONTROL AKUN === */}
          {tab === 'akun' && (
            <div className="p-5 space-y-5">
              {/* Summary chips */}
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Total:</span>
                  <span className="font-bold text-slate-900">{users.length} akun</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span className="text-indigo-700 font-semibold">{dosenUsers.length} Dosen</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">{mahasiswaUsers.length} Mahasiswa</span>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada akun terdaftar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map(u => {
                    const { label, cls } = getRoleLabel(u.role);
                    const isConfirming = confirmDelete === u.email;
                    return (
                      <div key={u.email}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          isConfirming ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          u.role === 'dosen' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {u.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{u.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                          {u.lecturerName && <p className="text-[10px] text-indigo-500 truncate">{u.lecturerName}</p>}
                          {u.nim && <p className="text-[10px] text-emerald-600 font-mono">{u.nim}</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls} shrink-0`}>
                          {label}
                        </span>
                        <button
                          onClick={() => handleDeleteUser(u.email)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors shrink-0 ${
                            isConfirming
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                          }`}
                          title={isConfirming ? 'Klik sekali lagi untuk konfirmasi hapus' : 'Hapus akun'}
                        >
                          <Trash2 className="w-3 h-3" />
                          {isConfirming ? 'Yakin?' : 'Hapus'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-center">
                Akun admin bawaan tidak ditampilkan di sini. Klik "Hapus" dua kali untuk konfirmasi.
              </p>
            </div>
          )}

          {/* === KONTROL DATA === */}
          {tab === 'data' && (
            <div className="p-5 space-y-4">

              {/* ── Google Sheets ── */}
              <div className="rounded-xl border border-brand-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-brand-50 border-b border-brand-200">
                  <div className="flex items-center gap-2">
                    {sheetsData?.source === 'google_sheets'
                      ? <Wifi className="w-4 h-4 text-brand-600" />
                      : <WifiOff className="w-4 h-4 text-amber-600" />}
                    <span className="text-xs font-bold text-brand-700">Data Google Sheets</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      sheetsData?.source === 'google_sheets'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {sheetsData?.source === 'google_sheets' ? 'Live' : 'Data Cadangan'}
                    </span>
                  </div>
                  <button
                    onClick={onRefreshSheets}
                    disabled={isRefreshing}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Menyinkronkan...' : 'Sinkronkan'}
                  </button>
                </div>

                {/* Stat grid */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                  {[
                    { icon: Users, label: 'Total Mahasiswa', value: sheetsData?.students?.length ?? '-', color: 'text-brand-700' },
                    { icon: Calendar, label: 'Periode', value: sheetsData?.weekColumns?.length ?? '-', color: 'text-indigo-600' },
                    { icon: Layers, label: 'Angkatan', value: sheetsData ? [...new Set(sheetsData.students.map(s => s.angkatan))].length : '-', color: 'text-emerald-600' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex flex-col items-center py-3 px-2 text-center">
                      <Icon className={`w-4 h-4 ${color} mb-1`} />
                      <span className={`text-lg font-black ${color}`}>{value}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Angkatan breakdown */}
                {sheetsData?.students && (() => {
                  const byAngkatan = sheetsData.students.reduce((acc, s) => {
                    acc[s.angkatan] = (acc[s.angkatan] || 0) + 1;
                    return acc;
                  }, {});
                  return (
                    <div className="px-4 py-3 space-y-1.5">
                      {Object.entries(byAngkatan).sort().map(([ang, count]) => (
                        <div key={ang} className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-500 w-16 shrink-0">Angk. {ang}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-brand-500 h-full rounded-full"
                              style={{ width: `${(count / sheetsData.students.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 w-8 text-right shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Last updated */}
                {sheetsData?.lastUpdated && (
                  <div className="flex items-center gap-1.5 px-4 py-2 border-t border-slate-100 bg-slate-50">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400">
                      Diperbarui: {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(sheetsData.lastUpdated)}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Laporan Lokal Mahasiswa ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700">Laporan Lokal Mahasiswa</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">
                      {reportsSummary.students} mahasiswa · {reportsSummary.total} entri
                    </span>
                    <button
                      onClick={handleClearReports}
                      disabled={reportsSummary.total === 0}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Hapus Semua
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 text-xs text-slate-500">
                  {reportsSummary.total === 0 ? (
                    <p className="italic">Tidak ada laporan lokal tersimpan.</p>
                  ) : (
                    <p>
                      Tersimpan <span className="font-semibold text-slate-800">{reportsSummary.total}</span> laporan dari{' '}
                      <span className="font-semibold text-slate-800">{reportsSummary.students}</span> mahasiswa di perangkat ini.
                      Data ini muncul di dashboard admin dan inbox dosen.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Inbox Dosen ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700">Inbox Laporan Dosen</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">{dosenSummary.length} dosen</span>
                    <button
                      onClick={handleClearDosenInbox}
                      disabled={dosenSummary.length === 0}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Hapus Semua
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {dosenSummary.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400 italic">Inbox dosen kosong.</p>
                  ) : (
                    dosenSummary.map(({ dosen, total, unread }) => (
                      <div key={dosen} className="flex items-center justify-between px-4 py-2.5">
                        <p className="text-xs text-slate-700 font-medium truncate flex-1">{dosen}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                              {unread} belum dibaca
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">{total} laporan</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Token Reset ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-700">Token Reset Password</span>
                  </div>
                  <button
                    onClick={handleClearResetTokens}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Bersihkan
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800">
                  Data lokal disimpan di perangkat ini saja. Menghapus data tidak dapat dibatalkan dan tidak memengaruhi Google Sheets.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
