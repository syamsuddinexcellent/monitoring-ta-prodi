import React from 'react';
import {
  Database,
  Zap,
  LogOut,
  Lock,
  ShieldCheck,
  User,
  Inbox,
} from 'lucide-react';
import { formatPhoneDisplay } from '../utils/helpers';

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
}) {
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
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Monitoring Tugas Akhir Program Studi Sains Data
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
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
                title="Masuk ke akun"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Masuk</span>
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
