import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  MessageCircle,
  History,
  Phone,
  Copy,
  Check,
  Zap,
  RefreshCw,
  User,
  ShieldCheck,
  UserCheck,
  CalendarDays,
  Pencil,
} from 'lucide-react';
import {
  getCategoryBadgeStyle,
  formatPhoneDisplay,
  getDirectWhatsAppUrl,
  formatWhatsAppReminder
} from '../utils/helpers';
import { sendDirectMessage } from '../services/whatsappService';

export default function StudentCard({
  student,
  selectedWeek,
  onOpenDetail,
  onOpenWhatsApp,
  nextWeek = '',
  gatewayStatus,
  onOpenGatewayModal,
  isAdmin = false,
  isDosen = false,
  dosenName = '',
  highlightLecturer = '',
  onUpdateTarget = null,
}) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [autoSending, setAutoSending] = useState(false);
  const [autoSentSuccess, setAutoSentSuccess] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const targetInputRef = useRef(null);

  const update = student.weeklyUpdates[selectedWeek] || {
    reported: false,
    progress: '',
    next: '',
    category: 'Belum Lapor'
  };

  const badgeStyle = getCategoryBadgeStyle(update.category);
  const initials = student.nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');

  const phoneDisplay = formatPhoneDisplay(student.phone);
  const hasPhone = Boolean(student.phone);
  const isGatewayConnected = gatewayStatus?.isConnected;

  const handleCopyPhone = (e) => {
    e.stopPropagation();
    if (!student.phone) return;
    navigator.clipboard.writeText(student.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

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

  const handleQuickAutoSend = async (e) => {
    e.stopPropagation();
    if (!isGatewayConnected) {
      onOpenGatewayModal();
      return;
    }
    if (!student.phone) {
      alert('Nomor WhatsApp mahasiswa belum tersedia di database.');
      return;
    }

    try {
      setAutoSending(true);
      const msg = formatWhatsAppReminder(
        student,
        selectedWeek,
        update.reported,
        update,
        nextWeek
      );
      await sendDirectMessage(student.phone, msg);
      setAutoSentSuccess(true);
      setTimeout(() => setAutoSentSuccess(false), 3000);
    } catch (err) {
      alert('Gagal mengirim otomatis: ' + (err.message || 'Error'));
    } finally {
      setAutoSending(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border transition-all hover:shadow-md flex flex-col justify-between relative ${
        update.reported
          ? 'border-slate-200/90'
          : 'border-rose-200/90 bg-gradient-to-b from-rose-50/20 to-white'
      }`}
    >
      {/* Toast Alert on Card */}
      {autoSentSuccess && (
        <div className="absolute top-2 left-2 right-2 bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg flex items-center justify-between z-20 animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pesan WA terkirim otomatis di latar belakang!</span>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header: Student Info & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                update.reported
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {initials}
            </div>
            <div>
              <h4
                className="font-bold text-slate-900 text-sm leading-snug line-clamp-1"
                title={student.nama}
              >
                {student.nama}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-slate-500">
                  {student.nim}
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Angk. {student.angkatan}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          {update.reported ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sudah Lapor</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Belum Lapor</span>
            </span>
          )}
        </div>

        {/* Supervisors & Target Row */}
        <div className="mt-3 py-2 px-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-1">
          {[
            { label: 'P1', name: student.pembimbing1 },
            { label: 'P2', name: student.pembimbing2 },
            { label: 'Pj1', name: student.penguji1 },
            { label: 'Pj2', name: student.penguji2 },
          ].filter(d => d.name).map(({ label, name }) => {
            const isMatch = highlightLecturer && name === highlightLecturer;
            return (
              <div key={label} className="flex items-center justify-between gap-1">
                <span className={`shrink-0 ${isMatch ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>{label}:</span>
                <span
                  className={`truncate text-right ${isMatch ? 'font-bold text-brand-700' : 'text-slate-600'}`}
                  title={name}
                >
                  {name}
                </span>
              </div>
            );
          })}
          {student.statusTA && (
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/50">
              <span className="text-slate-400 shrink-0">Status:</span>
              <span className="font-medium text-brand-700 truncate text-right">
                {student.statusTA}
              </span>
            </div>
          )}
          {(student.target || (isDosen && student.pembimbing1 === dosenName)) && (
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <span className="text-slate-400 shrink-0">Target:</span>
              {isDosen && onUpdateTarget && student.pembimbing1 === dosenName ? (
                editingTarget ? (
                  <div className="flex items-center gap-1 flex-1 justify-end">
                    <input
                      ref={targetInputRef}
                      value={targetValue}
                      onChange={e => setTargetValue(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter') {
                          setSavingTarget(true);
                          await onUpdateTarget(student.nim, targetValue.trim());
                          setSavingTarget(false);
                          setEditingTarget(false);
                        } else if (e.key === 'Escape') {
                          setEditingTarget(false);
                        }
                      }}
                      className="text-xs border border-brand-300 rounded px-1.5 py-0.5 w-full max-w-[140px] focus:outline-none focus:ring-1 focus:ring-brand-400"
                      placeholder="Target TA..."
                      autoFocus
                      disabled={savingTarget}
                    />
                    <button
                      onClick={async () => {
                        setSavingTarget(true);
                        await onUpdateTarget(student.nim, targetValue.trim());
                        setSavingTarget(false);
                        setEditingTarget(false);
                      }}
                      disabled={savingTarget}
                      className="shrink-0 text-[10px] bg-brand-600 text-white rounded px-1.5 py-0.5 hover:bg-brand-700"
                    >
                      {savingTarget ? '...' : 'Simpan'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setTargetValue(student.target || ''); setEditingTarget(true); }}
                    className="flex items-center gap-1 text-right font-medium text-brand-700 hover:text-brand-900 group truncate max-w-[160px]"
                    title="Klik untuk edit target"
                  >
                    <span className="truncate">{student.target || <span className="text-slate-400 italic">— atur target</span>}</span>
                    <Pencil className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </button>
                )
              ) : (
                <span className="font-medium text-brand-700 truncate text-right">
                  {student.target || '-'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp & Category Row */}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          {/* Category Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`}></span>
            <span>{update.category}</span>
          </span>

          {/* WhatsApp Direct Badge — admin & dosen only */}
          {(isAdmin || isDosen) && (hasPhone ? (
            <div className="inline-flex items-center gap-1 text-xs bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 rounded-md px-2 py-0.5 font-medium">
              <Phone className="w-3 h-3 text-emerald-600" />
              <button
                onClick={handleDirectWA}
                className="hover:underline font-mono text-[11px] font-semibold"
                title="Klik untuk buka chat di WhatsApp Web"
              >
                {phoneDisplay}
              </button>
              <button
                onClick={handleCopyPhone}
                className="p-0.5 hover:text-emerald-950 text-emerald-600"
                title="Salin nomor WhatsApp"
              >
                {copiedPhone ? (
                  <Check className="w-3 h-3 text-emerald-700" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              Nomor WA belum ada
            </span>
          ))}
        </div>

        {/* Progress Content */}
        <div className="mt-3.5 space-y-2.5">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Catatan Progres
            </p>
            {update.reported ? (
              <p className="text-slate-800 leading-relaxed font-medium">
                {update.progress}
              </p>
            ) : (
              <p className="text-rose-600 italic">
                Belum ada catatan progres yang dilaporkan pada periode ini.
              </p>
            )}
          </div>

          {/* Next Target / Milestone */}
          {update.next ? (
            <div className="bg-brand-50/60 rounded-lg p-3 border border-brand-100 text-xs">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-700 uppercase tracking-wider mb-1">
                <ArrowRight className="w-3 h-3" />
                <span>Target Periode Depan</span>
              </div>
              <p className="text-slate-800 font-semibold leading-relaxed">
                {update.next}
              </p>
            </div>
          ) : !update.reported ? null : (
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs text-slate-500">
              <span className="italic">
                Belum menetapkan target spesifik periode depan
              </span>
            </div>
          )}

          {/* Bimbingan terakhir: only the latest session */}
          {update.reported && (() => {
            const sessions = update.sessions;
            const hasSessions = Array.isArray(sessions) && sessions.length > 0;
            if (hasSessions) {
              const last = [...sessions].sort((a, b) => (b.ke || 0) - (a.ke || 0))[0];
              const tgl = last.tanggal
                ? new Date(last.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : null;
              const dosenLabel = last.dosen?.label || '';
              const dosenShort = last.dosen?.name || '';
              return (
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    <UserCheck className="w-3 h-3" />
                    Bimbingan ke-{last.ke || sessions.indexOf(last) + 1}
                  </span>
                  {dosenLabel && dosenShort && (
                    <span className="text-[11px] text-slate-600 font-medium">
                      {dosenLabel} · {dosenShort}
                    </span>
                  )}
                  {tgl && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400">
                      <CalendarDays className="w-3 h-3" />
                      {tgl}
                    </span>
                  )}
                </div>
              );
            }
            // Fallback: dosenHadir list + tanggalBimbingan
            if (update.dosenHadir?.length > 0) {
              return (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {update.dosenHadir.map(d => (
                    <span key={d.label} className="text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                      {d.label} · {d.name}
                    </span>
                  ))}
                  {update.tanggalBimbingan && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(update.tanggalBimbingan + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 rounded-b-xl">
        <button
          onClick={() => onOpenDetail(student)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Quick Auto Send Button */}
          {isGatewayConnected && hasPhone && (
            <button
              onClick={handleQuickAutoSend}
              disabled={autoSending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors"
              title="Kirim otomatis langsung di latar belakang"
            >
              {autoSending ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Zap className="w-3 h-3 fill-current" />
              )}
              <span>Kirim Auto</span>
            </button>
          )}

          {/* Regular Message Modal Button — admin only */}
          {isAdmin && (
            <button
              onClick={() => onOpenWhatsApp(student)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-xs"
              title="Lihat teks atau edit sebelum kirim"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Format</span>
            </button>
          )}

          {/* WA Reminder Button — dosen only */}
          {isDosen && hasPhone && (() => {
            const role = dosenName
              ? student.pembimbing1 === dosenName ? 'Pembimbing 1 (P1)'
              : student.pembimbing2 === dosenName ? 'Pembimbing 2 (P2)'
              : student.penguji1 === dosenName ? 'Penguji 1 (Pj1)'
              : student.penguji2 === dosenName ? 'Penguji 2 (Pj2)'
              : null
              : null;
            const msg = encodeURIComponent(
              role
                ? `Halo ${student.nama}, mohon segera melakukan bimbingan dengan saya selaku ${role} terkait progres Tugas Akhir periode ini. Jika sudah melakukan bimbingan selain dengan saya selaku ${role}, maka hiraukan pesan ini. Terima kasih 🙏`
                : `Halo ${student.nama}, mohon segera melakukan bimbingan dengan dosen pembimbing Anda terkait progres Tugas Akhir periode ini. Terima kasih 🙏`
            );
            return (
              <a
                href={`https://wa.me/${student.phone?.replace(/\D/g, '')}?text=${msg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-xs"
                title="Kirim pengingat WhatsApp"
                onClick={e => e.stopPropagation()}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WA</span>
              </a>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
