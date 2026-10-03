import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import WeekSelector from './components/WeekSelector';
import AnalyticsCharts from './components/AnalyticsCharts';
import FilterBar from './components/FilterBar';
import StudentCard from './components/StudentCard';
import StudentTable from './components/StudentTable';
import MatrixView from './components/MatrixView';
import StudentDetailModal from './components/StudentDetailModal';
import WhatsAppModal from './components/WhatsAppModal';
import WhatsAppConnectModal from './components/WhatsAppConnectModal';
import AuthModal, { validateResetToken } from './components/AuthModal';
import MahasiswaView from './components/MahasiswaView';
import LaporanMasukModal from './components/LaporanMasukModal';
import AdminPanelModal from './components/AdminPanelModal';
import { getDosenLaporan } from './components/LaporanModal';
import { registerPush } from './services/pushService';
import {
  loadMonitoringData,
  getWeeklyMetrics,
  getAllWeeksTrend,
  mergeSupabaseReports
} from './services/dataService';
import { getCustomPeriods, getLockedPeriods, BUILTIN_SEMESTERS, getLocalSemesters, getStudentOverrides, upsertStudentOverride, getVerifikasi } from './utils/exportUtils';
import {
  checkGatewayStatus,
  logoutGateway
} from './services/whatsappService';
import { RefreshCw, FilterX } from 'lucide-react';
import { supabase } from './lib/supabase';

