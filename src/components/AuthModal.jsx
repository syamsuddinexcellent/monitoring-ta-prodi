import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff, ShieldCheck, AlertCircle, UserPlus, LogIn, Mail } from 'lucide-react';

const ADMIN_USER = 'admin';
const ADMIN_PASS_B64 = btoa('prodi2026');

function getStoredUsers() {
  try { return JSON.parse(localStorage.getItem('app_users') || '[]'); } catch { return []; }
}
function saveStoredUsers(users) {
  try { localStorage.setItem('app_users', JSON.stringify(users)); } catch {}
}

export function loginWithCredentials(identifier, password) {
  // Check admin (by username "admin")
  if (identifier === ADMIN_USER && btoa(password) === ADMIN_PASS_B64) {
    return { role: 'admin', email: 'admin', name: 'Administrator' };
  }
  // Check registered users by email
  const users = getStoredUsers();
  const found = users.find(u => u.email === identifier.toLowerCase() && u.passwordHash === btoa(password));
  if (found) return { role: found.role || 'user', email: found.email, name: found.name };
  return null;
}

const ALLOWED_DOMAINS = ['sd.itera.ac.id', 'student.itera.ac.id'];

export function registerUser(email, password) {
  if (!email.trim() || !password) return { error: 'Semua field wajib diisi.' };
  const emailLower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) return { error: 'Format email tidak valid.' };
  const domain = emailLower.split('@')[1];
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return { error: 'Hanya email @sd.itera.ac.id (dosen) atau @student.itera.ac.id (mahasiswa) yang diizinkan.' };
  }
  if (password.length < 6) return { error: 'Password minimal 6 karakter.' };
  const users = getStoredUsers();
  if (users.some(u => u.email === emailLower)) return { error: 'Email sudah terdaftar.' };
  const role = domain === 'sd.itera.ac.id' ? 'dosen' : 'mahasiswa';
  users.push({ email: emailLower, name: emailLower.split('@')[0], role, passwordHash: btoa(password) });
  saveStoredUsers(users);
  return { success: true };
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState('login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setLoginEmail(''); setLoginPassword(''); setLoginError('');
    setRegEmail(''); setRegPassword(''); setRegConfirm('');
    setRegError(''); setRegSuccess('');
    onClose();
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    setTimeout(() => {
      const result = loginWithCredentials(loginEmail.trim(), loginPassword);
      if (result) {
        try { sessionStorage.setItem('auth_session', JSON.stringify(result)); } catch {}
        onSuccess(result);
        handleClose();
      } else {
        setLoginError('Email atau password salah.');
      }
      setLoginLoading(false);
    }, 400);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setRegError(''); setRegSuccess('');
    if (regPassword !== regConfirm) { setRegError('Password tidak cocok.'); return; }
    setRegLoading(true);
    setTimeout(() => {
      const result = registerUser(regEmail, regPassword);
      if (result.error) { setRegError(result.error); }
      else {
        setRegSuccess('Akun berhasil dibuat! Silakan login.');
        setRegEmail(''); setRegPassword(''); setRegConfirm('');
        setTimeout(() => setTab('login'), 1200);
      }
      setRegLoading(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {tab === 'login' ? 'Masuk' : 'Daftar Akun'}
                </h2>
                <p className="text-xs text-white/70">Monitoring TA Prodi Sains Data</p>
              </div>
            </div>
            <button onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-white/10 rounded-lg p-1">
            <button onClick={() => setTab('login')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'login' ? 'bg-white text-brand-700 shadow-sm' : 'text-white/80 hover:text-white'
              }`}>
              <LogIn className="w-3.5 h-3.5" />
              Masuk
            </button>
            <button onClick={() => setTab('register')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'register' ? 'bg-white text-brand-700 shadow-sm' : 'text-white/80 hover:text-white'
              }`}>
              <UserPlus className="w-3.5 h-3.5" />
              Daftar
            </button>
          </div>
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="px-6 py-5 space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="Email atau username admin"
                  autoFocus
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <PasswordInput value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Masukkan password" />
            </div>
            <button type="submit" disabled={loginLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg transition-all shadow-sm">
              <Lock className="w-4 h-4" />
              {loginLoading ? 'Memverifikasi...' : 'Masuk'}
            </button>
            <p className="text-center text-xs text-slate-500">
              Belum punya akun?{' '}
              <button type="button" onClick={() => setTab('register')} className="text-brand-600 font-semibold hover:underline">
                Daftar di sini
              </button>
            </p>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="px-6 py-5 space-y-3">
            {regError && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {regError}
              </div>
            )}
            {regSuccess && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {regSuccess}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="nama@sd.itera.ac.id atau @student.itera.ac.id"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 placeholder:text-slate-400"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Dosen: <span className="font-medium text-slate-500">@sd.itera.ac.id</span>
                {' · '}
                Mahasiswa: <span className="font-medium text-slate-500">@student.itera.ac.id</span>
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <PasswordInput value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Min. 6 karakter" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Konfirmasi Password</label>
              <PasswordInput value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Ulangi password" />
            </div>
            <button type="submit" disabled={regLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-all shadow-sm">
              <UserPlus className="w-4 h-4" />
              {regLoading ? 'Mendaftarkan...' : 'Daftar Akun'}
            </button>
            <p className="text-center text-xs text-slate-500">
              Sudah punya akun?{' '}
              <button type="button" onClick={() => setTab('login')} className="text-brand-600 font-semibold hover:underline">
                Masuk di sini
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
