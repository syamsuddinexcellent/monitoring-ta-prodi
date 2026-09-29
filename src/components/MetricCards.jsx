import React, { useState, useRef, useEffect } from 'react';
import { Users, CheckCircle2, AlertCircle, Compass, X, GraduationCap, MessageCircle } from 'lucide-react';

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return { open, setOpen, ref };
}

export default function MetricCards({ metrics, selectedWeek, isDosen = false, isAdmin = false, students = [], dosenName = '' }) {
  const { total, reported, notReported, percentage, categoryCounts } = metrics;

  const totalPopover = usePopover();
  const notReportedPopover = usePopover();

  const reportedPopover = usePopover();
  const focusPopover = usePopover();

  const reportedStudents = selectedWeek
    ? students.filter(s => s.weeklyUpdates?.[selectedWeek]?.reported)
    : [];

  const notReportedStudents = selectedWeek
    ? students.filter(s => !s.weeklyUpdates?.[selectedWeek]?.reported)
    : [];

  // Find most frequent category (excluding Belum Lapor)
  let topCategory = '-';
  let topCategoryCount = 0;
  Object.entries(categoryCounts || {}).forEach(([cat, count]) => {
    if (cat !== 'Belum Lapor' && count > topCategoryCount) {
      topCategory = cat;
      topCategoryCount = count;
    }
  });

  const canClick = students.length > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Mahasiswa */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isDosen ? 'Total Mahasiswa Bimbingan' : 'Total Mahasiswa Prodi'}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {total} <span className="text-sm font-normal text-slate-500">Mahasiswa</span>
            </h3>
          </div>

          <div className="relative" ref={totalPopover.ref}>
            <button
              type="button"
              onClick={() => canClick && totalPopover.setOpen(v => !v)}
              className={`w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 transition-all ${
                canClick ? 'hover:bg-brand-100 hover:border-brand-300 cursor-pointer' : 'cursor-default'
              }`}
              title={canClick ? 'Lihat daftar mahasiswa' : undefined}
            >
              <Users className="w-5 h-5" />
            </button>

            {totalPopover.open && canClick && (
              <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-600 to-indigo-600">
                  <div>
                    <p className="text-xs font-bold text-white">
                      {isDosen ? 'Mahasiswa Bimbingan' : 'Semua Mahasiswa'}
                    </p>
                    <p className="text-[10px] text-white/70">{students.length} mahasiswa</p>
                  </div>
                  <button onClick={() => totalPopover.setOpen(false)}
                    className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {students.map((s, i) => (
                    <div key={s.nim || i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <div className="w-7 h-7 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{s.nama}</p>
                        <p className="text-[10px] text-slate-400">{s.nim} · {s.angkatan}</p>
                      </div>
                      {selectedWeek && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          s.weeklyUpdates?.[selectedWeek]?.reported
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-600'
                        }`}>
                          {s.weeklyUpdates?.[selectedWeek]?.reported ? '✓' : '—'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          <div className="relative" ref={reportedPopover.ref}>
            <button
              type="button"
              onClick={() => canClick && reportedPopover.setOpen(v => !v)}
              className={`w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-all ${
                canClick ? 'hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer' : 'cursor-default'
              }`}
              title={canClick ? 'Lihat mahasiswa sudah melapor' : undefined}
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>

            {reportedPopover.open && canClick && (
              <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600">
                  <div>
                    <p className="text-xs font-bold text-white">Sudah Melapor</p>
                    <p className="text-[10px] text-white/70">{reportedStudents.length} mahasiswa</p>
                  </div>
                  <button onClick={() => reportedPopover.setOpen(false)}
                    className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {reportedStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Belum ada mahasiswa yang melapor</p>
                  ) : (
                    reportedStudents.map((s, i) => (
                      <div key={s.nim || i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50">
                        <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{s.nama}</p>
                          <p className="text-[10px] text-slate-400">{s.nim} · {s.angkatan}</p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                          ✓
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
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

          <div className="relative" ref={notReportedPopover.ref}>
            <button
              type="button"
              onClick={() => canClick && notReportedPopover.setOpen(v => !v)}
              className={`w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 transition-all ${
                canClick ? 'hover:bg-rose-100 hover:border-rose-300 cursor-pointer' : 'cursor-default'
              }`}
              title={canClick ? 'Lihat mahasiswa belum melapor' : undefined}
            >
              <AlertCircle className="w-5 h-5" />
            </button>

            {notReportedPopover.open && canClick && (
              <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-rose-500 to-rose-600">
                  <div>
                    <p className="text-xs font-bold text-white">Belum Melapor</p>
                    <p className="text-[10px] text-white/70">{notReportedStudents.length} mahasiswa</p>
                  </div>
                  <button onClick={() => notReportedPopover.setOpen(false)}
                    className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notReportedStudents.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-xs font-medium text-slate-600">Semua mahasiswa sudah melapor!</p>
                    </div>
                  ) : (
                    notReportedStudents.map((s, i) => {
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
                      const supervisors = [
                        s.pembimbing1 ? `👨‍🏫 *Pembimbing 1:* ${s.pembimbing1}` : '',
                        s.pembimbing2 ? `👨‍🏫 *Pembimbing 2:* ${s.pembimbing2}` : '',
                        s.penguji1    ? `👨‍⚖️ *Penguji 1:* ${s.penguji1}`    : '',
                        s.penguji2    ? `👨‍⚖️ *Penguji 2:* ${s.penguji2}`    : '',
                      ].filter(Boolean).join('\n');
                      const waMsg = encodeURIComponent(
                        roleLabel
                          ? `Halo ${s.nama}, mohon segera melakukan bimbingan dengan saya selaku ${roleLabel} terkait progres Tugas Akhir periode ini. Jika sudah melakukan bimbingan selain dengan saya selaku ${roleLabel}, maka hiraukan pesan ini. Terima kasih 🙏`
                          : `Halo ${s.nama} (${s.nim}),\n\nMengingatkan kembali terkait perkembangan Tugas Akhir (TA) Program Studi Sains Data periode *${selectedWeek}*.\n\n${supervisors}\n\nDihimbau untuk *segera melakukan sesi bimbingan langsung dengan dosen pembimbing/penguji*, agar progres pengerjaan skripsi/TA Anda dapat dievaluasi dan kendala teknis/penulisan dapat segera teratasi.\n\nSilakan jadwalkan waktu bimbingan Anda ya. Semangat selalu!\n\nSalam,\nKoordinator / Tim Monitoring TA Prodi Sains Data`
                      );
                      const waUrl = phone ? `https://wa.me/${phone}?text=${waMsg}` : null;
                      return (
                        <div key={s.nim || i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50">
                          <div className="w-7 h-7 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{s.nama}</p>
                            <p className="text-[10px] text-slate-400">{s.nim} · {s.angkatan}</p>
                          </div>
                          {(isAdmin || isDosen) && (waUrl ? (
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
                            <span className="text-[10px] text-slate-400 shrink-0">No WA</span>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${total > 0 ? 100 - percentage : 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex justify-between">
            <span>{notReported > 0 ? 'Perlu Pengingat' : 'Semua Melapor!'}</span>
            <span className="font-medium text-rose-600">{notReported} dari {total}</span>
          </p>
        </div>
      </div>

      {/* Tahapan Terbanyak */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
              Fokus Utama Periode Ini
            </p>
            <h3 className="text-lg font-bold text-slate-900 mt-1 truncate max-w-[180px]" title={topCategory}>
              {topCategory}
            </h3>
          </div>

          <div className="relative" ref={focusPopover.ref}>
            <button
              type="button"
              onClick={() => focusPopover.setOpen(v => !v)}
              className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 transition-all hover:bg-purple-100 hover:border-purple-300 cursor-pointer"
              title="Lihat semua kategori"
            >
              <Compass className="w-5 h-5" />
            </button>

            {focusPopover.open && (
              <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600">
                  <div>
                    <p className="text-xs font-bold text-white">Fokus Periode Ini</p>
                    <p className="text-[10px] text-white/70">Distribusi kategori bimbingan</p>
                  </div>
                  <button onClick={() => focusPopover.setOpen(false)}
                    className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                  {Object.entries(categoryCounts || {})
                    .filter(([cat]) => cat !== 'Belum Lapor')
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => {
                      const pct = reported > 0 ? Math.round((count / reported) * 100) : 0;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]" title={cat}>{cat}</span>
                            <span className="text-xs font-bold text-slate-900 shrink-0 ml-2">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(categoryCounts || {}).filter(c => c !== 'Belum Lapor').length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada data kategori</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
          <span className="font-semibold text-slate-700">{topCategoryCount} Mahasiswa</span> pada tahapan ini
        </p>
      </div>
    </div>
  );
}
