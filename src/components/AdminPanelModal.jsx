import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Users, Database, ShieldCheck, GraduationCap, User,
  Trash2, RefreshCw, AlertTriangle, CheckCircle2, Inbox,
  RotateCcw, Calendar, Layers, Clock, Wifi, WifiOff, Search,
  ChevronUp, ChevronDown, Phone, FileSpreadsheet, Printer, Plus, Pencil,
  Eye, EyeOff, KeyRound
} from 'lucide-react';
import { getStoredUsersList, getStoredUsersWithPasswords, deleteStoredUser, resetPassword } from './AuthModal';
import {
  exportExcelAll, exportExcelPeriode, printRekapPeriode, printRekapAll,
  getLocalPeriods, saveLocalPeriods
} from '../utils/exportUtils';

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

export default function AdminPanelModal({ isOpen, onClose, sheetsData }) {
  const [tab, setTab] = useState('akun');
  const [users, setUsers] = useState([]);
  const [reportsSummary, setReportsSummary] = useState({ students: 0, total: 0 });
  const [dosenSummary, setDosenSummary] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [flash, setFlash] = useState('');
  const [search, setSearch] = useState('');
  const [filterAngkatan, setFilterAngkatan] = useState('all');
  const [sortCol, setSortCol] = useState('nim');
  const [sortAsc, setSortAsc] = useState(true);
  const [showPeriode, setShowPeriode] = useState(false);
  const [localPeriods, setLocalPeriods] = useState([]);
  const [newPeriodLabel, setNewPeriodLabel] = useState('');
  const [editPeriodIdx, setEditPeriodIdx] = useState(null);
  const [editPeriodVal, setEditPeriodVal] = useState('');
  const [exportPeriodeIdx, setExportPeriodeIdx] = useState('');
  // password show/hide & reset per user (keyed by email)
  const [showPass, setShowPass] = useState({});
  const [resetForm, setResetForm] = useState({}); // { [email]: { open, value, error } }

  const refresh = () => {
    setUsers(getStoredUsersWithPasswords());
    setReportsSummary(getLocalReportsSummary());
    setDosenSummary(getDosenLaporanSummary());
    setLocalPeriods(getLocalPeriods());
  };

  useEffect(() => { if (isOpen) { refresh(); setConfirmDelete(null); setFlash(''); } }, [isOpen]);

  const allWeekColumns = useMemo(() => {
    const sheets = sheetsData?.weekColumns || [];
    const local = localPeriods.filter(p => !sheets.includes(p));
    return [...sheets, ...local];
  }, [sheetsData, localPeriods]);

  const handleAddPeriod = () => {
    const label = newPeriodLabel.trim();
    if (!label || allWeekColumns.includes(label)) return;
    const updated = [...localPeriods, label];
    saveLocalPeriods(updated);
    setLocalPeriods(updated);
    setNewPeriodLabel('');
    showFlash(`Periode "${label}" berhasil ditambahkan.`);
  };

  const handleDeleteLocalPeriod = (label) => {
    const updated = localPeriods.filter(p => p !== label);
    saveLocalPeriods(updated);
    setLocalPeriods(updated);
    showFlash(`Periode "${label}" dihapus.`);
  };

  const handleSaveEditPeriod = (oldLabel) => {
    const newLabel = editPeriodVal.trim();
    if (!newLabel || (newLabel !== oldLabel && allWeekColumns.includes(newLabel))) return;
    const updated = localPeriods.map(p => p === oldLabel ? newLabel : p);
    saveLocalPeriods(updated);
    setLocalPeriods(updated);
    setEditPeriodIdx(null);
    setEditPeriodVal('');
    showFlash(`Periode diperbarui.`);
  };

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 2500); };

  const handleResetPassword = (email) => {
    const form = resetForm[email] || {};
    const newPass = (form.value || '').trim();
    if (newPass.length < 6) {
      setResetForm(prev => ({ ...prev, [email]: { ...form, error: 'Minimal 6 karakter.' } }));
      return;
    }
    const result = resetPassword(email, newPass);
    if (result?.error) {
      setResetForm(prev => ({ ...prev, [email]: { ...form, error: result.error } }));
    } else {
      refresh();
      setResetForm(prev => ({ ...prev, [email]: { open: false, value: '', error: '' } }));
      showFlash(`Password akun ${email} berhasil direset.`);
    }
  };

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

  const angkatanList = useMemo(() => {
    if (!sheetsData?.students) return [];
    return [...new Set(sheetsData.students.map(s => s.angkatan))].sort();
  }, [sheetsData]);

  const totalPeriode = sheetsData?.weekColumns?.length ?? 0;

  const filteredStudents = useMemo(() => {
    if (!sheetsData?.students) return [];
    let list = sheetsData.students;
    if (filterAngkatan !== 'all') list = list.filter(s => s.angkatan === filterAngkatan);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        s.nama?.toLowerCase().includes(q) ||
        s.nim?.toLowerCase().includes(q) ||
        s.pembimbing1?.toLowerCase().includes(q) ||
        s.pembimbing2?.toLowerCase().includes(q) ||
        s.penguji1?.toLowerCase().includes(q) ||
        s.penguji2?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let av = a[sortCol] ?? '';
      let bv = b[sortCol] ?? '';
      if (sortCol === 'laporan') {
        av = Object.values(a.weeklyUpdates || {}).filter(w => w.reported).length;
        bv = Object.values(b.weeklyUpdates || {}).filter(w => w.reported).length;
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [sheetsData, search, filterAngkatan, sortCol, sortAsc]);

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(p => !p);
    else { setSortCol(col); setSortAsc(true); }
  };

  if (!isOpen) return null;

  const dosenUsers = users.filter(u => u.role === 'dosen');
  const mahasiswaUsers = users.filter(u => u.role === 'mahasiswa');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden"
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
                        className={`rounded-xl border transition-colors ${
                          isConfirming ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        {/* Main row */}
                        <div className="flex items-center gap-3 p-3">
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
                            {/* Password row */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Password:</span>
                              <span className="font-mono text-[10px] text-slate-700 tracking-widest">
                                {showPass[u.email] ? (u.password || '—') : '••••••••'}
                              </span>
                              <button
                                onClick={() => setShowPass(prev => ({ ...prev, [u.email]: !prev[u.email] }))}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                title={showPass[u.email] ? 'Sembunyikan' : 'Tampilkan password'}
                              >
                                {showPass[u.email] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls} shrink-0`}>
                            {label}
                          </span>
                          {/* Reset password button */}
                          <button
                            onClick={() => setResetForm(prev => ({
                              ...prev,
                              [u.email]: { open: !prev[u.email]?.open, value: '', error: '' }
                            }))}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors shrink-0 ${
                              resetForm[u.email]?.open
                                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                : 'bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 hover:border-amber-200'
                            }`}
                            title="Reset password"
                          >
                            <KeyRound className="w-3 h-3" />
                            Reset
                          </button>
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

                        {/* Reset password form (inline) */}
                        {resetForm[u.email]?.open && (
                          <div className="px-3 pb-3 border-t border-slate-100 pt-2.5">
                            <p className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Password Baru</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Minimal 6 karakter"
                                value={resetForm[u.email]?.value || ''}
                                onChange={e => setResetForm(prev => ({
                                  ...prev,
                                  [u.email]: { ...prev[u.email], value: e.target.value, error: '' }
                                }))}
                                onKeyDown={e => e.key === 'Enter' && handleResetPassword(u.email)}
                                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                                autoFocus
                              />
                              <button
                                onClick={() => handleResetPassword(u.email)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors shrink-0"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => setResetForm(prev => ({ ...prev, [u.email]: { open: false, value: '', error: '' } }))}
                                className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-[10px] transition-colors shrink-0"
                              >
                                Batal
                              </button>
                            </div>
                            {resetForm[u.email]?.error && (
                              <p className="text-[10px] text-rose-600 mt-1">{resetForm[u.email].error}</p>
                            )}
                          </div>
                        )}
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

              {/* ── Google Sheets header ── */}
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
                  <div className="flex items-center gap-2">
                    {sheetsData?.lastUpdated && (
                      <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(sheetsData.lastUpdated)}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-semibold">Data Lokal</span>
                  </div>
                </div>

                {/* Stat grid */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                  {[
                    { icon: Users, label: 'Total Mahasiswa', value: sheetsData?.students?.length ?? '-', color: 'text-brand-700' },
                    { icon: Calendar, label: 'Periode', value: totalPeriode || '-', color: 'text-indigo-600' },
                    { icon: Layers, label: 'Angkatan', value: angkatanList.length || '-', color: 'text-emerald-600' },
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
                    <div className="px-4 py-3 space-y-1.5 border-b border-slate-100">
                      {Object.entries(byAngkatan).sort().map(([ang, count]) => (
                        <div key={ang} className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-500 w-16 shrink-0">Angk. {ang}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-brand-500 h-full rounded-full" style={{ width: `${(count / sheetsData.students.length) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 w-8 text-right shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Periode list toggle */}
                {sheetsData?.weekColumns?.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowPeriode(p => !p)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      <span>Daftar Periode ({sheetsData.weekColumns.length})</span>
                      {showPeriode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {showPeriode && (
                      <div className="px-4 pb-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                        {sheetsData.weekColumns.map((w, i) => (
                          <span key={w} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                            <span className="text-indigo-400">{i + 1}.</span> {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Daftar Mahasiswa (full table) ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-slate-700">Daftar Mahasiswa</span>
                    <span className="text-[10px] text-slate-400">({filteredStudents.length} ditampilkan)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Angkatan filter */}
                    <select
                      value={filterAngkatan}
                      onChange={e => setFilterAngkatan(e.target.value)}
                      className="text-[10px] font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 outline-none focus:ring-1 focus:ring-brand-400"
                    >
                      <option value="all">Semua Angkatan</option>
                      {angkatanList.map(a => (
                        <option key={a} value={a}>Angkatan {a}</option>
                      ))}
                    </select>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Cari nama / NIM / dosen…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-6 pr-3 py-1 text-[10px] border border-slate-200 rounded-lg bg-white text-slate-700 placeholder-slate-400 outline-none focus:ring-1 focus:ring-brand-400 w-44"
                      />
                    </div>
                  </div>
                </div>

                {/* Table */}
                {(() => {
                  const weeks = sheetsData?.weekColumns || [];
                  const totalCols = 11 + weeks.length;
                  const catCls = (cat) => {
                    if (!cat || cat === 'Belum Lapor') return null;
                    const map = {
                      Bimbingan: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      Seminar:   'bg-blue-50 text-blue-700 border-blue-200',
                      Sidang:    'bg-purple-50 text-purple-700 border-purple-200',
                      Revisi:    'bg-amber-50 text-amber-700 border-amber-200',
                      Lainnya:   'bg-slate-100 text-slate-600 border-slate-200',
                    };
                    return map[cat] || 'bg-slate-100 text-slate-600 border-slate-200';
                  };
                  return (
                    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                      <table className="w-full text-[10px] border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-100">
                          <tr>
                            {/* Fixed columns */}
                            {[
                              { col: null,           label: 'No',    w: 'w-8' },
                              { col: 'nim',          label: 'NIM',   w: 'w-24' },
                              { col: 'nama',         label: 'Nama',  w: 'w-40' },
                              { col: 'angkatan',     label: 'Angk.', w: 'w-14' },
                              { col: 'pembimbing1',  label: 'P1',    w: 'w-28' },
                              { col: 'pembimbing2',  label: 'P2',    w: 'w-28' },
                              { col: 'penguji1',     label: 'Pj1',   w: 'w-28' },
                              { col: 'penguji2',     label: 'Pj2',   w: 'w-28' },
                              { col: 'phone',        label: 'WA',    w: 'w-24' },
                              { col: 'statusTA',     label: 'Status',w: 'w-20' },
                              { col: 'laporan',      label: 'Total', w: 'w-14' },
                            ].map(({ col, label, w }) => (
                              <th key={label} onClick={col ? () => handleSort(col) : undefined}
                                className={`${w} px-2 py-2 text-left font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 bg-slate-100 ${col ? 'cursor-pointer hover:text-brand-700 select-none' : ''}`}>
                                <span className="flex items-center gap-0.5">
                                  {label}
                                  {col && sortCol === col && (sortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                                </span>
                              </th>
                            ))}
                            {/* Per-periode columns — terbaru di kiri */}
                            {[...weeks].reverse().map((w) => {
                              const realIdx = weeks.indexOf(w);
                              return (
                                <th key={w} title={w}
                                  className="px-2 py-2 text-center font-bold text-indigo-600 whitespace-nowrap border-b border-r border-slate-200 bg-indigo-50 min-w-[120px]">
                                  <div className="text-[9px] font-black text-indigo-500">Periode {realIdx + 1}</div>
                                  <div className="text-[8px] font-normal text-indigo-400 truncate max-w-[112px]">{w}</div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudents.length === 0 ? (
                            <tr><td colSpan={totalCols} className="text-center py-8 text-slate-400 italic">Tidak ada data mahasiswa.</td></tr>
                          ) : filteredStudents.map((s, i) => {
                            const reportedCount = weeks.filter(w => s.weeklyUpdates?.[w]?.reported).length;
                            return (
                              <tr key={s.nim} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-brand-50/30 transition-colors`}>
                                <td className="px-2 py-2 text-slate-400 font-mono border-r border-slate-100">{i + 1}</td>
                                <td className="px-2 py-2 text-slate-700 font-mono font-semibold whitespace-nowrap border-r border-slate-100">{s.nim}</td>
                                <td className="px-2 py-2 text-slate-800 font-medium border-r border-slate-100 max-w-[160px]">
                                  <span className="line-clamp-2">{s.nama}</span>
                                </td>
                                <td className="px-2 py-2 text-center border-r border-slate-100">
                                  <span className="px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-bold">{s.angkatan}</span>
                                </td>
                                <td className="px-2 py-2 text-slate-600 border-r border-slate-100 max-w-[112px]"><span className="line-clamp-2">{s.pembimbing1 || <span className="text-slate-300">-</span>}</span></td>
                                <td className="px-2 py-2 text-slate-600 border-r border-slate-100 max-w-[112px]"><span className="line-clamp-2">{s.pembimbing2 || <span className="text-slate-300">-</span>}</span></td>
                                <td className="px-2 py-2 text-slate-600 border-r border-slate-100 max-w-[112px]"><span className="line-clamp-2">{s.penguji1 || <span className="text-slate-300">-</span>}</span></td>
                                <td className="px-2 py-2 text-slate-600 border-r border-slate-100 max-w-[112px]"><span className="line-clamp-2">{s.penguji2 || <span className="text-slate-300">-</span>}</span></td>
                                <td className="px-2 py-2 whitespace-nowrap border-r border-slate-100">
                                  {s.phone ? <span className="flex items-center gap-0.5 text-emerald-700"><Phone className="w-2.5 h-2.5" />{s.phone}</span> : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-2 py-2 border-r border-slate-100">
                                  {s.statusTA ? <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-semibold whitespace-nowrap">{s.statusTA}</span> : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200 bg-slate-50">
                                  <span className={`font-black text-xs ${reportedCount === weeks.length && weeks.length > 0 ? 'text-emerald-600' : reportedCount > 0 ? 'text-amber-600' : 'text-rose-400'}`}>{reportedCount}</span>
                                  <span className="text-slate-400">/{weeks.length}</span>
                                </td>
                                {/* Per-periode cells — terbaru di kiri */}
                                {[...weeks].reverse().map(w => {
                                  const upd = s.weeklyUpdates?.[w];
                                  const cls = catCls(upd?.category);
                                  return (
                                    <td key={w} className="px-2 py-2 border-r border-slate-100 min-w-[120px] align-top"
                                      title={upd?.reported ? `${upd.category}\n${upd.progress}${upd.next ? '\nTarget: ' + upd.next : ''}` : 'Belum Melapor'}>
                                      {upd?.reported ? (
                                        <div className="space-y-0.5">
                                          <span className={`inline-flex px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${cls}`}>
                                            {upd.category}
                                          </span>
                                          {upd.progress && (
                                            <p className="text-[9px] text-slate-500 leading-tight line-clamp-2">{upd.progress}</p>
                                          )}
                                          {upd.next && (
                                            <p className="text-[9px] text-slate-400 leading-tight line-clamp-1 italic">→ {upd.next}</p>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 text-center block">–</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* ── Export ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700">Export Laporan</span>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {/* Export semua periode */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Rekap Semua Periode</p>
                      <p className="text-[10px] text-slate-400">Semua {allWeekColumns.length} periode dalam satu file</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => sheetsData?.students && exportExcelAll(sheetsData.students, allWeekColumns)}
                        disabled={!sheetsData?.students}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        Excel
                      </button>
                      <button
                        onClick={() => sheetsData?.students && printRekapAll(sheetsData.students, allWeekColumns)}
                        disabled={!sheetsData?.students}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-40 transition-colors"
                      >
                        <Printer className="w-3 h-3" />
                        PDF
                      </button>
                    </div>
                  </div>

                  {/* Export per periode */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={exportPeriodeIdx}
                      onChange={e => setExportPeriodeIdx(e.target.value)}
                      className="flex-1 text-[10px] font-semibold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 outline-none focus:ring-1 focus:ring-brand-400"
                    >
                      <option value="">Pilih periode untuk export…</option>
                      {allWeekColumns.map((w, i) => (
                        <option key={w} value={i}>Periode {i + 1} – {w}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const week = allWeekColumns[Number(exportPeriodeIdx)];
                        if (week && sheetsData?.students) exportExcelPeriode(sheetsData.students, week, allWeekColumns);
                      }}
                      disabled={exportPeriodeIdx === '' || !sheetsData?.students}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-40 transition-colors shrink-0"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      Excel
                    </button>
                    <button
                      onClick={() => {
                        const week = allWeekColumns[Number(exportPeriodeIdx)];
                        if (week && sheetsData?.students) printRekapPeriode(sheetsData.students, week, allWeekColumns);
                      }}
                      disabled={exportPeriodeIdx === '' || !sheetsData?.students}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-40 transition-colors shrink-0"
                    >
                      <Printer className="w-3 h-3" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Kelola Periode ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700">Kelola Periode</span>
                    <span className="text-[10px] text-slate-400">({allWeekColumns.length} total)</span>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {/* Dari Google Sheets */}
                  {(sheetsData?.weekColumns || []).map((w, i) => (
                    <div key={w} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="flex-1 text-slate-700">{w}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-semibold">Sheets</span>
                    </div>
                  ))}
                  {/* Periode lokal */}
                  {localPeriods.map((p, i) => {
                    const isEditing = editPeriodIdx === i;
                    const globalIdx = (sheetsData?.weekColumns?.length || 0) + i;
                    return (
                      <div key={p} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center shrink-0">{globalIdx + 1}</span>
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={editPeriodVal}
                              onChange={e => setEditPeriodVal(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveEditPeriod(p)}
                              className="flex-1 text-xs border border-brand-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400"
                              autoFocus
                            />
                            <button onClick={() => handleSaveEditPeriod(p)} className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900">Simpan</button>
                            <button onClick={() => setEditPeriodIdx(null)} className="text-[10px] text-slate-400 hover:text-slate-600">Batal</button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-xs text-slate-700">{p}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-semibold">Lokal</span>
                            <button onClick={() => { setEditPeriodIdx(i); setEditPeriodVal(p); }} className="p-1 text-slate-400 hover:text-brand-600"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => handleDeleteLocalPeriod(p)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {/* Tambah periode baru */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Nama periode baru, cth: 05 - 09 Oktober 26"
                      value={newPeriodLabel}
                      onChange={e => setNewPeriodLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddPeriod()}
                      className="flex-1 text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand-400"
                    />
                    <button
                      onClick={handleAddPeriod}
                      disabled={!newPeriodLabel.trim()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      Tambah
                    </button>
                  </div>
                </div>
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
