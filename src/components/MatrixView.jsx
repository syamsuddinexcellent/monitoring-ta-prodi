import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Eye } from 'lucide-react';
import { getCategoryBadgeStyle } from '../utils/helpers';

export default function MatrixView({
  students,
  weekColumns,
  onOpenDetail
}) {
  const [selectedCell, setSelectedCell] = useState(null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            Matriks Pemantauan Lintas Periode Prodi
          </h3>
          <p className="text-xs text-slate-500">
            Peta komparasi perkembangan seluruh mahasiswa Tugas Akhir dari minggu ke minggu
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600">Sudah Lapor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <span className="text-slate-600">Belum Mengisi</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-3 w-10 text-center sticky left-0 bg-slate-50 z-10">
                #
              </th>
              <th className="py-3 px-4 min-w-[200px] sticky left-10 bg-slate-50 z-10 border-r border-slate-200 shadow-xs">
                Mahasiswa & Pembimbing
              </th>
              {weekColumns.map((week, idx) => {
                let count = 0;
                students.forEach(s => {
                  if (s.weeklyUpdates[week]?.reported) count++;
                });

                return (
                  <th key={week} className="py-3 px-3 min-w-[200px] border-r border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-slate-800 font-bold">Periode {idx + 1}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{week}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        {count}/{students.length} Lapor
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student, sIdx) => (
              <tr key={student.nim} className="hover:bg-slate-50/70 transition-colors">
                {/* Index */}
                <td className="py-3 px-3 text-center text-slate-400 sticky left-0 bg-white z-10">
                  {sIdx + 1}
                </td>

                {/* Student Info */}
                <td className="py-3 px-4 sticky left-10 bg-white z-10 border-r border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between group">
                    <div>
                      <div className="font-semibold text-slate-900 leading-tight">
                        {student.nama}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {student.nim} • Angk. {student.angkatan}
                      </div>
                      {student.pembimbing1 && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5" title={student.pembimbing1}>
                          P1: {student.pembimbing1.split(',')[0]}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onOpenDetail(student)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-brand-600 rounded transition-opacity"
                      title="Lihat Detail"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>

                {/* Week Cells */}
                {weekColumns.map(week => {
                  const update = student.weeklyUpdates[week];
                  const reported = update?.reported;
                  const badgeStyle = getCategoryBadgeStyle(update?.category);

                  return (
                    <td
                      key={week}
                      className="py-3 px-3 border-r border-slate-100 align-top"
                    >
                      {reported ? (
                        <div
                          onClick={() => setSelectedCell({ student, week, update })}
                          className={`p-2 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-xs ${badgeStyle.bg} ${badgeStyle.border}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`font-semibold text-[11px] truncate ${badgeStyle.text}`}>
                              {update.category}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          </div>
                          <p className="text-slate-800 line-clamp-2 text-[11px] leading-snug">
                            {update.progress}
                          </p>
                          {update.next && (
                            <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center gap-1 text-[10px] text-slate-600 font-medium">
                              <ArrowRight className="w-2.5 h-2.5 text-brand-600 shrink-0" />
                              <span className="truncate">{update.next}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full min-h-[60px] flex items-center justify-center rounded-lg bg-slate-50/60 border border-dashed border-slate-200 text-slate-300 text-[11px]">
                          <span>-</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Cell Modal */}
      {selectedCell && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-brand-600">
                  {selectedCell.week}
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedCell.student.nama}
                </h4>
                <p className="text-xs font-mono text-slate-500">
                  {selectedCell.student.nim} • Angkatan {selectedCell.student.angkatan}
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Catatan Progres
                </span>
                <p className="text-slate-800 text-sm leading-relaxed">
                  {selectedCell.update.progress}
                </p>
              </div>

              {selectedCell.update.next && (
                <div className="bg-brand-50 p-3 rounded-lg border border-brand-100">
                  <span className="text-[11px] font-bold text-brand-700 uppercase tracking-wider block mb-1">
                    Target Periode Depan
                  </span>
                  <p className="text-slate-800 text-sm font-semibold">
                    {selectedCell.update.next}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
