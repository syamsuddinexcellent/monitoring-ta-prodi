import React, { useState, useEffect } from 'react';
import { X, Inbox, CheckCircle2, Clock, ArrowRight, BookOpen, Users, ChevronDown, ChevronUp, ShieldCheck, ShieldOff } from 'lucide-react';
import { getDosenLaporan, markDosenLaporanRead } from './LaporanModal';
import { getCategoryBadgeStyle } from '../utils/helpers';
import { getVerifikasi, saveVerifikasi, cancelVerifikasi } from '../utils/exportUtils';

function formatDate(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function LaporanCard({ item, dosenName, onRead, verifData, onVerifChange }) {
  const [expanded, setExpanded] = useState(false);
  const badge = getCategoryBadgeStyle(item.category);
  const isVerified = verifData?.[item.nim]?.[item.week]?.verified;

  const handleExpand = () => {
    if (!item.read) onRead(dosenName, item.nim, item.week);
    setExpanded(v => !v);
  };

  const handleVerify = () => {
    if (isVerified) {
      cancelVerifikasi(item.nim, item.week);
    } else {
      saveVerifikasi(item.nim, item.week, dosenName);
    }
    onVerifChange();
  };

  return (
    <div className={`rounded-xl border transition-all ${item.read ? 'border-slate-200 bg-white' : 'border-brand-300 bg-brand-50/40 ring-1 ring-brand-200'}`}>
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${item.read ? 'bg-slate-300' : 'bg-brand-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">{item.nama}</span>
            <span className="text-xs font-mono text-slate-400">{item.nim}</span>
            {!item.read && (
              <span className="text-[10px] font-bold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded-full">Baru</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">{item.week}</span>
            <span className="text-slate-300">·</span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {item.category}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-1">
          {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" title="Terverifikasi" />}
          <span className="text-[10px] text-slate-400 hidden sm:block">{formatDate(item.submittedAt)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {/* Progres */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progres Periode Ini</span>
            </div>
            <p className="text-sm text-slate-800 font-medium leading-relaxed">{item.progress}</p>
          </div>

          {/* Target */}
          {item.next && (
            <div className="flex items-start gap-2 bg-brand-50/60 rounded-xl p-3.5 border border-brand-100">
              <ArrowRight className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block mb-0.5">Target Periode Depan</span>
                <p className="text-sm text-slate-800 font-semibold">{item.next}</p>
              </div>
            </div>
          )}

          {/* Dosen hadir */}
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

          {/* Verifikasi */}
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-slate-400">
              Dikirim {formatDate(item.submittedAt)}
            </div>
            <button
              onClick={handleVerify}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                isVerified
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200'
              }`}
            >
              {isVerified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
              {isVerified ? 'Terverifikasi' : 'Tandai Terverifikasi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LaporanMasukModal({ isOpen, onClose, dosenName }) {
  const [laporan, setLaporan] = useState([]);
  const [verifData, setVerifData] = useState({});

  const refreshVerif = () => setVerifData(getVerifikasi());

  useEffect(() => {
    if (isOpen && dosenName) {
      setLaporan(getDosenLaporan(dosenName));
      refreshVerif();
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
                onVerifChange={refreshVerif}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
