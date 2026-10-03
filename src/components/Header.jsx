import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Zap,
  LogOut,
  Lock,
  ShieldCheck,
  User,
  Inbox,
  GraduationCap,
  BookOpen,
  UserCog,
} from 'lucide-react';
import { formatPhoneDisplay } from '../utils/helpers';

const ROLE_LABEL = { admin: 'Admin', dosen: 'Dosen', mahasiswa: 'Mahasiswa', guest: 'Pengunjung' };
const ROLE_COLOR = {
  admin:     'bg-brand-100 text-brand-700 border-brand-200',
  dosen:     'bg-indigo-100 text-indigo-700 border-indigo-200',
  mahasiswa: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  guest:     'bg-slate-100 text-slate-500 border-slate-200',
};
const ROLE_ICON = { admin: UserCog, dosen: BookOpen, mahasiswa: GraduationCap, guest: User };

export default function Header({
  lastUpdated,
  totalStudents,
  onExportCSV,
  gatewayStatus,
  onOpenGatewayModal,
  isAdmin,
  loggedInUser,
  onLoginClick,
  onLogout,
  laporanMasukCount = 0,
  onOpenLaporanMasuk,
  onOpenAdminPanel,
  bottomRow,
  onlineCount = 1,
  onlineUsers = [],
}) {
  const [showOnlineList, setShowOnlineList] = useState(false);
  const onlineRef = useRef(null);

  useEffect(() => {
    if (!showOnlineList) return;
    const handleClick = (e) => {
      if (onlineRef.current && !onlineRef.current.contains(e.target)) {
        setShowOnlineList(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showOnlineList]);

  const formatTime = (date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const isGatewayConnected = gatewayStatus?.isConnected;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            {/* Three institution logos */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-14 w-14 rounded-xl overflow-hidden shadow-md ring-1 ring-slate-200 bg-white flex items-center justify-center p-1 shrink-0">
                <img src="/logo-itera.jpg" alt="ITERA" className="w-full h-full object-contain" />
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="h-14 w-14 rounded-xl overflow-hidden shadow-md ring-1 ring-slate-200 shrink-0">
                <img src="/logo-fs.jpg" alt="Fakultas Sains" className="w-full h-full object-cover" />
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="h-14 w-14 rounded-xl overflow-hidden shadow-md ring-1 ring-slate-200 shrink-0">
                <img src="/logo-sainsdata.jpg" alt="Sains Data" className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Divider */}
            <div className="h-12 w-px bg-slate-200 hidden sm:block" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Monitoring Tugas Akhir
                <span className="hidden sm:inline"> Program Studi Sains Data</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Pemantauan berkala tahapan bimbingan Tugas Akhir mahasiswa
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {/* Admin-only: Auto-Send Gateway Status */}
            {isAdmin && (
              <button
                onClick={onOpenGatewayModal}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-xs ${
                  isGatewayConnected
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                }`}
                title="Klik untuk melihat status / scan QR Auto-Send WhatsApp"
              >
                <Zap className={`w-3.5 h-3.5 ${isGatewayConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
                {isGatewayConnected ? (
                  <span>Auto-Send: {formatPhoneDisplay(gatewayStatus.connectedPhone || '6285768292580')}</span>
                ) : (
                  <span>Hubungkan Auto-Send (Scan QR)</span>
                )}
              </button>
            )}

            {/* Data source badge — admin only */}
            {isAdmin && <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Database className="w-3.5 h-3.5 text-brand-600" />
              <span className="font-medium text-brand-700">Data Lokal</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">{formatTime(lastUpdated)}</span>
            </div>}

            {/* Online visitors badge */}
            <div className="hidden sm:block relative" ref={onlineRef}>
              {isAdmin ? (
                <button
                  onClick={() => setShowOnlineList(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs text-emerald-700 transition-colors cursor-pointer"
                  title="Klik untuk melihat siapa saja yang sedang online"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-semibold tabular-nums">{onlineCount}</span>
                  <span className="text-emerald-600">online</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 select-none" title="Jumlah pengguna yang sedang membuka halaman ini">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-semibold tabular-nums">{onlineCount}</span>
                  <span className="text-emerald-600">online</span>
                </div>
              )}
              {isAdmin && showOnlineList && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Sedang Online ({onlineUsers.length})</p>
                  </div>
                  <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {onlineUsers.length === 0 ? (
                      <li className="px-3 py-3 text-xs text-slate-400 text-center">Tidak ada data</li>
                    ) : (
                      onlineUsers.map((u, i) => {
                        const role = u.role || 'guest';
                        const RoleIcon = ROLE_ICON[role] || User;
                        const colorClass = ROLE_COLOR[role] || ROLE_COLOR.guest;
                        return (
                          <li key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                            <RoleIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">{u.name || 'Pengunjung'}</p>
                              {u.nim && <p className="text-[10px] text-slate-400 truncate">{u.nim}</p>}
                            </div>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${colorClass}`}>
                              {ROLE_LABEL[role] || role}
                            </span>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Auth: Login / User badge / Logout */}
            {loggedInUser ? (
              <div className="flex items-center gap-1.5">
                {/* Laporan Masuk button for dosen */}
                {loggedInUser.role === 'dosen' && onOpenLaporanMasuk && (
                  <button
                    onClick={onOpenLaporanMasuk}
                    className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-brand-700 bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-lg transition-colors shadow-xs"
                    title="Laporan Masuk"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Laporan</span>
                    {laporanMasukCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {laporanMasukCount > 9 ? '9+' : laporanMasukCount}
                      </span>
                    )}
                  </button>
                )}
                {isAdmin ? (
                  <button
                    onClick={onOpenAdminPanel}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-50 hover:bg-brand-100 border border-brand-200 text-xs font-semibold text-brand-700 transition-colors"
                    title="Buka Panel Admin"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 max-w-[160px]">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{loggedInUser.name}</span>
                  </span>
                )}
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors shadow-xs"
                  title="Keluar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-brand-700 bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-lg transition-colors shadow-xs"
                title="Masuk / Daftar akun"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Masuk/Daftar</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {bottomRow && (
        <div className="border-t border-slate-100 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto">
            {bottomRow}
          </div>
        </div>
      )}
    </header>
  );
}
