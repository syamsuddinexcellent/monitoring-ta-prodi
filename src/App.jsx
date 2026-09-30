import React, { useState, useEffect, useMemo } from 'react';
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
import AuthModal, { validateResetToken, seedDefaultAccounts } from './components/AuthModal';
import MahasiswaView from './components/MahasiswaView';
import LaporanMasukModal from './components/LaporanMasukModal';
import AdminPanelModal from './components/AdminPanelModal';
import { countUnreadLaporan } from './components/LaporanModal';
import {
  loadMonitoringData,
  getWeeklyMetrics,
  getAllWeeksTrend,
  mergeLocalReports
} from './services/dataService';
import { getLocalPeriods } from './utils/exportUtils';
import {
  checkGatewayStatus,
  logoutGateway
} from './services/whatsappService';
import { RefreshCw, FilterX } from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table' | 'matrix'
  const [selectedSemester, setSelectedSemester] = useState('Semester Ganjil 2026/2027');

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

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [angkatanFilter, setAngkatanFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lecturerFilter, setLecturerFilter] = useState('all');

  // Laporan masuk for dosen
  const [isLaporanMasukOpen, setIsLaporanMasukOpen] = useState(false);
  const laporanMasukCount = loggedInUser?.role === 'dosen'
    ? countUnreadLaporan(loggedInUser.lecturerName || '')
    : 0;

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Modals
  const [detailStudent, setDetailStudent] = useState(null);
  const [whatsAppModal, setWhatsAppModal] = useState({
    isOpen: false,
    mode: 'single',
    student: null
  });

  // Initial Data Fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Detect reset_token in URL (from password reset email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token && validateResetToken(token)) {
      setResetToken(token);
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

  const fetchData = async () => {
    try {
      const result = await loadMonitoringData();
      result.students = mergeLocalReports(result.students);
      const lp = getLocalPeriods();
      if (lp.length > 0) {
        result.weekColumns = [...result.weekColumns, ...lp.filter(p => !result.weekColumns.includes(p))];
      }
      seedDefaultAccounts(result.students);
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

  // Determine next week label
  const nextWeek = useMemo(() => {
    if (!data || !selectedWeek) return '';
    const idx = data.weekColumns.indexOf(selectedWeek);
    if (idx !== -1 && idx < data.weekColumns.length - 1) {
      return data.weekColumns[idx + 1];
    }
    return '';
  }, [data, selectedWeek]);

  // Metrics for active week
  // All-student metrics (admin view)
  const metrics = useMemo(() => {
    if (!data || !selectedWeek) {
      return { total: 0, reported: 0, notReported: 0, percentage: 0, categoryCounts: {}, categoryChartData: [], lecturerChartData: [] };
    }
    return getWeeklyMetrics(data.students, selectedWeek);
  }, [data, selectedWeek]);

  // Dosen's own students (P1 or P2)
  const dosenStudents = useMemo(() => {
    if (!data || loggedInUser?.role !== 'dosen' || !loggedInUser?.lecturerName) return [];
    const name = loggedInUser.lecturerName;
    return data.students.filter(s => s.pembimbing1 === name || s.pembimbing2 === name);
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
    if (!data) return [];
    const students = isDosen && dosenStudents.length > 0 ? dosenStudents : data.students;
    return getAllWeeksTrend(students, data.weekColumns);
  }, [data, isDosen, dosenStudents]);

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
      if (statusFilter === 'reported' && !update.reported) return false;
      if (statusFilter === 'unreported' && update.reported) return false;

      // Angkatan
      if (angkatanFilter !== 'all' && student.angkatan !== angkatanFilter) {
        return false;
      }

      // Category
      if (categoryFilter !== 'all' && update.category !== categoryFilter) {
        return false;
      }

      // Lecturer (Pembimbing 1 or 2)
      if (lecturerFilter !== 'all') {
        const matchP1 = student.pembimbing1 === lecturerFilter;
        const matchP2 = student.pembimbing2 === lecturerFilter;
        if (!matchP1 && !matchP2) return false;
      }

      return true;
    });
  }, [data, selectedWeek, searchQuery, statusFilter, angkatanFilter, categoryFilter, lecturerFilter]);

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
        />
        <main className="flex-1">
          <MahasiswaView
            student={student}
            weekColumns={data?.weekColumns || []}
            loggedInUser={loggedInUser}
          />
        </main>
        <AuthModal
          isOpen={isLoginModalOpen}
          onClose={() => { setIsLoginModalOpen(false); setResetToken(null); }}
          onSuccess={(user) => { setLoggedInUser(user); try { sessionStorage.setItem('auth_session', JSON.stringify(user)); } catch {} }}
          resetToken={resetToken}
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
        bottomRow={
          <WeekSelector
            weekColumns={data?.weekColumns || []}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            students={data?.students || []}
            selectedSemester={selectedSemester}
            onSelectSemester={setSelectedSemester}
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
        <MetricCards metrics={activeMetrics} selectedWeek={selectedWeek} isDosen={isDosen} isAdmin={isAdmin} students={isDosen ? dosenStudents : (data?.students || [])} dosenName={loggedInUser?.lecturerName || ''} />

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
            weekColumns={data?.weekColumns || []}
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
                  <span className="ml-1 text-indigo-600 font-medium">• Dosen: {lecturerFilter.split(',')[0]}</span>
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
        onClose={() => { setIsLoginModalOpen(false); setResetToken(null); }}
        onSuccess={(user) => {
          setLoggedInUser(user);
          if (user.role === 'dosen' && user.lecturerName) {
            setLecturerFilter(user.lecturerName);
          }
        }}
        resetToken={resetToken}
      />

      {/* Laporan Masuk Modal (dosen) */}
      <LaporanMasukModal
        isOpen={isLaporanMasukOpen}
        onClose={() => setIsLaporanMasukOpen(false)}
        dosenName={loggedInUser?.lecturerName || ''}
      />

      {/* Admin Panel Modal */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        sheetsData={data}
      />
    </div>
  );
}
