import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Users, Database, ShieldCheck, GraduationCap, User,
  Trash2, RefreshCw, AlertTriangle, CheckCircle2, Inbox,
  RotateCcw, Calendar, Layers, Clock, Wifi, WifiOff, Search,
  ChevronUp, ChevronDown, Phone, FileSpreadsheet, Printer, Plus, Pencil,
  Eye, EyeOff, KeyRound, Lock, Unlock
} from 'lucide-react';
import { getStoredUsersList, getStoredUsersWithPasswords, deleteStoredUser, resetPassword } from './AuthModal';
import {
  exportExcelAll, exportExcelPeriode, printRekapPeriode, printRekapAll,
  getCustomPeriods, addCustomPeriod, deleteCustomPeriod, updateCustomPeriod,
  getLockedPeriods, lockPeriod, unlockPeriod,
  BUILTIN_SEMESTERS, getLocalSemesters, saveLocalSemesters,
  getVerifikasi, getPenolakan,
  getAllLaporanBimbingan, getLaporanMasukDatabase, tandaiMasukDatabase, batalMasukDatabase,
  getStudentOverrides, upsertStudentOverride,
} from '../utils/exportUtils';

const _PM = {
  Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
  Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11,
};
const _MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function parsePeriodEnd(label) {
  const m = label.match(/\d+\s*-\s*(\d+)\s+(\w+)\s+(\d+)/);
  if (!m) return new Date(0);
  return new Date(2000 + parseInt(m[3]), _PM[m[2]] ?? 0, parseInt(m[1]));
}

// Generate "DD - DD Month YY" label from ISO date strings
function formatPeriodLabel(startIso, endIso) {
  if (!startIso || !endIso) return '';
  const sd = new Date(startIso + 'T00:00:00');
  const ed = new Date(endIso + 'T00:00:00');
  const startDay = String(sd.getDate()).padStart(2, '0');
  const endDay = String(ed.getDate()).padStart(2, '0');
  return `${startDay} - ${endDay} ${_MONTHS_ID[ed.getMonth()]} ${String(ed.getFullYear()).slice(-2)}`;
}

// Display "DD - DD Month YY" as "DD Month YY - DD Month YY" (full date both sides)
function displayLabel(label) {
  const m = label.match(/(\d+)\s*-\s*(\d+)\s+(\w+)\s+(\d+)/);
  if (!m) return label;
  const startDay = parseInt(m[1]), endDay = parseInt(m[2]);
  const endMonthIdx = _PM[m[3]] ?? 0;
  const endYear = 2000 + parseInt(m[4]);
  let startMonthIdx = endMonthIdx, startYear = endYear;
  if (startDay > endDay) {
    startMonthIdx--;
    if (startMonthIdx < 0) { startMonthIdx = 11; startYear--; }
  }
  const fmt = (d, mi, y) => `${String(d).padStart(2, '0')} ${_MONTHS_ID[mi]} ${String(y).slice(-2)}`;
  return `${fmt(startDay, startMonthIdx, startYear)} - ${fmt(endDay, endMonthIdx, endYear)}`;
}

// Parse existing "DD - DD Month YY" label back to {start, end} ISO dates
function parseLabelToDates(label) {
  const m = label.match(/(\d+)\s*-\s*(\d+)\s+(\w+)\s+(\d+)/);
  if (!m) return { start: '', end: '' };
  const startDay = parseInt(m[1]), endDay = parseInt(m[2]);
  const endMonth = _PM[m[3]] ?? 0, endYear = 2000 + parseInt(m[4]);
  let startMonth = endMonth, startYear = endYear;
  if (startDay > endDay) {
    startMonth--;
    if (startMonth < 0) { startMonth = 11; startYear--; }
  }
  const toISO = (y, mo, d) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return {
    start: toISO(startYear, startMonth, startDay),
    end: toISO(endYear, endMonth, endDay),
  };
}

