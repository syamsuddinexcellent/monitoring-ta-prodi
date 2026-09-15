import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
  Users,
  AlertCircle,
  Phone,
  Zap,
  RefreshCw,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import {
  formatWhatsAppReminder,
  formatPhoneDisplay,
  getDirectWhatsAppUrl
} from '../utils/helpers';
import {
  sendDirectMessage,
  sendBulkMessages,
  sendGroupMessage,
  DEFAULT_WA_GROUP_LINK,
  DEFAULT_WA_GROUP_CODE
} from '../services/whatsappService';

export default function WhatsAppModal({
  isOpen,
  onClose,
  mode = 'single',
  student,
  selectedWeek,
  unreportedStudents = [],
  nextWeek = '',
  gatewayStatus,
  onOpenGatewayModal
}) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingAuto, setSendingAuto] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [successText, setSuccessText] = useState('');
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setSendSuccess(false);
    setSuccessText('');
    setSendError('');
    setSendingAuto(false);

    if (mode === 'single' && student) {
      const update = student.weeklyUpdates[selectedWeek] || { reported: false };
      const defaultMsg = formatWhatsAppReminder(
        student,
        selectedWeek,
        update.reported,
        update,
        nextWeek
      );
      setMessage(defaultMsg);
      setPhoneNumber(student.phone || '');
    } else if (mode === 'bulk') {
      let bulkMsg = `📢 *PEMBERITAHUAN MONITORING TUGAS AKHIR (TA) PRODI SAINS DATA*\n`;
      bulkMsg += `🗓 *Periode:* ${selectedWeek}\n\n`;
      bulkMsg += `Halo rekan-rekan mahasiswa Tugas Akhir Sains Data ITERA, selamat pagi/siang/sore/malam.\n\n`;
      bulkMsg += `Berikut adalah daftar mahasiswa yang tercatat *belum melaporkan progres bimbingan TA* pada pekan ini:\n\n`;

      unreportedStudents.forEach((st, idx) => {
        const dosenParts = [
          st.pembimbing1 ? `P1: ${st.pembimbing1.split(',')[0]}` : '',
          st.pembimbing2 ? `P2: ${st.pembimbing2.split(',')[0]}` : '',
          st.penguji1    ? `Pj1: ${st.penguji1.split(',')[0]}`   : '',
          st.penguji2    ? `Pj2: ${st.penguji2.split(',')[0]}`   : '',
        ].filter(Boolean).join(', ');
        const dosenText = dosenParts ? ` (${dosenParts})` : '';
        const phoneFormatted = st.phone ? ` - ${formatPhoneDisplay(st.phone)}` : '';
        bulkMsg += `${idx + 1}. *${st.nama}* [${st.nim}] - Angk. ${st.angkatan}${dosenText}${phoneFormatted}\n`;
      });

      bulkMsg += `\nDihimbau kepada seluruh mahasiswa di atas untuk *segera melakukan bimbingan intensif dengan dosen pembimbing masing-masing*, agar kendala yang dihadapi dapat terselesaikan dan target kelulusan dapat tercapai tepat waktu.\n\n`;
      bulkMsg += `Silakan segera koordinasikan jadwal dengan dosen pembimbing Anda ya. Tetap semangat!\n\n`;
      bulkMsg += `Salam,\nKoordinator / Tim Monitoring TA Prodi Sains Data`;

      setMessage(bulkMsg);
    }
    setCopied(false);
  }, [isOpen, mode, student, selectedWeek, unreportedStudents, nextWeek]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsAppWeb = () => {
    const url = getDirectWhatsAppUrl(phoneNumber, message);
    window.open(url, '_blank');
  };

  const handleOpenGroupLink = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    window.open(DEFAULT_WA_GROUP_LINK, '_blank');
  };

  const handleAutoSendSingle = async () => {
    if (!gatewayStatus?.isConnected) {
      onOpenGatewayModal();
      return;
    }

    try {
      setSendingAuto(true);
      setSendError('');
      await sendDirectMessage(phoneNumber, message);
      setSuccessText('Pesan berhasil terkirim otomatis di latar belakang!');
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3500);
    } catch (err) {
      setSendError(err.message || 'Gagal mengirim otomatis.');
    } finally {
      setSendingAuto(false);
    }
  };

  const handleAutoSendGroup = async () => {
    if (!gatewayStatus?.isConnected) {
      onOpenGatewayModal();
      return;
    }

    try {
      setSendingAuto(true);
      setSendError('');
      await sendGroupMessage(DEFAULT_WA_GROUP_CODE, message);
      setSuccessText('Pesan berhasil terkirim otomatis ke Grup WhatsApp!');
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3500);
    } catch (err) {
      setSendError(err.message || 'Gagal mengirim otomatis ke grup WhatsApp.');
    } finally {
      setSendingAuto(false);
    }
  };

  const isReportedStudent = student?.weeklyUpdates[selectedWeek]?.reported;

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
              {mode === 'bulk' ? (
                <Users className="w-5 h-5" />
              ) : (
                <MessageCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {mode === 'bulk'
                  ? 'Format Siaran Pengingat Grup TA'
                  : isReportedStudent
                  ? `Konfirmasi Bimbingan: ${student?.nama}`
                  : `Pemberitahuan Bimbingan: ${student?.nama}`}
              </h3>
              <p className="text-xs text-slate-500">
                Pekan Saat Ini: <span className="font-medium text-slate-700">{selectedWeek}</span>
                {nextWeek && (
                  <> • Pekan Depan: <span className="font-medium text-brand-700">{nextWeek}</span></>
                )}
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

        {/* Body */}
        <div className="mt-4 space-y-4">
          {mode === 'single' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Nomor WhatsApp Mahasiswa
                </label>
                {student?.phone && (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Database
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Contoh: 081234567890 atau 628..."
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              {phoneNumber && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Format tujuan: <span className="font-semibold text-slate-700">{formatPhoneDisplay(phoneNumber)}</span>
                </p>
              )}
            </div>
          ) : (
            /* Bulk Group Banner */
            <div className="p-3 bg-brand-50/70 rounded-xl border border-brand-200 flex items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-brand-900 block">
                  Tautan Grup WhatsApp Terhubung:
                </span>
                <span className="text-[11px] font-mono text-brand-700 truncate max-w-[280px] block">
                  chat.whatsapp.com/H2uFKAw0TWu7hpGtFQrP80
                </span>
              </div>
              <a
                href={DEFAULT_WA_GROUP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900 bg-white px-2.5 py-1.5 rounded-lg border border-brand-200 shadow-xs shrink-0"
              >
                <span>Buka</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Isi Pesan WhatsApp
              </label>
              <span className="text-[11px] text-slate-400">
                {message.length} karakter
              </span>
            </div>
            <textarea
              rows={mode === 'bulk' ? 8 : 7}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans leading-relaxed text-slate-800"
            />
          </div>

          {/* Feedback & Error */}
          {sendSuccess && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 animate-fadeIn font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successText}</span>
            </div>
          )}

          {sendError && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
          {mode === 'bulk' ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 flex-wrap ml-auto">
                <button
                  onClick={handleOpenGroupLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-colors"
                  title="Salin pesan dan buka link grup WhatsApp"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Grup WA & Salin</span>
                </button>

                <button
                  onClick={handleAutoSendGroup}
                  disabled={sendingAuto}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  title="Kirim otomatis langsung ke grup WhatsApp"
                >
                  {sendingAuto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Kirim Auto ke Grup</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenWhatsAppWeb}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Buka via WhatsApp Web manual"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Buka WA Web</span>
                </button>

                <button
                  onClick={handleAutoSendSingle}
                  disabled={sendingAuto}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  {sendingAuto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Kirim Otomatis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
