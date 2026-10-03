import React, { useState, useEffect } from 'react';
import { X, Inbox, BookOpen, Users, ArrowRight, ShieldCheck, ShieldOff, XCircle, RefreshCw, CalendarDays, UserCheck } from 'lucide-react';
import { getDosenLaporan, markDosenLaporanRead, saveVerifikasiSession, cancelVerifikasiSession } from './LaporanModal';
import { getCategoryBadgeStyle } from '../utils/helpers';
import { getVerifikasi, saveVerifikasi, cancelVerifikasi, getPenolakan, savePenolakan, cancelPenolakan } from '../utils/exportUtils';

function formatDate(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function formatTanggal(str) {
  if (!str) return null;
  return new Date(str + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Card for a single bimbingan session
function SessionCard({ sess, nim, week, dosenName, isVerifiedPeriod, onVerifChange }) {
  const [showTolakForm, setShowTolakForm] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [loading, setLoading] = useState(false);

  const sessVerified = !!sess.verified_at || isVerifiedPeriod;
  const badge = getCategoryBadgeStyle(sess.category);

  const handleVerify = async () => {
    setLoading(true);
    if (sess.verified_at || isVerifiedPeriod) {
      await cancelVerifikasiSession(nim, week, sess.ke);
      await cancelVerifikasi(nim, week);
    } else {
      await saveVerifikasiSession(nim, week, sess.ke, dosenName);
      await saveVerifikasi(nim, week, dosenName);
    }
    setLoading(false);
    onVerifChange();
  };

  const handleTolak = async () => {
    if (!alasan.trim()) return;
    await savePenolakan(nim, week, dosenName, alasan.trim());
    setAlasan('');
    setShowTolakForm(false);
    onVerifChange();
  };

  return (
    <div className={`rounded-lg border p-3 text-xs ${
      sessVerified ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-100'
    }`}>
      {/* Session header */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
          Bimbingan ke-{sess.ke}
        </span>
        {sess.dosen && (
          <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
            {sess.dosen.label} · {sess.dosen.name?.split(',')[0]}
          </span>
        )}
        {sess.category && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
            <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
            {sess.category}
          </span>
        )}
        {sessVerified && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 ml-auto">
            <ShieldCheck className="w-3 h-3" />
            Terverifikasi
          </span>
        )}
      </div>

      {sess.tanggal && (
        <div className="flex items-center gap-1 text-slate-400 mb-1.5">
          <CalendarDays className="w-3 h-3" />
          <span>{formatTanggal(sess.tanggal)}</span>
        </div>
      )}

      {sess.progress && (
        <p className="text-slate-800 font-medium leading-relaxed mb-1.5">{sess.progress}</p>
      )}

      {sess.next && (
        <div className="flex items-start gap-1 text-brand-700 mb-2">
          <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="font-semibold">{sess.next}</span>
        </div>
      )}

      {/* Tolak form */}
      {showTolakForm && (
        <div className="space-y-2 bg-red-50/60 border border-red-200 rounded-lg p-2.5 mb-2">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Alasan Penolakan</p>
          <textarea
            value={alasan}
            onChange={e => setAlasan(e.target.value)}
            placeholder="Tuliskan alasan penolakan..."
            rows={2}
            className="w-full text-xs px-2.5 py-1.5 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 bg-white placeholder:text-slate-400 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowTolakForm(false); setAlasan(''); }}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold">
              Batal
            </button>
            <button onClick={handleTolak} disabled={!alasan.trim()}
              className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-40">
              Konfirmasi Tolak
            </button>
          </div>
        </div>
      )}

      {/* Action buttons for this session */}
      <div className="flex items-center justify-end gap-2">
        {!sessVerified && !showTolakForm && (
          <button onClick={() => setShowTolakForm(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200">
            <XCircle className="w-3 h-3" />
            Tolak
          </button>
        )}
        <button onClick={handleVerify} disabled={loading}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ${
            sessVerified
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
          }`}>
          {sessVerified
            ? <><ShieldCheck className="w-3 h-3" /> Terverifikasi</>
            : <><ShieldOff className="w-3 h-3" /> Tandai Terverifikasi</>
          }
        </button>
      </div>
    </div>
  );
}

function LaporanCard({ item, dosenName, onRead, verifData, tolkData, onVerifChange }) {
  const badge = getCategoryBadgeStyle(item.category);
  const isVerified = verifData?.[item.nim]?.[item.week]?.verified;
  const penolakanInfo = tolkData?.[item.nim]?.[item.week];
  const isTolak = !!penolakanInfo;
  const isResubmitted = isTolak && item.submittedAt && penolakanInfo?.at &&
    new Date(item.submittedAt) > new Date(penolakanInfo.at);

  const [showTolakForm, setShowTolakForm] = useState(false);
  const [alasan, setAlasan] = useState('');

  useEffect(() => {
    if (!item.read) onRead(dosenName, item.nim, item.week);
  }, []);

  const handleCancelTolak = async () => {
    await cancelPenolakan(item.nim, item.week);
    onVerifChange();
  };

  const handleTolakPeriode = async () => {
    if (!alasan.trim()) return;
    await savePenolakan(item.nim, item.week, dosenName, alasan.trim());
    setAlasan('');
    setShowTolakForm(false);
    onVerifChange();
  };

  const hasSessions = item.sessions && item.sessions.length > 0;

  return (
    <div className={`rounded-xl border transition-all ${
      isResubmitted ? 'border-brand-300 bg-brand-50/30' :
      (isTolak && !isResubmitted) ? 'border-red-200 bg-red-50/30' :
      item.read ? 'border-slate-200 bg-white' :
      'border-brand-300 bg-brand-50/40 ring-1 ring-brand-200'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${item.read ? 'bg-slate-300' : 'bg-brand-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">{item.nama}</span>
            <span className="text-xs font-mono text-slate-400">{item.nim}</span>
            {!item.read && (
              <span className="text-[10px] font-bold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded-full">Baru</span>
            )}
            {isVerified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                <ShieldCheck className="w-2.5 h-2.5" /> Terverifikasi
              </span>
            )}
            {isTolak && !isVerified && !isResubmitted && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                <XCircle className="w-2.5 h-2.5" /> Ditolak
              </span>
            )}
            {isResubmitted && !isVerified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">
                <RefreshCw className="w-2.5 h-2.5" /> Diajukan Kembali
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">{item.week}</span>
            {hasSessions && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-indigo-600 font-semibold">{item.sessions.length} sesi bimbingan</span>
              </>
            )}
            {!hasSessions && item.tanggalBimbingan && (
              <>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
                  <CalendarDays className="w-3 h-3" />
                  {new Date(item.tanggalBimbingan + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </>
            )}
            <span className="text-[10px] text-slate-400 ml-auto">{formatDate(item.submittedAt)}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
        {hasSessions ? (
          // New multi-session format: show each session with per-session verify
          <div className="space-y-2">
            {item.sessions.map((sess, si) => (
              <SessionCard
                key={sess.ke || si}
                sess={sess}
                nim={item.nim}
                week={item.week}
                dosenName={dosenName}
                isVerifiedPeriod={isVerified}
                onVerifChange={onVerifChange}
              />
            ))}
          </div>
        ) : (
          // Old format: show period-level info
          <>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progres Periode Ini</span>
              </div>
              <p className="text-sm text-slate-800 font-medium leading-relaxed">{item.progress || <span className="text-slate-400 italic">—</span>}</p>
            </div>
            {item.next && (
              <div className="flex items-start gap-2 bg-brand-50/60 rounded-xl p-3.5 border border-brand-100">
                <ArrowRight className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block mb-0.5">Target Periode Depan</span>
                  <p className="text-sm text-slate-800 font-semibold">{item.next}</p>
                </div>
              </div>
            )}
            {item.dosenHadir?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bimbingan dengan:</span>
                {item.dosenHadir.map(d => (
                  <span key={d.label} className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                    {d.label} · {d.name.split(',')[0]}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Rejection info (period level) */}
        {isTolak && !isResubmitted && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Alasan Penolakan</p>
            <p className="text-xs text-red-800 font-medium leading-relaxed">{penolakanInfo.alasan || '—'}</p>
            <p className="text-[10px] text-red-400">oleh {penolakanInfo.dosenName?.split(',')[0]} · {formatDate(penolakanInfo.at)}</p>
          </div>
        )}
        {isResubmitted && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-brand-600" />
              <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">Mahasiswa Mengajukan Laporan Kembali</p>
            </div>
            <p className="text-xs text-brand-800 font-medium">Laporan baru telah dikirim setelah penolakan sebelumnya.</p>
            <div className="bg-red-50/80 border border-red-100 rounded-lg p-2 space-y-0.5">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Alasan Penolakan Sebelumnya</p>
              <p className="text-xs text-red-700 font-medium">{penolakanInfo.alasan || '—'}</p>
              <p className="text-[10px] text-red-400">oleh {penolakanInfo.dosenName?.split(',')[0]} · {formatDate(penolakanInfo.at)}</p>
            </div>
          </div>
        )}

        {/* Period-level actions (for old-format items without sessions) */}
        {!hasSessions && (
          <>
            {showTolakForm && (
              <div className="space-y-2 bg-red-50/60 border border-red-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Alasan Penolakan</p>
                <textarea
                  value={alasan}
                  onChange={e => setAlasan(e.target.value)}
                  placeholder="Tuliskan alasan penolakan laporan ini..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 bg-white placeholder:text-slate-400 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowTolakForm(false); setAlasan(''); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold">
                    Batal
                  </button>
                  <button onClick={handleTolakPeriode} disabled={!alasan.trim()}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-40">
                    Konfirmasi Tolak
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              {isTolak && !isResubmitted ? (
                <button onClick={handleCancelTolak}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                  <XCircle className="w-3.5 h-3.5" />
                  Batalkan Penolakan
                </button>
              ) : isVerified ? (
                <button
                  onClick={async () => { await cancelVerifikasi(item.nim, item.week); onVerifChange(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Terverifikasi
                </button>
              ) : (
                <>
                  {!showTolakForm && (
                    <button onClick={() => setShowTolakForm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200">
                      <XCircle className="w-3.5 h-3.5" />
                      Tolak
                    </button>
                  )}
                  <button
                    onClick={async () => { await saveVerifikasi(item.nim, item.week, dosenName); onVerifChange(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200">
                    <ShieldOff className="w-3.5 h-3.5" />
                    Tandai Terverifikasi
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LaporanMasukModal({ isOpen, onClose, dosenName }) {
  const [laporan, setLaporan] = useState([]);
  const [verifData, setVerifData] = useState({});
  const [tolkData, setTolkData] = useState({});

  const refreshVerif = async () => {
    const [v, t] = await Promise.all([getVerifikasi(), getPenolakan()]);
    setVerifData(v);
    setTolkData(t);
    // Also reload laporan to get updated sessions (verified_at inline)
    if (dosenName) setLaporan(await getDosenLaporan(dosenName));
  };

  useEffect(() => {
    if (isOpen && dosenName) {
      (async () => {
        setLaporan(await getDosenLaporan(dosenName));
        await refreshVerif();
      })();
    }
  }, [isOpen, dosenName]);

  const handleRead = (name, nim, week) => {
    markDosenLaporanRead(name, nim, week);
    setLaporan(prev => prev.map(r => r.nim === nim && r.week === week ? { ...r, read: true } : r));
  };

  if (!isOpen) return null;

  const unread = laporan.filter(r => !r.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Inbox className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Laporan Masuk</h2>
              <p className="text-xs text-white/70">
                {unread > 0 ? `${unread} laporan belum dibaca` : 'Semua sudah dibaca'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {laporan.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Belum ada laporan masuk</p>
              <p className="text-xs text-slate-400 mt-1">Laporan dari mahasiswa akan muncul di sini</p>
            </div>
          ) : (
            laporan.map((item, i) => (
              <LaporanCard
                key={`${item.nim}-${item.week}-${i}`}
                item={item}
                dosenName={dosenName}
                onRead={handleRead}
                verifData={verifData}
                tolkData={tolkData}
                onVerifChange={refreshVerif}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
