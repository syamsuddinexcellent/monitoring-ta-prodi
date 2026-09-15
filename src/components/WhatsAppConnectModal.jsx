import React from 'react';
import {
  X,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Smartphone,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { formatPhoneDisplay } from '../utils/helpers';

export default function WhatsAppConnectModal({
  isOpen,
  onClose,
  gatewayStatus,
  onLogout,
  onRefresh
}) {
  if (!isOpen) return null;

  const { isConnected, connectedPhone, qr } = gatewayStatus;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                WhatsApp Auto-Send Gateway Prodi
              </h3>
              <p className="text-xs text-slate-500">
                Pengiriman pesan otomatis di latar belakang tanpa buka tab WA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5">
          {isConnected ? (
            /* Connected State */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  WhatsApp Gateway Aktif & Terhubung!
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Nomor Pengirim Terdaftar:
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-sm font-bold mt-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>{formatPhoneDisplay(connectedPhone || '6285768292580')}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 text-left space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Fitur Auto-Send Siap Digunakan:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li>Tombol <strong>"⚡ Kirim Auto"</strong> di setiap mahasiswa mengirim pesan seketika di latar belakang.</li>
                  <li>Tombol <strong>"Kirim Auto ke Grup"</strong> mengirim siaran rekapitulasi langsung ke grup WhatsApp bimbingan TA.</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Putuskan Sesi / Ganti Nomor</span>
                </button>
              </div>
            </div>
          ) : qr ? (
            /* QR Code Scan State */
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-900">
                  Pindai QR Code untuk Menghubungkan Nomor Anda
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan nomor WhatsApp <span className="font-semibold text-slate-800">6285768292580</span>
                </p>
              </div>

              {/* QR Image Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-100">
                  <img
                    src={qr}
                    alt="WhatsApp QR Code"
                    className="w-52 h-52 object-contain"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                  <RefreshCw className="w-3 h-3 animate-spin text-brand-600" />
                  <span>Menunggu pemindaian dari WhatsApp HP Anda...</span>
                </div>
              </div>

              {/* Step by step */}
              <div className="p-3.5 bg-brand-50/60 rounded-xl border border-brand-100 text-xs text-slate-700 space-y-1.5">
                <p className="font-semibold text-brand-900 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-brand-600" />
                  <span>Langkah Menghubungkan:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>Buka aplikasi WhatsApp di HP Anda.</li>
                  <li>Buka <strong>Menu titik tiga</strong> (Android) atau <strong>Pengaturan</strong> (iOS).</li>
                  <li>Pilih <strong>Perangkat Tertaut (Linked Devices)</strong>.</li>
                  <li>Ketuk <strong>Tautkan Perangkat (Link a Device)</strong> lalu arahkan kamera ke QR di atas.</li>
                </ol>
              </div>
            </div>
          ) : (
            /* Loading / Initializing State */
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Menghubungkan ke Server WhatsApp Gateway...
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Sedang menginisialisasi modul koneksi WhatsApp. Pastikan server lokal aktif (`npm run server`).
              </p>
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors mt-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan Status</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Koneksi lokal port 3002 terenkripsi end-to-end
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
