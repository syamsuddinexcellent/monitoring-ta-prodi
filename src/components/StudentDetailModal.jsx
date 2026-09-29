import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  MessageCircle,
  GraduationCap,
  Phone,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import {
  getCategoryBadgeStyle,
  formatPhoneDisplay,
  getDirectWhatsAppUrl
} from '../utils/helpers';
import { getVerifikasi, printStudentHistory, exportExcelPeriode } from '../utils/exportUtils';

export default function StudentDetailModal({
  student,
  weekColumns,
  onClose,
  onOpenWhatsApp,
  isAdmin = false,
  allStudents = [],
}) {
  const [verifData, setVerifData] = useState({});
  useEffect(() => { setVerifData(getVerifikasi()); }, [student]);

  if (!student) return null;

  let filledCount = 0;
  weekColumns.forEach(w => {
    if (student.weeklyUpdates[w]?.reported) filledCount++;
  });
  const rate = Math.round((filledCount / (weekColumns.length || 1)) * 100);
  const phoneDisplay = formatPhoneDisplay(student.phone);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">
                  {student.nama}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  Angkatan {student.angkatan}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="font-mono">NIM: {student.nim}</span>
                {student.phone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <a
                      href={getDirectWhatsAppUrl(student.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-emerald-700 hover:underline font-semibold"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{phoneDisplay}</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Academic & Supervisor Details */}
        <div className="px-6 py-3 bg-indigo-50/40 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pembimbing 1</span>
            <span className="font-semibold text-slate-800">{student.pembimbing1 || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pembimbing 2</span>
            <span className="font-medium text-slate-700">{student.pembimbing2 || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status / Target</span>
            <span className="font-semibold text-brand-700">
              {[student.statusTA, student.target].filter(Boolean).join(' • ') || '-'}
            </span>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Tingkat Keaktifan Bimbingan:</span>
            <span className="font-bold text-slate-900">
              {filledCount} dari {weekColumns.length} Periode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full"
                style={{ width: `${rate}%` }}
              ></div>
            </div>
            <span className="font-semibold text-brand-700">{rate}%</span>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {weekColumns.map((week, idx) => {
              const update = student.weeklyUpdates[week];
              const reported = update?.reported;
              const badgeStyle = getCategoryBadgeStyle(update?.category);

              return (
                <div key={week} className="relative group">
                  <div
                    className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      reported
                        ? 'bg-emerald-500 ring-4 ring-emerald-100'
                        : 'bg-slate-300'
                    }`}
                  ></div>

                  <div className="bg-slate-50/70 group-hover:bg-slate-50 rounded-xl p-4 border border-slate-200/80 transition-colors">
                    {/* Week Title & Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          Periode {idx + 1}
                        </span>
                        <span className="text-xs text-slate-400">({week})</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {reported ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`}></span>
                            <span>{update.category}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-200/70 text-slate-600">
                            Tidak ada pembaruan
                          </span>
                        )}
                        {verifData[student.nim]?.[week]?.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" />
                            Diverifikasi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Detail */}
                    {reported ? (
                      <div className="space-y-2 mt-2 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Progres:
                          </span>
                          <p className="text-slate-800 font-medium leading-relaxed">
                            {update.progress}
                          </p>
                        </div>

                        {update.next && (
                          <div className="bg-brand-50/50 p-2.5 rounded-lg border border-brand-100 flex items-start gap-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">
                                Target Berikutnya:
                              </span>
                              <p className="text-slate-900 font-semibold">
                                {update.next}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-1">
                        Mahasiswa belum mencatatkan progres di formulir monitoring pada periode ini.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => printStudentHistory(student, weekColumns, verifData)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
              title="Cetak / Simpan sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak PDF
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => exportExcelPeriode([student], weekColumns[weekColumns.length - 1], weekColumns)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  title="Export data mahasiswa ini ke Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export Excel
                </button>
                <button
                  onClick={() => onOpenWhatsApp(student)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Kirim WA
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