// Parse end-date from period label "DD - DD Month YY" for chronological sorting
const PERIOD_MONTHS = {
  Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
  Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11,
};
function parsePeriodEnd(label) {
  const m = label.match(/\d+\s*-\s*(\d+)\s+(\w+)\s+(\d+)/);
  if (!m) return new Date(0);
  return new Date(2000 + parseInt(m[3]), PERIOD_MONTHS[m[2]] ?? 0, parseInt(m[1]));
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table' | 'matrix'
  const [selectedSemester, setSelectedSemester] = useState('Semester Ganjil 2026/2027');
  const [localSemesters, setLocalSemesters] = useState(() => getLocalSemesters());
  const [lockedPeriods, setLockedPeriods] = useState([]);
  const [customPeriodsData, setCustomPeriodsData] = useState([]); // {label, semester}[]

  // Semesters from localSemesters + any semester referenced by custom periods (cross-browser safety)
  const availableSemesters = useMemo(() => {
    const customSems = customPeriodsData.map(p => p.semester).filter(
      s => !BUILTIN_SEMESTERS.includes(s) && !localSemesters.includes(s)
    );
    return [...BUILTIN_SEMESTERS, ...localSemesters, ...new Set(customSems)];
  }, [localSemesters, customPeriodsData]);

  // Periods filtered for the currently selected semester
  const activePeriods = useMemo(() => {
    if (!data) return [];
    const isBuiltin = selectedSemester === BUILTIN_SEMESTERS[0];
    const sheets = isBuiltin ? (data.sheetsWeekColumns || []) : [];
    const custom = customPeriodsData
      .filter(p => p.semester === selectedSemester)
      .map(p => p.label);
    const merged = [...sheets, ...custom.filter(w => !sheets.includes(w))];
    merged.sort((a, b) => parsePeriodEnd(a) - parsePeriodEnd(b));
    return merged;
  }, [data, selectedSemester, customPeriodsData]);

  // Reset selectedWeek when activePeriods changes and current selectedWeek is not in it
  const selectedWeekRef = useRef(selectedWeek);
  selectedWeekRef.current = selectedWeek;
  useEffect(() => {
    if (activePeriods.length > 0 && !activePeriods.includes(selectedWeekRef.current)) {
      const lastWithData = [...activePeriods].reverse().find(w =>
        data?.students.some(s => s.weeklyUpdates[w]?.reported)
      ) || activePeriods[activePeriods.length - 1];
      setSelectedWeek(lastWithData);
    }
  }, [activePeriods]);

  // WhatsApp Gateway State
  const [gatewayStatus, setGatewayStatus] = useState({
    status: 'initializing',
    isConnected: false,
    connectedPhone: null,
    qr: null
  });
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);

  // Auth state
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const s = sessionStorage.getItem('auth_session');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const isAdmin = loggedInUser?.role === 'admin';
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const [resetEmail, setResetEmail] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [angkatanFilter, setAngkatanFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lecturerFilter, setLecturerFilter] = useState('all');

  // Verification data for filter
  const [verifData, setVerifData] = useState({});
  useEffect(() => { getVerifikasi().then(setVerifData); }, []);

  // Laporan masuk for dosen
  const [isLaporanMasukOpen, setIsLaporanMasukOpen] = useState(false);
  const [laporanMasukCount, setLaporanMasukCount] = useState(0);

  const refreshLaporanCount = useCallback(async () => {
    if (loggedInUser?.role === 'dosen' && loggedInUser?.lecturerName) {
      try {
        const [list, verif] = await Promise.all([
          getDosenLaporan(loggedInUser.lecturerName),
          getVerifikasi(),
        ]);
        setLaporanMasukCount(
          list.filter(r => !r.read && !verif[r.nim]?.[r.week]?.verified).length
        );
      } catch {}
    } else {
      setLaporanMasukCount(0);
    }
  }, [loggedInUser]);

  // Supabase Realtime: refresh laporan count instantly on new/updated submissions
  useEffect(() => {
    if (!supabase || loggedInUser?.role !== 'dosen') {
      refreshLaporanCount();
      return;
    }
    refreshLaporanCount();
    const channel = supabase
      .channel('laporan-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_bimbingan' }, () => {
        refreshLaporanCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshLaporanCount]);

  // Register Web Push for dosen after login
  useEffect(() => {
    if (loggedInUser?.role === 'dosen' && loggedInUser?.lecturerName) {
      registerPush(loggedInUser.lecturerName).catch(() => {});
    }
  }, [loggedInUser?.role, loggedInUser?.lecturerName]);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Online visitors count via Supabase Realtime Presence
  const [onlineCount, setOnlineCount] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const presenceChannelRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('online-visitors', {
      config: { presence: { key: crypto.randomUUID() } },
    });
    presenceChannelRef.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setOnlineCount(users.length);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            at: Date.now(),
            name: loggedInUser?.name || 'Pengunjung',
            role: loggedInUser?.role || 'guest',
            nim: loggedInUser?.nim || '',
          });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Re-track when user logs in/out so name/role updates
  useEffect(() => {
    const ch = presenceChannelRef.current;
    if (!ch) return;
    ch.track({
      at: Date.now(),
      name: loggedInUser?.name || 'Pengunjung',
      role: loggedInUser?.role || 'guest',
      nim: loggedInUser?.nim || '',
    }).catch(() => {});
  }, [loggedInUser]);

  // Modals
  const [detailStudent, setDetailStudent] = useState(null);
  const [whatsAppModal, setWhatsAppModal] = useState({
    isOpen: false,
    mode: 'single',
    student: null
  });

  // One-time cleanup: remove auto-seeded mahasiswa accounts from localStorage
  useEffect(() => {
    if (localStorage.getItem('seeded_cleanup_v1')) return;
    try {
      const users = JSON.parse(localStorage.getItem('app_users') || '[]');
      localStorage.setItem('app_users', JSON.stringify(users.filter(u => !u.isSeeded)));
    } catch {}
    localStorage.setItem('seeded_cleanup_v1', '1');
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Detect reset_token in URL (from password reset WA link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      const rse = params.get('rse');
      let decodedEmail = null;
      if (rse) { try { decodedEmail = atob(rse); } catch {} }
      setResetToken(token);
      setResetEmail(decodedEmail);
      setIsLoginModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Restore lecturer filter when dosen session is active on load
  useEffect(() => {
    if (loggedInUser?.role === 'dosen' && loggedInUser?.lecturerName) {
      setLecturerFilter(loggedInUser.lecturerName);
    }
  }, []);

  // Poll Gateway Status
  useEffect(() => {
    let timer = null;
    const fetchGateway = async () => {
      const status = await checkGatewayStatus();
      setGatewayStatus(status);
    };

    fetchGateway();
    timer = setInterval(fetchGateway, 3500);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const applyStudentOverrides = async (students) => {
    const overrides = await getStudentOverrides();
    if (!Object.keys(overrides).length) return students;
    return students.map(s => {
      const ov = overrides[s.nim];
      if (!ov) return s;
      return {
        ...s,
        pembimbing1: ov.pembimbing1 ?? s.pembimbing1,
        pembimbing2: ov.pembimbing2 ?? s.pembimbing2,
        penguji1:    ov.penguji1    ?? s.penguji1,
        penguji2:    ov.penguji2    ?? s.penguji2,
        phone:       ov.phone       ?? s.phone,
        statusTA:    ov.status_ta   ?? s.statusTA,
        target:      ov.target      ?? s.target,
      };
    });
  };

  // Realtime sync: re-apply student_overrides whenever admin changes them
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('student-overrides-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_overrides' }, async () => {
        setData(prev => {
          if (!prev?.students) return prev;
          // Re-apply overrides asynchronously then update state
          applyStudentOverrides(prev.students).then(updated => {
            setData(p => p ? { ...p, students: updated } : p);
          });
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    try {
      const result = await loadMonitoringData();
      result.students = await mergeSupabaseReports(result.students);
      result.students = await applyStudentOverrides(result.students);

      // Save raw Sheets periods before merging custom
      result.sheetsWeekColumns = [...result.weekColumns];

      const customPeriods = await getCustomPeriods(); // {label, semester}[]
      setCustomPeriodsData(customPeriods);
      const customLabels = customPeriods.map(p => p.label);
      if (customLabels.length > 0) {
        const merged = [...result.weekColumns, ...customLabels.filter(p => !result.weekColumns.includes(p))];
        merged.sort((a, b) => parsePeriodEnd(a) - parsePeriodEnd(b));
        result.weekColumns = merged;
      }

      const locked = await getLockedPeriods();
      setLockedPeriods(locked);
      setData(result);

      if (!selectedWeek && result.weekColumns.length > 0) {
        const lastWithData = [...result.weekColumns].reverse().find(w =>
          result.students.some(s => s.weeklyUpdates[w]?.reported)
        ) || result.weekColumns[result.weekColumns.length - 1];
        setSelectedWeek(lastWithData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutGateway = async () => {
    await logoutGateway();
    const status = await checkGatewayStatus();
    setGatewayStatus(status);
  };

  // Determine next week label (within the selected semester's active periods)
  const nextWeek = useMemo(() => {
    if (!selectedWeek || activePeriods.length === 0) return '';
    const idx = activePeriods.indexOf(selectedWeek);
    if (idx !== -1 && idx < activePeriods.length - 1) {
      return activePeriods[idx + 1];
    }
    return '';
  }, [activePeriods, selectedWeek]);

  // Metrics for active week
  // All-student metrics (admin view)
  const metrics = useMemo(() => {
    if (!data || !selectedWeek) {
      return { total: 0, reported: 0, notReported: 0, percentage: 0, categoryCounts: {}, categoryChartData: [], lecturerChartData: [] };
    }
    return getWeeklyMetrics(data.students, selectedWeek);
  }, [data, selectedWeek]);

  // Dosen's own students (P1 or P2) — handles pipe-separated lecturerName for shared accounts
  const dosenStudents = useMemo(() => {
    if (!data || loggedInUser?.role !== 'dosen' || !loggedInUser?.lecturerName) return [];
    const names = new Set(loggedInUser.lecturerName.split('|').map(n => n.trim()).filter(Boolean));
    return data.students.filter(s => names.has(s.pembimbing1) || names.has(s.pembimbing2));
  }, [data, loggedInUser]);

  // Dosen-scoped metrics
  const dosenMetrics = useMemo(() => {
    if (!selectedWeek || dosenStudents.length === 0) {
      return { total: 0, reported: 0, notReported: 0, percentage: 0, categoryCounts: {}, categoryChartData: [], lecturerChartData: [] };
    }
    return getWeeklyMetrics(dosenStudents, selectedWeek);
  }, [dosenStudents, selectedWeek]);

  const isDosen = loggedInUser?.role === 'dosen';
  const activeMetrics = isDosen ? dosenMetrics : metrics;

  // Multi-week trend (scoped to dosen's students when dosen is logged in)
  const trendData = useMemo(() => {
    if (!data || activePeriods.length === 0) return [];
    const students = isDosen && dosenStudents.length > 0 ? dosenStudents : data.students;
    return getAllWeeksTrend(students, activePeriods);
  }, [data, isDosen, dosenStudents, activePeriods]);

  // Distinct angkatan
  const availableAngkatan = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.students.map(s => s.angkatan));
    return Array.from(set).sort();
  }, [data]);

  // Distinct lecturers (Pembimbing 1 and 2)
  const availableLecturers = useMemo(() => {
    if (!data) return [];
    const set = new Set();
    data.students.forEach(s => {
      if (s.pembimbing1) set.add(s.pembimbing1);
      if (s.pembimbing2) set.add(s.pembimbing2);
    });
    return Array.from(set).sort();
  }, [data]);

  // Distinct categories in current week
  const availableCategories = useMemo(() => {
    if (!data || !selectedWeek) return [];
    const set = new Set();
    data.students.forEach(s => {
      const cat = s.weeklyUpdates[selectedWeek]?.category;
      if (cat && cat !== 'Belum Lapor') set.add(cat);
    });
    return Array.from(set).sort();
  }, [data, selectedWeek]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!data) return [];

    return data.students.filter(student => {
      const update = student.weeklyUpdates[selectedWeek] || {
        reported: false,
        category: 'Belum Lapor'
      };

      // Search (Name or NIM)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = student.nama.toLowerCase().includes(q);
        const matchNim = student.nim.toLowerCase().includes(q);
        if (!matchName && !matchNim) return false;
      }

      // Status
      const isVerified = verifData[student.nim]?.[selectedWeek]?.verified || update.sessionVerified;
      if (statusFilter === 'verified' && !isVerified) return false;
      if (statusFilter === 'reported' && (!update.reported || isVerified)) return false;
      if (statusFilter === 'unreported' && update.reported) return false;

      // Angkatan
      if (angkatanFilter !== 'all' && student.angkatan !== angkatanFilter) {
        return false;
      }

      // Category
      if (categoryFilter !== 'all' && update.category !== categoryFilter) {
        return false;
      }

      // Lecturer (Pembimbing 1 or 2) — handles pipe-separated filter for shared dosen accounts
      if (lecturerFilter !== 'all') {
        const filterNames = new Set(lecturerFilter.split('|').map(n => n.trim()).filter(Boolean));
        if (!filterNames.has(student.pembimbing1) && !filterNames.has(student.pembimbing2)) return false;
      }

      return true;
    });
  }, [data, selectedWeek, searchQuery, statusFilter, angkatanFilter, categoryFilter, lecturerFilter, verifData]);

  // Unreported students for selected week
  const unreportedStudents = useMemo(() => {
    if (!data || !selectedWeek) return [];
    return filteredStudents.filter(s => !s.weeklyUpdates[selectedWeek]?.reported);
  }, [filteredStudents, selectedWeek]);

  // Export filtered students as CSV
  const handleExportCSV = () => {
    if (!data || !selectedWeek) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'No,NIM,Nama,Angkatan,Pembimbing 1,Pembimbing 2,Penguji 1,Status TA,Nomor WA,Status Lapor,Tahapan,Catatan Progres,Target Periode Depan\n';

    filteredStudents.forEach((st, idx) => {
      const update = st.weeklyUpdates[selectedWeek] || {
        reported: false,
        category: 'Belum Lapor',
        progress: '-',
        next: '-'
      };

      const row = [
        idx + 1,
        `"${st.nim}"`,
        `"${st.nama.replace(/"/g, '""')}"`,
        `"${st.angkatan}"`,
        `"${(st.pembimbing1 || '-').replace(/"/g, '""')}"`,
        `"${(st.pembimbing2 || '-').replace(/"/g, '""')}"`,
        `"${(st.penguji1 || '-').replace(/"/g, '""')}"`,
        `"${(st.statusTA || '-').replace(/"/g, '""')}"`,
        `"${st.phone || '-'}"`,
        update.reported ? 'Sudah Lapor' : 'Belum Lapor',
        `"${update.category.replace(/"/g, '""')}"`,
        `"${(update.progress || '-').replace(/"/g, '""')}"`,
        `"${(update.next || '-').replace(/"/g, '""')}"`
      ].join(',');

      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Monitoring_TA_Prodi_${selectedWeek.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenSingleWhatsApp = (student) => {
    setWhatsAppModal({
      isOpen: true,
      mode: 'single',
      student
    });
  };

  const handleOpenBulkWhatsApp = () => {
    setWhatsAppModal({
      isOpen: true,
      mode: 'bulk',
      student: null
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center animate-bounce shadow-lg shadow-brand-500/30">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mt-4">
          Memuat Data Monitoring TA Prodi Sains Data...
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Menyinkronkan 3 tab angkatan dari Google Spreadsheet
        </p>
      </div>
    );
  }

  // Mahasiswa view: find their student record by NIM (fallback: name match)
  if (loggedInUser?.role === 'mahasiswa') {
    const nim = loggedInUser.nim;
    const name = loggedInUser.name?.toLowerCase();
    const student = data?.students.find(s =>
      (nim && s.nim === nim) ||
      (name && s.nama?.toLowerCase() === name)
    ) || null;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
        <Header
          lastUpdated={data?.lastUpdated}
          totalStudents={data?.students.length || 0}
          onExportCSV={() => {}}
          gatewayStatus={gatewayStatus}
          onOpenGatewayModal={() => {}}
          isAdmin={false}
          loggedInUser={loggedInUser}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onLogout={() => {
            try { sessionStorage.removeItem('auth_session'); } catch {}
            setLoggedInUser(null);
          }}
          onlineCount={onlineCount}
          onlineUsers={onlineUsers}
        />
        <main className="flex-1">
          <MahasiswaView
            student={student}
            weekColumns={data?.weekColumns || []}
            loggedInUser={loggedInUser}
            lockedPeriods={lockedPeriods}
          />
        </main>
        <AuthModal
          isOpen={isLoginModalOpen}
          onClose={() => { setIsLoginModalOpen(false); setResetToken(null); setResetEmail(null); }}
          onSuccess={(user) => { setLoggedInUser(user); try { sessionStorage.setItem('auth_session', JSON.stringify(user)); } catch {} }}
          resetToken={resetToken}
          resetEmail={resetEmail}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      {/* Header Bar */}
      <Header
        lastUpdated={data?.lastUpdated}
        totalStudents={data?.students.length || 0}
        onExportCSV={handleExportCSV}
        gatewayStatus={gatewayStatus}
        onOpenGatewayModal={() => setIsGatewayModalOpen(true)}
        isAdmin={isAdmin}
        loggedInUser={loggedInUser}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onLogout={() => {
          try { sessionStorage.removeItem('auth_session'); } catch {}
          setLoggedInUser(null);
          setLecturerFilter('all');
        }}
        laporanMasukCount={laporanMasukCount}
        onOpenLaporanMasuk={() => setIsLaporanMasukOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onlineCount={onlineCount}
        onlineUsers={onlineUsers}
        bottomRow={
          <WeekSelector
            weekColumns={activePeriods}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            students={data?.students || []}
            selectedSemester={selectedSemester}
            onSelectSemester={setSelectedSemester}
            availableSemesters={availableSemesters}
            verifData={verifData}
          />
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full space-y-6">

        {/* Dosen Banner */}
        {isDosen && (
          <>
            <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-0.5">Dashboard Bimbingan</p>
                <h2 className="text-base font-bold text-white leading-tight">{loggedInUser.lecturerName}</h2>
                <p className="text-xs text-white/70 mt-0.5">
                  {dosenStudents.length} mahasiswa bimbingan
                  {selectedWeek && ` · Periode ${selectedWeek}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <div className="text-2xl font-black text-white">{dosenMetrics.reported}</div>
                  <div className="text-[10px] text-white/70 font-medium">Melapor</div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-black text-white">{dosenMetrics.notReported}</div>
                  <div className="text-[10px] text-white/70 font-medium">Belum</div>
                </div>
              </div>
            </div>

          </>
        )}

        {/* KPI Cards */}
        <MetricCards metrics={activeMetrics} selectedWeek={selectedWeek} isDosen={isDosen} isAdmin={isAdmin} students={isDosen ? dosenStudents : (data?.students || [])} dosenName={loggedInUser?.lecturerName || ''} verifData={verifData} />

        {/* Analytics Charts */}
        <AnalyticsCharts
          metrics={activeMetrics}
          trendData={trendData}
          selectedWeek={selectedWeek}
          isDosen={isDosen}
          dosenStudents={dosenStudents}
          dosenName={loggedInUser?.lecturerName || ''}
        />

        {/* Content Area Based on View Mode */}
        {viewMode === 'matrix' ? (
          <MatrixView
            students={filteredStudents}
            weekColumns={activePeriods}
            onOpenDetail={setDetailStudent}
          />
        ) : (
          <div className="space-y-4">
            {/* Filter Bar */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              angkatanFilter={angkatanFilter}
              onAngkatanFilterChange={setAngkatanFilter}
              availableAngkatan={availableAngkatan}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              availableCategories={availableCategories}
              lecturerFilter={lecturerFilter}
              onLecturerFilterChange={setLecturerFilter}
              availableLecturers={availableLecturers}
              unreportedCount={unreportedStudents.length}
              onOpenBulkReminder={handleOpenBulkWhatsApp}
              isAdmin={isAdmin}
              isDosen={isDosen}
            />

            {/* Results Count & Active Filter Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <div>
                Menampilkan{' '}
                <span className="font-bold text-slate-900">
                  {filteredStudents.length}
                </span>{' '}
                dari {data?.students.length} mahasiswa pada periode{' '}
                <span className="font-semibold text-brand-700">
                  {selectedWeek}
                </span>
                {nextWeek && (
                  <span className="text-slate-400"> (Periode berikutnya: {nextWeek})</span>
                )}
                {lecturerFilter !== 'all' && (
                  <span className="ml-1 text-indigo-600 font-medium">• Dosen: {lecturerFilter.includes('|') ? lecturerFilter.split('|').map(n => n.split(',')[0].trim()).join(', ') : lecturerFilter.split(',')[0]}</span>
                )}
              </div>

              {(searchQuery || statusFilter !== 'all' || angkatanFilter !== 'all' || categoryFilter !== 'all' || lecturerFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setAngkatanFilter('all');
                    setCategoryFilter('all');
                    setLecturerFilter('all');
                  }}
                  className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* Students Grid or Table */}
            {filteredStudents.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FilterX className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Tidak Ada Mahasiswa Ditemukan
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tidak ada data mahasiswa yang cocok dengan kriteria pencarian atau filter yang Anda terapkan.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setAngkatanFilter('all');
                    setCategoryFilter('all');
                    setLecturerFilter('all');
                  }}
                  className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map(student => (
                  <StudentCard
                    key={student.nim}
                    student={student}
                    selectedWeek={selectedWeek}
                    nextWeek={nextWeek}
                    onOpenDetail={setDetailStudent}
                    onOpenWhatsApp={handleOpenSingleWhatsApp}
                    gatewayStatus={gatewayStatus}
                    onOpenGatewayModal={() => setIsGatewayModalOpen(true)}
                    isAdmin={isAdmin}
                    isDosen={isDosen}
                    dosenName={loggedInUser?.lecturerName || ''}
                    highlightLecturer={lecturerFilter !== 'all' ? lecturerFilter : ''}
                    onUpdateTarget={async (nim, newTarget) => {
                      await upsertStudentOverride(nim, { target: newTarget });
                      setData(prev => {
                        if (!prev?.students) return prev;
                        return {
                          ...prev,
                          students: prev.students.map(s =>
                            s.nim === nim ? { ...s, target: newTarget } : s
                          ),
                        };
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <StudentTable
                students={filteredStudents}
                selectedWeek={selectedWeek}
                nextWeek={nextWeek}
                onOpenDetail={setDetailStudent}
                onOpenWhatsApp={handleOpenSingleWhatsApp}
                gatewayStatus={gatewayStatus}
                onOpenGatewayModal={() => setIsGatewayModalOpen(true)}
                isAdmin={isAdmin}
              />
            )}
          </div>
        )}
      </main>

      {/* Detail Timeline Modal */}
      {detailStudent && (
        <StudentDetailModal
          student={detailStudent}
          weekColumns={data?.weekColumns || []}
          onClose={() => setDetailStudent(null)}
          onOpenWhatsApp={handleOpenSingleWhatsApp}
          isAdmin={isAdmin}
        />
      )}

      {/* WhatsApp Reminder Modal */}
      <WhatsAppModal
        isOpen={whatsAppModal.isOpen}
        onClose={() =>
          setWhatsAppModal({ isOpen: false, mode: 'single', student: null })
        }
        mode={whatsAppModal.mode}
        student={whatsAppModal.student}
        selectedWeek={selectedWeek}
        nextWeek={nextWeek}
        unreportedStudents={unreportedStudents}
        gatewayStatus={gatewayStatus}
        onOpenGatewayModal={() => setIsGatewayModalOpen(true)}
      />

      {/* WhatsApp Connect QR Modal */}
      <WhatsAppConnectModal
        isOpen={isGatewayModalOpen}
        onClose={() => setIsGatewayModalOpen(false)}
        gatewayStatus={gatewayStatus}
        onLogout={handleLogoutGateway}
        onRefresh={checkGatewayStatus}
      />

      {/* Auth Modal (Login + Register) */}
      <AuthModal
        isOpen={isLoginModalOpen}
        onClose={() => { setIsLoginModalOpen(false); setResetToken(null); setResetEmail(null); }}
        onSuccess={(user) => {
          setLoggedInUser(user);
          if (user.role === 'dosen' && user.lecturerName) {
            setLecturerFilter(user.lecturerName);
          }
        }}
        resetToken={resetToken}
        resetEmail={resetEmail}
      />

      {/* Laporan Masuk Modal (dosen) */}
      <LaporanMasukModal
        isOpen={isLaporanMasukOpen}
        onClose={async () => {
          setIsLaporanMasukOpen(false);
          refreshLaporanCount();
          if (data?.students) {
            const updated = await mergeSupabaseReports(data.students);
            setData(prev => ({ ...prev, students: updated }));
          }
        }}
        dosenName={loggedInUser?.lecturerName || ''}
      />

      {/* Admin Panel Modal */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={async () => {
          setIsAdminPanelOpen(false);
          if (data?.students) {
            const updated = await applyStudentOverrides(data.students);
            setData(prev => ({ ...prev, students: updated }));
          }
        }}
        sheetsData={data}
        onSemestersChange={setLocalSemesters}
        onLockedPeriodsChange={setLockedPeriods}
        onCustomPeriodsChange={setCustomPeriodsData}
        isAdmin={isAdmin}
      />
    </div>
  );
}
