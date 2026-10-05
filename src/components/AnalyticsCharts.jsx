import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Bell,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';
import { getCategoryBadgeStyle } from '../utils/helpers';

export default function AnalyticsCharts({ metrics, trendData, selectedWeek, isDosen = false, dosenStudents = [], dosenName = '', verifData = {} }) {
  const { total, reported, notReported, categoryChartData, lecturerChartData } = metrics;
  const [activeTab, setActiveTab] = useState('stages');

  const pieData = [
    { name: 'Sudah Melapor', value: reported, color: '#10b981' },
    { name: 'Belum Melapor', value: notReported, color: '#f43f5e' }
  ];

  const getCatColor = (catName) => getCategoryBadgeStyle(catName).hex;
  const topLecturers = (lecturerChartData || []).slice(0, 7);

  // Dosen-specific derived data
  const sudahLapor = dosenStudents.filter(s => s.weeklyUpdates?.[selectedWeek]?.reported);
  const belumLapor = dosenStudents.filter(s => !s.weeklyUpdates?.[selectedWeek]?.reported);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* Card 1 — Kepatuhan Pelaporan (same for all roles) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <PieIcon className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Kepatuhan Pelaporan</h4>
          </div>
          <span className="text-xs text-slate-400 font-medium">Periode Ini</span>
        </div>

        <div className="h-52 w-full flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} Mahasiswa (${Math.round((value / (total || 1)) * 100)}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-slate-900">{metrics.percentage}%</span>
            <span className="text-[11px] text-slate-400 font-medium">Tingkat Lapor</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs mt-1 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600 font-medium">Sudah ({reported})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-slate-600 font-medium">Belum ({notReported})</span>
          </div>
        </div>
      </div>

      {/* Card 2 */}
      {isDosen ? (
        /* Dosen: Status Laporan Per Mahasiswa */
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Status Laporan Mahasiswa</h4>
            </div>
            <span className="text-xs text-slate-400 font-medium">Periode Ini</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-52">
            {dosenStudents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Tidak ada mahasiswa bimbingan</p>
            ) : (
              dosenStudents.map((s, i) => {
                const lapor = s.weeklyUpdates?.[selectedWeek]?.reported;
                const category = s.weeklyUpdates?.[selectedWeek]?.category || '—';
                const badge = getCategoryBadgeStyle(category);
                const phone = s.phone?.replace(/\D/g, '');
                const waMsg = encodeURIComponent(
                  `Halo ${s.nama}, mohon segera mengisi laporan progres bimbingan TA untuk periode ini. Terima kasih 🙏`
                );
                const waUrl = !lapor && phone && s.pembimbing1 === dosenName ? `https://wa.me/${phone}?text=${waMsg}` : null;
                return (
                  <div key={s.nim || i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${lapor ? 'bg-emerald-50/60 border-emerald-100' : 'bg-rose-50/40 border-rose-100'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${lapor ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      {lapor
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        : <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{s.nama}</p>
                      {lapor && category !== '—' && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                          {category}
                        </span>
                      )}
                    </div>
                    {waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-colors shrink-0"
                        title="Kirim pengingat WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WA</span>
                      </a>
                    ) : (
                      <span className={`text-[10px] font-bold shrink-0 ${lapor ? 'text-emerald-600' : 'text-rose-400'}`}>
                        {lapor ? '✓ Lapor' : !phone ? 'No WA' : '— Belum'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-3 mt-3">
            Rekap status pelaporan bimbingan periode ini
          </p>
        </div>
      ) : (
        /* Non-dosen: Distribusi Tahapan / Sebaran Dosen */
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {activeTab === 'stages' ? 'Distribusi Tahapan TA' : 'Sebaran Dosen Pembimbing'}
              </h4>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-[10px]">
              <button
                onClick={() => setActiveTab('stages')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${activeTab === 'stages' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Tahapan
              </button>
              <button
                onClick={() => setActiveTab('lecturers')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${activeTab === 'lecturers' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Dosen
              </button>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'stages' ? (
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#475569' }} />
                  <Tooltip formatter={(val) => [`${val} Mahasiswa`, 'Jumlah']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {categoryChartData.map((entry, i) => <Cell key={i} fill={getCatColor(entry.name)} />)}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={topLecturers} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={(val) => val.split(',')[0]} />
                  <Tooltip formatter={(val, name, item) => [`${val} Mahasiswa (${item.payload.reported} Sudah Lapor)`, 'Total Bimbingan']} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} fill="#4f46e5" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-3">
            {activeTab === 'stages'
              ? 'Memetakan fokus mahasiswa mulai dari Proposal, Coding, hingga Bab 4'
              : 'Distribusi bimbingan mahasiswa per dosen pembimbing utama di Prodi'}
          </p>
        </div>
      )}

      {/* Card 3 */}
      {isDosen ? (
        /* Dosen: Mahasiswa Perlu Diingatkan */
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <Bell className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Perlu Diingatkan</h4>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${belumLapor.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {belumLapor.length} mahasiswa
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-52">
            {belumLapor.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="text-xs font-medium text-slate-600">Semua mahasiswa sudah melapor!</p>
                <p className="text-[10px] text-slate-400">Tidak ada yang perlu diingatkan periode ini</p>
              </div>
            ) : (
              belumLapor.map((s, i) => {
                const phone = s.phone?.replace(/\D/g, '');
                const role = dosenName
                  ? s.pembimbing1 === dosenName ? 'P1'
                  : s.pembimbing2 === dosenName ? 'P2'
                  : s.penguji1 === dosenName ? 'Pj1'
                  : s.penguji2 === dosenName ? 'Pj2'
                  : null
                  : null;
                const roleLabel = role === 'P1' ? 'Pembimbing 1 (P1)'
                  : role === 'P2' ? 'Pembimbing 2 (P2)'
                  : role === 'Pj1' ? 'Penguji 1 (Pj1)'
                  : role === 'Pj2' ? 'Penguji 2 (Pj2)'
                  : null;
                const waMsg = encodeURIComponent(
                  roleLabel
                    ? `Halo ${s.nama}, mohon segera melakukan bimbingan dengan saya selaku ${roleLabel} terkait progres Tugas Akhir periode ini. Jika sudah melakukan bimbingan selain dengan saya selaku ${roleLabel}, maka hiraukan pesan ini. Terima kasih 🙏`
                    : `Halo ${s.nama}, mohon segera melakukan bimbingan dengan dosen pembimbing Anda terkait progres Tugas Akhir periode ini. Terima kasih 🙏`
                );
                const waUrl = phone && s.pembimbing1 === dosenName ? `https://wa.me/${phone}?text=${waMsg}` : null;
                return (
                  <div key={s.nim || i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-rose-100 bg-rose-50/40">
                    <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{s.nama}</p>
                      <p className="text-[10px] text-slate-400">{s.nim} · {s.angkatan}</p>
                    </div>
                    {waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-colors shrink-0"
                        title="Kirim pengingat WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WA</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 shrink-0">{!phone ? 'No WA' : '—'}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-3 mt-3">
            Mahasiswa bimbingan yang belum mengirim laporan periode ini
          </p>
        </div>
      ) : (
        /* Non-dosen: Tren Pelaporan Mingguan */
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Tren Pelaporan Mingguan</h4>
            </div>
            <span className="text-xs text-slate-400 font-medium">Lintas Periode</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[0, total]} allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val, name) => [`${val} Mahasiswa`, name]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.weekName || label}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                <Line type="monotone" dataKey="notReported" name="Belum Melapor" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="reported"    name="Sudah Melapor" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-3">
            Perbandingan jumlah mahasiswa per status pelaporan di setiap periode
          </p>
        </div>
      )}
    </div>
  );
}
