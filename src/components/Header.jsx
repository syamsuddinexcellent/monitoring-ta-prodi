import React from 'react';
import {
  RefreshCw,
  Database,
  Zap,
  LogOut,
  Lock,
  ShieldCheck,
  User
} from 'lucide-react';
import { formatPhoneDisplay } from '../utils/helpers';
import { GOOGLE_SHEETS_VIEW_URL } from '../services/dataService';

export default function Header({
  lastUpdated,
  isRefreshing,
  onRefresh,
  dataSource,
  totalStudents,
  onExportCSV,
  gatewayStatus,
  onOpenGatewayModal,
  isAdmin,
  loggedInUser,
  onLoginClick,
  onLogout
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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Monitoring TA Prodi Sains Data
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  Semester Ganjil 2026/2027
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Pemantauan berkala progres & tahapan bimbingan Tugas Akhir seluruh angkatan
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {/* Admin-only buttons */}
            {isAdmin && (
              <>
                {/* Auto-Send Gateway Status Button */}
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

                {/* Sync Button */}
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-lg transition-all shadow-sm shadow-emerald-600/25 cursor-pointer"
                  title="Perbarui database otomatis langsung dari Google Sheet terbaru"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Menyinkronkan...' : 'Sinkronkan Google Sheet'}</span>
                </button>
              </>
            )}

            {/* Google Sheets Status indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              {dataSource === 'google_sheets' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-medium text-emerald-700">Live 3 Tab Sheets</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-medium text-amber-700">Data Cadangan</span>
                </>
              )}
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">{formatTime(lastUpdated)}</span>
            </div>

            {/* Auth: Login / User badge / Logout */}
            {loggedInUser ? (
              <div className="flex items-center gap-1.5">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </span>
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
    </header>
  );
}
