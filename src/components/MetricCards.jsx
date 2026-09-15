import React from 'react';
import { Users, CheckCircle2, AlertCircle, Compass } from 'lucide-react';

export default function MetricCards({ metrics, selectedWeek }) {
  const { total, reported, notReported, percentage, categoryCounts } = metrics;

  // Find most frequent category (excluding Belum Lapor)
  let topCategory = '-';
  let topCategoryCount = 0;
  Object.entries(categoryCounts || {}).forEach(([cat, count]) => {
    if (cat !== 'Belum Lapor' && count > topCategoryCount) {
      topCategory = cat;
      topCategoryCount = count;
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Mahasiswa */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Mahasiswa Prodi
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {total} <span className="text-sm font-normal text-slate-500">Mahasiswa</span>
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
          <span className="font-semibold text-slate-700">Angkatan 2020 - 2022</span> aktif TA
        </p>
      </div>

      {/* Sudah Lapor */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Sudah Melapor
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {reported}{' '}
              <span className="text-sm font-normal text-emerald-600 font-semibold">
                ({percentage}%)
              </span>
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex justify-between">
            <span>On Track</span>
            <span className="font-medium text-emerald-700">{reported} dari {total}</span>
          </p>
        </div>
      </div>

      {/* Belum Lapor */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
              Belum Melapor
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {notReported}{' '}
              <span className="text-sm font-normal text-rose-600 font-semibold">
                ({total > 0 ? 100 - percentage : 0}%)
              </span>
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-rose-600 mt-3 flex items-center gap-1 font-medium">
          {notReported > 0 ? '⚠️ Butuh pengingat WhatsApp' : '🎉 Semua mahasiswa telah melapor!'}
        </p>
      </div>

      {/* Tahapan Terbanyak */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
              Fokus Utama Pekan Ini
            </p>
            <h3 className="text-lg font-bold text-slate-900 mt-1 truncate max-w-[180px]" title={topCategory}>
              {topCategory}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Compass className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
          <span className="font-semibold text-slate-700">{topCategoryCount} Mahasiswa</span> pada tahapan ini
        </p>
      </div>
    </div>
  );
}