const STATUS_TA_CLS = {
  'Proposal':      'bg-blue-50 text-blue-700 border-blue-200',
  'Seminar Hasil': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Sidang':        'bg-purple-50 text-purple-700 border-purple-200',
  'Revisi':        'bg-amber-50 text-amber-700 border-amber-200',
  'Lulus':         'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const STATUS_TA_OPTIONS = ['Proposal', 'Seminar Hasil', 'Sidang', 'Revisi', 'Lulus'];

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

function getDosenSummaryFromLaporan(laporan) {
  const map = {};
  laporan.forEach(l => {
    const dh = l.dosen_hadir;
    const list = dh?.list || (Array.isArray(dh) ? dh : []);
    list.forEach(d => {
      if (!d?.name) return;
      if (!map[d.name]) map[d.name] = { dosen: d.name, total: 0 };
      map[d.name].total++;
    });
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

export default function AdminPanelModal({ isOpen, onClose, sheetsData, onSemestersChange, onLockedPeriodsChange, onCustomPeriodsChange }) {
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
  // Periods now stored as {label, semester}[]
  const [customPeriods, setCustomPeriods] = useState([]);
  const [newPeriodDatesBySemester, setNewPeriodDatesBySemester] = useState({});
  const [editPeriodLabel, setEditPeriodLabel] = useState(null);
  const [editPeriodDates, setEditPeriodDates] = useState({ start: '', end: '' });
  const [exportPeriodeIdx, setExportPeriodeIdx] = useState('');
  const [localSemesters, setLocalSemesters] = useState([]);
  const [newSemesterLabel, setNewSemesterLabel] = useState('');
  const [expandedSemester, setExpandedSemester] = useState(BUILTIN_SEMESTERS[0]);
  const [lockedPeriodSet, setLockedPeriodSet] = useState(new Set());
  // Laporan Mahasiswa
  const [allLaporan, setAllLaporan] = useState([]);
  const [verifData, setVerifData] = useState({});
  const [penolakanData, setPenolakanData] = useState({});
  const [masukDbList, setMasukDbList] = useState([]);
  const [laporanFilter, setLaporanFilter] = useState('semua');
  // Student dosen overrides
  const [studentOverrides, setStudentOverrides] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { nim, field }
  const [editingValue, setEditingValue] = useState('');
  const _cancelEditRef = useRef(false);
  // Add student form
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addStudentForm, setAddStudentForm] = useState({ nim: '', nama: '', angkatan: '', pembimbing1: '', pembimbing2: '', penguji1: '', penguji2: '', phone: '', status_ta: '' });
  const [addStudentError, setAddStudentError] = useState('');
  // password show/hide & reset per user (keyed by email)
  const [showPass, setShowPass] = useState({});
  const [resetForm, setResetForm] = useState({}); // { [email]: { open, value, error } }

  const refresh = async () => {
    setUsers(await getStoredUsersWithPasswords());
    setReportsSummary(getLocalReportsSummary());
    const cp = await getCustomPeriods();
    setCustomPeriods(cp);
    setLocalSemesters(getLocalSemesters());
    setLockedPeriodSet(new Set(await getLockedPeriods()));
    const [laporan, verif, penolakan, masukDb] = await Promise.all([
      getAllLaporanBimbingan(),
      getVerifikasi(),
      getPenolakan(),
      getLaporanMasukDatabase(),
    ]);
    setAllLaporan(laporan);
    setVerifData(verif);
    setPenolakanData(penolakan);
    setMasukDbList(masukDb);
    // Compute dosen inbox from Supabase data; fall back to localStorage if empty
    const fromSupabase = getDosenSummaryFromLaporan(laporan);
    setDosenSummary(fromSupabase.length > 0 ? fromSupabase : getDosenLaporanSummary());
    setStudentOverrides(await getStudentOverrides());
  };

  const _refreshStudentOverrides = async () => {
    setStudentOverrides(await getStudentOverrides());
  };

  useEffect(() => { if (isOpen) { refresh(); setConfirmDelete(null); setFlash(''); } }, [isOpen]);

  const allSemesters = useMemo(() => [...BUILTIN_SEMESTERS, ...localSemesters], [localSemesters]);

  // Group periods by semester; sheets periods belong to BUILTIN_SEMESTERS[0]
  const periodsBySemester = useMemo(() => {
    const sheetsWeeks = sheetsData?.sheetsWeekColumns || sheetsData?.weekColumns || [];
    const result = {};
    allSemesters.forEach(s => { result[s] = []; });
    sheetsWeeks.forEach(w => {
      result[BUILTIN_SEMESTERS[0]].push({ label: w, source: 'sheets' });
    });
    customPeriods.forEach(p => {
      const sem = p.semester || BUILTIN_SEMESTERS[0];
      if (!result[sem]) result[sem] = [];
      if (!result[sem].some(x => x.label === p.label)) {
        result[sem].push({ label: p.label, source: 'admin' });
      }
    });
    Object.keys(result).forEach(s => {
      result[s].sort((a, b) => parsePeriodEnd(a.label) - parsePeriodEnd(b.label));
    });
    return result;
  }, [sheetsData, customPeriods, allSemesters]);

  // All week columns across all semesters (for export)
  const allWeekColumns = useMemo(() => {
    const all = Object.values(periodsBySemester).flat().map(p => p.label);
    return [...new Set(all)].sort((a, b) => parsePeriodEnd(a) - parsePeriodEnd(b));
  }, [periodsBySemester]);

  // sheetsData students merged with admin overrides
  const mergedStudents = useMemo(() => {
    const sheetNims = new Set(sheetsData?.students?.map(s => s.nim) ?? []);
    const fromSheets = (sheetsData?.students ?? []).map(s => {
      const ov = studentOverrides[s.nim] || {};
      return {
        ...s,
        pembimbing1: ov.pembimbing1 ?? s.pembimbing1,
        pembimbing2: ov.pembimbing2 ?? s.pembimbing2,
        penguji1:    ov.penguji1    ?? s.penguji1,
        penguji2:    ov.penguji2    ?? s.penguji2,
        statusTA:    ov.status_ta   ?? s.statusTA,
      };
    });
    const customStudents = Object.values(studentOverrides)
      .filter(ov => ov.is_custom && !sheetNims.has(ov.nim))
      .map(ov => ({
        nim: ov.nim,
        nama: ov.nama || '',
        angkatan: ov.angkatan || '',
        pembimbing1: ov.pembimbing1 || null,
        pembimbing2: ov.pembimbing2 || null,
        penguji1:    ov.penguji1    || null,
        penguji2:    ov.penguji2    || null,
        phone:       ov.phone       || null,
        statusTA:    ov.status_ta   || null,
        weeklyUpdates: {},
        _isCustom: true,
      }));
    return [...fromSheets, ...customStudents];
  }, [sheetsData, studentOverrides]);

  const _refreshCustomPeriods = async () => {
    const cp = await getCustomPeriods();
    setCustomPeriods(cp);
    onCustomPeriodsChange?.(cp);
  };

  const handleAddPeriod = async (semester) => {
    const { start = '', end = '' } = newPeriodDatesBySemester[semester] || {};
    if (!start || !end || start > end) return;
    const label = formatPeriodLabel(start, end);
    if (!label || allWeekColumns.includes(label)) return;
    await addCustomPeriod(label, semester);
    await _refreshCustomPeriods();
    setNewPeriodDatesBySemester(prev => ({ ...prev, [semester]: { start: '', end: '' } }));
    showFlash(`Periode "${label}" berhasil ditambahkan.`);
  };

  const handleDeleteLocalPeriod = async (label) => {
    await deleteCustomPeriod(label);
    await _refreshCustomPeriods();
    showFlash(`Periode "${label}" dihapus.`);
  };

  const handleSaveEditPeriod = async (oldLabel) => {
    const { start = '', end = '' } = editPeriodDates;
    if (!start || !end || start > end) return;
    const newLabel = formatPeriodLabel(start, end);
    if (!newLabel || (newLabel !== oldLabel && allWeekColumns.includes(newLabel))) return;
    await updateCustomPeriod(oldLabel, newLabel);
    await _refreshCustomPeriods();
    setEditPeriodLabel(null);
    setEditPeriodDates({ start: '', end: '' });
    showFlash(`Periode diperbarui.`);
  };

  const handleToggleLock = async (label) => {
    if (lockedPeriodSet.has(label)) {
      await unlockPeriod(label);
      const updated = new Set(await getLockedPeriods());
      setLockedPeriodSet(updated);
      onLockedPeriodsChange?.([...updated]);
      showFlash(`Periode "${label}" dibuka kembali.`);
    } else {
      await lockPeriod(label);
      const updated = new Set(await getLockedPeriods());
      setLockedPeriodSet(updated);
      onLockedPeriodsChange?.([...updated]);
      showFlash(`Periode "${label}" dikunci.`);
    }
  };

  const handleAddSemester = () => {
    const label = newSemesterLabel.trim();
    if (!label || allSemesters.includes(label)) return;
    const updated = [...localSemesters, label];
    saveLocalSemesters(updated);
    setLocalSemesters(updated);
    onSemestersChange?.(updated);
    setNewSemesterLabel('');
    setExpandedSemester(label);
    showFlash(`Semester "${label}" berhasil ditambahkan.`);
  };

  const handleDeleteLocalSemester = (label) => {
    const updated = localSemesters.filter(s => s !== label);
    saveLocalSemesters(updated);
    setLocalSemesters(updated);
    onSemestersChange?.(updated);
    if (expandedSemester === label) setExpandedSemester(BUILTIN_SEMESTERS[0]);
    showFlash(`Semester "${label}" dihapus.`);
  };

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 2500); };

  const handleResetPassword = async (email) => {
    const form = resetForm[email] || {};
    const newPass = (form.value || '').trim();
    if (newPass.length < 6) {
      setResetForm(prev => ({ ...prev, [email]: { ...form, error: 'Minimal 6 karakter.' } }));
      return;
    }
    const result = await resetPassword(email, newPass);
    if (result?.error) {
      setResetForm(prev => ({ ...prev, [email]: { ...form, error: result.error } }));
    } else {
      refresh();
      setResetForm(prev => ({ ...prev, [email]: { open: false, value: '', error: '' } }));
      showFlash(`Password akun ${email} berhasil direset.`);
    }
  };

  const handleDeleteUser = async (email) => {
    if (confirmDelete === email) {
      await deleteStoredUser(email);
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

  const allDosenOptions = useMemo(() => {
    const fromSheet = sheetsData?.students?.flatMap(s =>
      [s.pembimbing1, s.pembimbing2, s.penguji1, s.penguji2].filter(Boolean)
    ) ?? [];
    const fromUsers = users
      .filter(u => u.role === 'dosen')
      .map(u => u.lecturerName || u.name)
      .filter(Boolean);
    return [...new Set([...fromSheet, ...fromUsers])]
      .filter(n => n.includes(' ') && n.length > 5)
      .sort();
  }, [sheetsData, users]);

  const totalPeriode = sheetsData?.weekColumns?.length ?? 0;

  const filteredStudents = useMemo(() => {
    if (!mergedStudents.length && !sheetsData?.students?.length) return [];
    let list = mergedStudents;
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
  }, [mergedStudents, sheetsData, search, filterAngkatan, sortCol, sortAsc]);

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(p => !p);
    else { setSortCol(col); setSortAsc(true); }
  };

  const startEdit = (nim, field, currentValue) => {
    _cancelEditRef.current = false;
    setEditingCell({ nim, field });
    setEditingValue(currentValue || '');
  };

  const saveEdit = async () => {
    if (_cancelEditRef.current) { _cancelEditRef.current = false; return; }
    if (!editingCell) return;
    const { nim, field } = editingCell;
    setEditingCell(null);
    const val = editingValue.trim() || null;
    await upsertStudentOverride(nim, { [field]: val });
    await _refreshStudentOverrides();
  };

  const cancelEdit = () => {
    _cancelEditRef.current = true;
    setEditingCell(null);
    setEditingValue('');
  };

  const handleAddStudent = async () => {
    const { nim, nama, angkatan } = addStudentForm;
    if (!nim.trim()) { setAddStudentError('NIM wajib diisi.'); return; }
    if (!nama.trim()) { setAddStudentError('Nama wajib diisi.'); return; }
    if (!angkatan.trim()) { setAddStudentError('Angkatan wajib diisi.'); return; }
    const existing = Object.values(studentOverrides).find(ov => ov.nim === nim.trim());
    const sheetsHas = sheetsData?.students?.some(s => s.nim === nim.trim());
    if (existing || sheetsHas) { setAddStudentError('NIM sudah terdaftar.'); return; }
    setAddStudentError('');
    await upsertStudentOverride(nim.trim(), {
      nama: nama.trim(),
      angkatan: angkatan.trim(),
      pembimbing1: addStudentForm.pembimbing1 || null,
      pembimbing2: addStudentForm.pembimbing2 || null,
      penguji1:    addStudentForm.penguji1    || null,
      penguji2:    addStudentForm.penguji2    || null,
      phone:       addStudentForm.phone       || null,
      status_ta:   addStudentForm.status_ta   || null,
      is_custom:   true,
    });
    await _refreshStudentOverrides();
    setAddStudentOpen(false);
    setAddStudentForm({ nim: '', nama: '', angkatan: '', pembimbing1: '', pembimbing2: '', penguji1: '', penguji2: '', phone: '', status_ta: '' });
    showFlash('Mahasiswa berhasil ditambahkan.');
  };

  if (!isOpen) return null;

  const dosenUsers = users.filter(u => u.role === 'dosen');
  const mahasiswaUsers = users.filter(u => u.role === 'mahasiswa');

  return (
    <>
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
                    <button
                      onClick={() => { setAddStudentOpen(true); setAddStudentError(''); }}
                      className="flex items-center gap-1 text-[10px] font-semibold bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Mahasiswa
                    </button>
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
                                {[
                                  { field: 'pembimbing1', val: s.pembimbing1 },
                                  { field: 'pembimbing2', val: s.pembimbing2 },
                                  { field: 'penguji1',    val: s.penguji1 },
                                  { field: 'penguji2',    val: s.penguji2 },
                                ].map(({ field, val }) => {
                                  const isEditing = editingCell?.nim === s.nim && editingCell?.field === field;
                                  return (
                                    <td key={field} className="px-2 py-2 border-r border-slate-100 max-w-[112px]">
                                      {isEditing ? (
                                        <select
                                          value={editingValue}
                                          onChange={e => setEditingValue(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                                          onBlur={saveEdit}
                                          autoFocus
                                          className="w-full text-[10px] border border-brand-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-brand-400 bg-white"
                                        >
                                          <option value="">— pilih dosen —</option>
                                          {allDosenOptions.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                          ))}
                                          {val && !allDosenOptions.includes(val) && (
                                            <option value={val}>{val} (lainnya)</option>
                                          )}
                                        </select>
                                      ) : (
                                        <div className="flex items-center gap-0.5 group cursor-pointer" onClick={() => startEdit(s.nim, field, val)}>
                                          <span className="line-clamp-2 text-[10px] text-slate-600 flex-1">{val || <span className="text-slate-300 group-hover:text-brand-400">+ dosen</span>}</span>
                                          <Pencil className="w-2 h-2 text-slate-200 group-hover:text-brand-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-2 py-2 whitespace-nowrap border-r border-slate-100">
                                  {s.phone ? <span className="flex items-center gap-0.5 text-emerald-700"><Phone className="w-2.5 h-2.5" />{s.phone}</span> : <span className="text-slate-300">-</span>}
                                </td>
                                {(() => {
                                  const isEditing = editingCell?.nim === s.nim && editingCell?.field === 'status_ta';
                                  const staCls = STATUS_TA_CLS[s.statusTA] || 'bg-slate-100 text-slate-600 border-slate-200';
                                  return (
                                    <td className="px-2 py-2 border-r border-slate-100">
                                      {isEditing ? (
                                        <select
                                          value={editingValue}
                                          onChange={e => setEditingValue(e.target.value)}
                                          onBlur={saveEdit}
                                          autoFocus
                                          className="w-full text-[10px] border border-brand-300 rounded px-1 py-0.5 outline-none bg-white"
                                        >
                                          <option value="">— hapus —</option>
                                          {STATUS_TA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                      ) : (
                                        <div className="cursor-pointer group" onClick={() => startEdit(s.nim, 'status_ta', s.statusTA)}>
                                          {s.statusTA
                                            ? <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-semibold whitespace-nowrap ${staCls}`}>{s.statusTA}</span>
                                            : <span className="text-slate-300 text-[9px] group-hover:text-brand-400 transition-colors">+ status</span>
                                          }
                                        </div>
                                      )}
                                    </td>
                                  );
                                })()}
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

              {/* ── Kelola Semester (dengan periode di dalamnya) ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <Layers className="w-4 h-4 text-violet-600" />
                  <span className="text-xs font-bold text-slate-700">Kelola Semester</span>
                  <span className="text-[10px] text-slate-400">({allSemesters.length} semester)</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {allSemesters.map((sem, semIdx) => {
                    const isBuiltin = BUILTIN_SEMESTERS.includes(sem);
                    const isExpanded = expandedSemester === sem;
                    const semPeriods = periodsBySemester[sem] || [];

                    return (
                      <div key={sem}>
                        {/* Semester header row */}
                        <div
                          className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                          onClick={() => setExpandedSemester(isExpanded ? null : sem)}
                        >
                          <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">{semIdx + 1}</span>
                          <span className="flex-1 text-xs font-semibold text-slate-700">{sem}</span>
                          <span className="text-[10px] text-slate-400">{semPeriods.length} periode</span>
                          {isBuiltin ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-semibold">Bawaan</span>
                          ) : (
                            <>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-semibold">Admin</span>
                              <button
                                onClick={e => { e.stopPropagation(); handleDeleteLocalSemester(sem); }}
                                className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                                title="Hapus semester"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                        </div>

                        {/* Expanded: period list + add input */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/40 px-4 pb-4 pt-3 space-y-2">
                            {semPeriods.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic py-1">Belum ada periode untuk semester ini.</p>
                            ) : (
                              semPeriods.map((p, pIdx) => {
                                const isAdmin = p.source === 'admin';
                                const isLocked = lockedPeriodSet.has(p.label);
                                const isEditing = editPeriodLabel === p.label;

                                return (
                                  <div key={p.label} className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{pIdx + 1}</span>
                                    {isEditing ? (
                                      <>
                                        <div className="flex items-center gap-1.5 flex-1">
                                          <div className="flex flex-col gap-0.5 flex-1">
                                            <span className="text-[9px] text-slate-400 font-semibold">Dari</span>
                                            <input type="date"
                                              value={editPeriodDates.start || ''}
                                              onChange={e => setEditPeriodDates(prev => ({ ...prev, start: e.target.value }))}
                                              className="text-[10px] border border-brand-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 w-full"
                                              autoFocus />
                                          </div>
                                          <span className="text-slate-400 text-[10px] mt-3">–</span>
                                          <div className="flex flex-col gap-0.5 flex-1">
                                            <span className="text-[9px] text-slate-400 font-semibold">Sampai</span>
                                            <input type="date"
                                              value={editPeriodDates.end || ''}
                                              min={editPeriodDates.start || ''}
                                              onChange={e => setEditPeriodDates(prev => ({ ...prev, end: e.target.value }))}
                                              className="text-[10px] border border-brand-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 w-full" />
                                          </div>
                                        </div>
                                        {editPeriodDates.start && editPeriodDates.end && (
                                          <span className="text-[9px] text-brand-600 font-mono bg-brand-50 px-1.5 py-0.5 rounded shrink-0">
                                            {displayLabel(formatPeriodLabel(editPeriodDates.start, editPeriodDates.end))}
                                          </span>
                                        )}
                                        <button onClick={() => handleSaveEditPeriod(p.label)} className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 shrink-0">Simpan</button>
                                        <button onClick={() => setEditPeriodLabel(null)} className="text-[10px] text-slate-400 hover:text-slate-600 shrink-0">Batal</button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-xs text-slate-700">{displayLabel(p.label)}</span>
                                        {isLocked && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-semibold flex items-center gap-0.5">
                                            <Lock className="w-2.5 h-2.5" />Dikunci
                                          </span>
                                        )}
                                        {isAdmin ? (
                                          <>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-semibold">Admin</span>
                                            <button onClick={() => { setEditPeriodLabel(p.label); setEditPeriodDates(parseLabelToDates(p.label)); }} className="p-1 text-slate-400 hover:text-brand-600"><Pencil className="w-3 h-3" /></button>
                                            <button onClick={() => handleDeleteLocalPeriod(p.label)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                                          </>
                                        ) : (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-semibold">Sheets</span>
                                        )}
                                        <button
                                          onClick={() => handleToggleLock(p.label)}
                                          title={isLocked ? 'Buka kunci periode' : 'Kunci periode'}
                                          className={`p-1 transition-colors ${isLocked ? 'text-slate-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-600'}`}
                                        >
                                          {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                );
                              })
                            )}
                            {/* Add period for this semester — date range picker */}
                            <div className="pt-2 border-t border-slate-200 mt-2 space-y-1.5">
                              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Tambah Periode Baru</p>
                              <div className="flex items-end gap-2">
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <label className="text-[9px] text-slate-400">Dari</label>
                                  <input type="date"
                                    value={(newPeriodDatesBySemester[sem] || {}).start || ''}
                                    onChange={e => setNewPeriodDatesBySemester(prev => ({ ...prev, [sem]: { ...(prev[sem] || {}), start: e.target.value } }))}
                                    className="text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand-400 bg-white w-full" />
                                </div>
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <label className="text-[9px] text-slate-400">Sampai</label>
                                  <input type="date"
                                    value={(newPeriodDatesBySemester[sem] || {}).end || ''}
                                    min={(newPeriodDatesBySemester[sem] || {}).start || ''}
                                    onChange={e => setNewPeriodDatesBySemester(prev => ({ ...prev, [sem]: { ...(prev[sem] || {}), end: e.target.value } }))}
                                    className="text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand-400 bg-white w-full" />
                                </div>
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  {(newPeriodDatesBySemester[sem] || {}).start && (newPeriodDatesBySemester[sem] || {}).end && (
                                    <span className="text-[9px] text-brand-600 font-mono bg-brand-50 px-1.5 py-0.5 rounded text-center">
                                      {displayLabel(formatPeriodLabel((newPeriodDatesBySemester[sem] || {}).start, (newPeriodDatesBySemester[sem] || {}).end))}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleAddPeriod(sem)}
                                    disabled={!(newPeriodDatesBySemester[sem] || {}).start || !(newPeriodDatesBySemester[sem] || {}).end || (newPeriodDatesBySemester[sem] || {}).start > (newPeriodDatesBySemester[sem] || {}).end}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Tambah
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Add new semester */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="cth: Semester Genap 2027/2028"
                      value={newSemesterLabel}
                      onChange={e => setNewSemesterLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddSemester()}
                      className="flex-1 text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-violet-400 bg-white"
                    />
                    <button
                      onClick={handleAddSemester}
                      disabled={!newSemesterLabel.trim() || allSemesters.includes(newSemesterLabel.trim())}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 transition-colors shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      Tambah Semester
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Laporan Mahasiswa (online) ── */}
              {(() => {
                const masukDbSet = new Set(masukDbList.map(r => `${r.nim}|${r.week}`));
                const getLaporanStatus = (nim, week) => {
                  if (masukDbSet.has(`${nim}|${week}`)) return 'masuk_database';
                  if (verifData[nim]?.[week]) return 'diverifikasi';
                  if (penolakanData[nim]?.[week]) return 'ditolak';
                  return 'menunggu';
                };
                const statusCounts = allLaporan.reduce((acc, l) => {
                  acc[getLaporanStatus(l.nim, l.week)] = (acc[getLaporanStatus(l.nim, l.week)] || 0) + 1;
                  return acc;
                }, {});
                const filtered = laporanFilter === 'semua'
                  ? allLaporan
                  : allLaporan.filter(l => getLaporanStatus(l.nim, l.week) === laporanFilter);

                const STATUS_META = {
                  menunggu:       { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                  diverifikasi:   { label: 'Diverifikasi Dosen',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                  ditolak:        { label: 'Ditolak Dosen',        cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                  masuk_database: { label: 'Masuk Database',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                };
                const FILTERS = [
                  { key: 'semua',         label: 'Semua',         count: allLaporan.length },
                  { key: 'menunggu',      label: 'Menunggu',      count: statusCounts.menunggu || 0 },
                  { key: 'diverifikasi',  label: 'Diverifikasi',  count: statusCounts.diverifikasi || 0 },
                  { key: 'ditolak',       label: 'Ditolak',       count: statusCounts.ditolak || 0 },
                  { key: 'masuk_database',label: 'Masuk DB',      count: statusCounts.masuk_database || 0 },
                ];

                return (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-brand-600" />
                        <span className="text-xs font-bold text-slate-700">Laporan Mahasiswa</span>
                        <span className="text-[10px] text-slate-400">{allLaporan.length} laporan</span>
                      </div>
                      <button onClick={refresh} className="p-1 text-slate-400 hover:text-brand-600 transition-colors" title="Refresh">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Stats bar */}
                    <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-white">
                      {[
                        { label: 'Menunggu',    count: statusCounts.menunggu || 0,      color: 'text-amber-600' },
                        { label: 'Diverifikasi',count: statusCounts.diverifikasi || 0,  color: 'text-blue-600' },
                        { label: 'Ditolak',     count: statusCounts.ditolak || 0,       color: 'text-rose-600' },
                        { label: 'Masuk DB',    count: statusCounts.masuk_database || 0,color: 'text-emerald-600' },
                      ].map(({ label, count, color }) => (
                        <div key={label} className="flex flex-col items-center py-2.5 px-2 text-center">
                          <span className={`text-base font-black ${color}`}>{count}</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100 overflow-x-auto">
                      {FILTERS.map(f => (
                        <button
                          key={f.key}
                          onClick={() => setLaporanFilter(f.key)}
                          className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                            laporanFilter === f.key
                              ? 'bg-brand-600 text-white'
                              : 'bg-white text-slate-500 border border-slate-200 hover:border-brand-300'
                          }`}
                        >
                          {f.label}
                          <span className={`px-1 rounded-full text-[9px] font-bold ${laporanFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {f.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* List */}
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="px-4 py-5 text-xs text-slate-400 italic text-center">
                          {allLaporan.length === 0 ? 'Belum ada laporan masuk.' : 'Tidak ada laporan dengan status ini.'}
                        </p>
                      ) : (
                        filtered.map(l => {
                          const status = getLaporanStatus(l.nim, l.week);
                          const meta = STATUS_META[status];
                          const verif = verifData[l.nim]?.[l.week];
                          const penolakan = penolakanData[l.nim]?.[l.week];
                          const submittedDate = l.submitted_at ? new Date(l.submitted_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';
                          return (
                            <div key={`${l.nim}|${l.week}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold text-slate-700">{l.nama || l.nim}</span>
                                  <span className="text-[9px] text-slate-400">{l.nim}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${meta.cls}`}>{meta.label}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-indigo-600 font-medium">{displayLabel(l.week)}</span>
                                  {l.category && <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{l.category}</span>}
                                  <span className="text-[9px] text-slate-400">{submittedDate}</span>
                                </div>
                                {status === 'ditolak' && penolakan?.alasan && (
                                  <p className="text-[9px] text-rose-600 mt-0.5 italic">Alasan: {penolakan.alasan}</p>
                                )}
                                {(status === 'diverifikasi' || status === 'masuk_database') && verif?.dosenName && (
                                  <p className="text-[9px] text-blue-600 mt-0.5">Diverifikasi oleh: {verif.dosenName.split(',')[0]}</p>
                                )}
                              </div>
                              {/* Action */}
                              <div className="shrink-0">
                                {status === 'diverifikasi' && (
                                  <button
                                    onClick={async () => { await tandaiMasukDatabase(l.nim, l.week); await refresh(); }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors whitespace-nowrap"
                                  >
                                    ✓ Masuk DB
                                  </button>
                                )}
                                {status === 'masuk_database' && (
                                  <button
                                    onClick={async () => { await batalMasukDatabase(l.nim, l.week); await refresh(); }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors whitespace-nowrap"
                                  >
                                    Batal
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── Inbox Dosen ── */}
              {(() => {
                const mdbSet = new Set(masukDbList.map(r => `${r.nim}|${r.week}`));
                const getInboxStatus = (nim, week) => {
                  if (mdbSet.has(`${nim}|${week}`)) return 'masuk_database';
                  if (verifData[nim]?.[week]) return 'diverifikasi';
                  if (penolakanData[nim]?.[week]) return 'ditolak';
                  return 'menunggu';
                };
                return (
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
                    <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                      {dosenSummary.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-slate-400 italic">Inbox dosen kosong.</p>
                      ) : (
                        dosenSummary.map(({ dosen, total }) => {
                          const dosenLaporan = allLaporan.filter(l => {
                            const list = l.dosen_hadir?.list || (Array.isArray(l.dosen_hadir) ? l.dosen_hadir : []);
                            return list.some(d => d.name === dosen);
                          });
                          const nVerif = dosenLaporan.filter(l => {
                            const s = getInboxStatus(l.nim, l.week);
                            return s === 'diverifikasi' || s === 'masuk_database';
                          }).length;
                          const nDitolak = dosenLaporan.filter(l => getInboxStatus(l.nim, l.week) === 'ditolak').length;
                          const nMenunggu = dosenLaporan.filter(l => getInboxStatus(l.nim, l.week) === 'menunggu').length;
                          const nDibaca = nVerif + nDitolak;
                          const count = dosenLaporan.length || total;
                          return (
                            <div key={dosen} className="px-4 py-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-slate-700 font-medium truncate flex-1">{dosen}</p>
                                <span className="text-[10px] text-slate-400 shrink-0">{count} laporan</span>
                              </div>
                              {dosenLaporan.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {nMenunggu > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                      {nMenunggu} menunggu
                                    </span>
                                  )}
                                  {nDibaca > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold">
                                      {nDibaca} sudah dibaca
                                    </span>
                                  )}
                                  {nVerif > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                                      {nVerif} diverifikasi
                                    </span>
                                  )}
                                  {nDitolak > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                                      {nDitolak} menolak
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

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

    {/* ── Add Student Modal ── */}
    {addStudentOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAddStudentOpen(false)} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Tambah Mahasiswa</h3>
            <button onClick={() => setAddStudentOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'nim',     label: 'NIM *',      placeholder: 'cth. 120450001' },
              { key: 'nama',    label: 'Nama *',     placeholder: 'Nama lengkap' },
              { key: 'angkatan',label: 'Angkatan *', placeholder: 'cth. 2022' },
              { key: 'phone',   label: 'No. WA',     placeholder: '628xxx' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">{label}</label>
                <input
                  type="text"
                  value={addStudentForm[key]}
                  onChange={e => setAddStudentForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-brand-400 text-slate-700 placeholder-slate-300"
                />
              </div>
            ))}
            {[
              { key: 'pembimbing1', label: 'Pembimbing 1 (P1)' },
              { key: 'pembimbing2', label: 'Pembimbing 2 (P2)' },
              { key: 'penguji1',    label: 'Penguji 1 (Pj1)' },
              { key: 'penguji2',    label: 'Penguji 2 (Pj2)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">{label}</label>
                <select
                  value={addStudentForm[key]}
                  onChange={e => setAddStudentForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-brand-400 text-slate-700 bg-white"
                >
                  <option value="">— pilih dosen —</option>
                  {allDosenOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Status TA</label>
              <select
                value={addStudentForm.status_ta}
                onChange={e => setAddStudentForm(f => ({ ...f, status_ta: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-brand-400 text-slate-700 bg-white"
              >
                <option value="">— pilih status —</option>
                {STATUS_TA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          {addStudentError && (
            <p className="mt-2 text-[10px] text-rose-600 font-medium">{addStudentError}</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setAddStudentOpen(false)} className="text-xs px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
            <button onClick={handleAddStudent} className="text-xs px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors">Simpan</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
