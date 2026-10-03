import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  History,
  ArrowRight,
  Phone,
  Zap,
  RefreshCw
} from 'lucide-react';
import {
  getCategoryBadgeStyle,
  formatPhoneDisplay,
  getDirectWhatsAppUrl,
  formatWhatsAppReminder
} from '../utils/helpers';
import { sendDirectMessage } from '../services/whatsappService';

export default function StudentTable({
  students,
  selectedWeek,
  onOpenDetail,
  onOpenWhatsApp,
  nextWeek = '',
  gatewayStatus,
  onOpenGatewayModal,
  isAdmin = false,
  isDosen = false,
}) {
  const [sendingNim, setSendingNim] = useState(null);
  const [sentNim, setSentNim] = useState(null);

  const isGatewayConnected = gatewayStatus?.isConnected;

  const handleQuickAutoSend = async (student, update) => {
    if (!isGatewayConnected) {
      onOpenGatewayModal();
      return;
    }
    if (!student.phone) {
      alert('Nomor WhatsApp mahasiswa tidak tersedia.');
      return;
    }

    try {
      setSendingNim(student.nim);
      const msg = formatWhatsAppReminder(
        student,
        selectedWeek,
        update.reported,
        update,
        nextWeek
      );
      await sendDirectMessage(student.phone, msg);
      setSentNim(student.nim);
      setTimeout(() => setSentNim(null), 3000);
    } catch (err) {
      alert('Gagal mengirim otomatis: ' + (err.message || 'Error'));
    } finally {
      setSendingNim(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
            <tr>
              <th className="py-3.5 px-3 w-10 text-center">No</th>
              <th className="py-3.5 px-4 min-w-[190px]">Mahasiswa</th>
              <th className="py-3.5 px-4 min-w-[170px]">Pembimbing</th>
              <th className="py-3.5 px-4 min-w-[130px]">Status TA</th>
              {(isAdmin || isDosen) && <th className="py-3.5 px-4 min-w-[130px]">WhatsApp</th>}
              <th className="py-3.5 px-4 min-w-[90px]">Lapor</th>
              <th className="py-3.5 px-4 min-w-[140px]">Tahapan</th>
              <th className="py-3.5 px-4 min-w-[220px]">Progres Periode Ini</th>
              <th className="py-3.5 px-4 min-w-[180px]">Target Periode Depan</th>
              <th className="py-3.5 px-4 text-center min-w-[140px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student, idx) => {
              const update = student.weeklyUpdates[selectedWeek] || {
                reported: false,
                progress: '',
                next: '',
                category: 'Belum Lapor'
              };
              const badgeStyle = getCategoryBadgeStyle(update.category);
              const phoneDisplay = formatPhoneDisplay(student.phone);

              const handleDirectWA = (e) => {
                e.stopPropagation();
                const msg = formatWhatsAppReminder(
                  student,
                  selectedWeek,
                  update.reported,
                  update,
                  nextWeek
                );
                const url = getDirectWhatsAppUrl(student.phone, msg);
                window.open(url, '_blank');
              };

              const isSendingThis = sendingNim === student.nim;
              const isSentThis = sentNim === student.nim;

              return (
                <tr
                  key={student.nim}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    !update.reported ? 'bg-rose-50/20' : ''
                  }`}
                >
                  {/* No */}
                  <td className="py-3.5 px-3 text-center font-medium text-slate-400 text-xs">
                    {idx + 1}
                  </td>

                  {/* Student Info */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 leading-tight">
                      {student.nama}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono">{student.nim}</span>
                      <span className="text-slate-300">•</span>
                      <span>Angk. {student.angkatan}</span>
                    </div>
                  </td>

                  {/* Supervisors */}
                  <td className="py-3.5 px-4 text-xs">
                    <div className="space-y-0.5 max-w-[170px]">
                      {student.pembimbing1 && (
                        <div className="font-medium text-slate-800 truncate" title={student.pembimbing1}>
                          <span className="text-slate-400 font-normal">P1:</span> {student.pembimbing1.split(',')[0]}
                        </div>
                      )}
                      {student.pembimbing2 && (
                        <div className="text-slate-600 truncate" title={student.pembimbing2}>
                          <span className="text-slate-400 font-normal">P2:</span> {student.pembimbing2.split(',')[0]}
                        </div>
                      )}
                      {student.penguji1 && (
                        <div className="text-slate-600 truncate" title={student.penguji1}>
                          <span className="text-slate-400 font-normal">Pj1:</span> {student.penguji1.split(',')[0]}
                        </div>
                      )}
                      {student.penguji2 && (
                        <div className="text-slate-600 truncate" title={student.penguji2}>
                          <span className="text-slate-400 font-normal">Pj2:</span> {student.penguji2.split(',')[0]}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status / Target */}
                  <td className="py-3.5 px-4 text-xs">
                    <span className="font-medium text-slate-700 block">
                      {student.statusTA || '-'}
                    </span>
                    {student.target && (
                      <span className="text-[11px] text-brand-700 font-medium block mt-0.5">
                        {student.target}
                      </span>
                    )}
                  </td>

                  {/* WhatsApp — hanya untuk admin & dosen */}
                  {(isAdmin || isDosen) && (
                    <td className="py-3.5 px-4">
                      {student.phone && !update.reported ? (
                        <button
                          onClick={handleDirectWA}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          title="Klik untuk buka di WhatsApp Web"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{phoneDisplay}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">{student.phone ? phoneDisplay : '-'}</span>
                      )}
                    </td>
                  )}

                  {/* Status Lapor */}
                  <td className="py-3.5 px-4">
                    {update.reported ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Lapor</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>Belum</span>
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`}></span>
                      <span className="line-clamp-1">{update.category}</span>
                    </span>
                  </td>

                  {/* Progress */}
                  <td className="py-3.5 px-4">
                    {update.reported ? (
                      <p className="text-slate-700 text-xs font-medium leading-relaxed max-w-xs">
                        {update.progress}
                      </p>
                    ) : (
                      <span className="text-rose-500 italic text-xs">
                        Belum lapor periode ini
                      </span>
                    )}
                  </td>

                  {/* Next Target */}
                  <td className="py-3.5 px-4">
                    {update.next ? (
                      <div className="flex items-center gap-1 text-slate-800 text-xs font-semibold bg-slate-100/70 px-2 py-0.5 rounded-md border border-slate-200/60 max-w-xs">
                        <ArrowRight className="w-3 h-3 text-brand-600 shrink-0" />
                        <span className="truncate">{update.next}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* History */}
                      <button
                        onClick={() => onOpenDetail(student)}
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Lihat riwayat bimbingan"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      {/* Quick Auto Send — admin only */}
                      {isAdmin && isGatewayConnected && student.phone && !update.reported && (
                        <button
                          onClick={() => handleQuickAutoSend(student, update)}
                          disabled={isSendingThis}
                          className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                            isSentThis
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                          title="Kirim otomatis di latar belakang"
                        >
                          {isSendingThis ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : isSentThis ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Zap className="w-3 h-3 text-emerald-600 fill-current" />
                          )}
                          <span>{isSentThis ? 'Terkirim!' : 'Auto'}</span>
                        </button>
                      )}

                      {/* Format modal button — admin only */}
                      {isAdmin && (
                        <button
                          onClick={() => onOpenWhatsApp(student)}
                          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                          title="Format pesan WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
