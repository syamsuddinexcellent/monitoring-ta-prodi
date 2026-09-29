import React, { useState, useMemo } from 'react';
import { Lock, X, Eye, EyeOff, ShieldCheck, AlertCircle, UserPlus, LogIn, Mail, Search, GraduationCap, BookOpen, KeyRound, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { send as emailjsSend, init as emailjsInit } from '@emailjs/browser';
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from '../config/emailjs';
import { STUDENT_NIM_MAP } from '../utils/studentDatabase';

const ADMIN_USER = 'datascience@itera.ac.id';
const ADMIN_PASS_B64 = btoa('prodi2026');

// Email → Nama lengkap di sistem (untuk auto-filter mahasiswa bimbingan)
const LECTURER_EMAIL_MAP = {
  'yoga.sukma@sd.itera.ac.id':             'Yoga Aji Sukma, S.Mat., M.Stat.',
  'ade.lailani@sd.itera.ac.id':            'Ade Lailani, S.Si., M.Si.',
  'ahmadluky@sd.itera.ac.id':              'Ahmad Luky Ramdani, S.Komp., M.Kom.',
  'arbi.julianto@staff.itera.ac.id':       'Arbi Julianto, S.Tr.T',
  'ardika.satria@sd.itera.ac.id':          'Ardika Satria, S.Si., M.Si.',
  'christyan.nadeak@sd.itera.ac.id':       'Christyan Tamaro Nadeak, S.Si., M.Si.',
  'dewi.setiawan@sd.itera.ac.id':          'Dewi Indra Setiawan, S.Si., M.Si.',
  'dimas.randa@sd.itera.ac.id':            'Dimas Dwi Randa, S.Kom., M.Kom.',
  'koordinator.ta@itera.ac.id':            'Dr. Koordinator TA',
  'fajri.farid@sd.itera.ac.id':            'Fajri Farid, S.Si., M.Sc.',
  'febri.dwi@sd.itera.ac.id':              'Febri Dwi Irawati, S.Si., M.Si.',
  'fitri.nurjanah@sd.itera.ac.id':         'Fitri Nurjanah, S.Si., M.Mat.',
  'indah.suciati@sd.itera.ac.id':          'Indah Suciati, S.Mat., M.Mat.',
  'ira.safitri@sd.itera.ac.id':            'Ira Safitri, S.Si., M.Si., M.Sc.',
  'linda.rassiyanti@sd.itera.ac.id':       'Linda Rassiyanti, S.Si., M.Si.',
  'luluk.muthoharoh@sd.itera.ac.id':       'Luluk Muthoharoh, S.Si., M.Si.',
  'syamsuddin.wisnubroto@sd.itera.ac.id':  'M. Syamsuddin Wisnubroto, S.Si., M.Si.',
  'mika.alvionita@sd.itera.ac.id':         'Mika Alvionita S, S.Si., M.Si.',
  'rian.kurnia@sd.itera.ac.id':            'Rian Kurnia, S.Si., M.Si.',
  'rohmi.astuti@sd.itera.ac.id':           'Rohmi Dyah Astuti, S.Si., M.Cs.',
  'tirta.setiawan@sd.itera.ac.id':         'Tirta Setiawan, S.Pd., M.Si.',
  'vina.nurmadani@sd.itera.ac.id':         'Vina Nurmadani, S.Mat., M.Si.',
  'yuliana@sd.itera.ac.id':               'Yuliana, S.Pd., M.Cs.',
  'yusni.lestari@sd.itera.ac.id':          'Yusni Puspha Lestari, S.T., M.Si.',
  'yustida.bellini@sd.itera.ac.id':        'Yustida Bellini, S.Kom., M.Kom.',
};

const DOSEN_DOMAINS = ['sd.itera.ac.id', 'staff.itera.ac.id', 'itera.ac.id'];
const STUDENT_DOMAIN = 'student.itera.ac.id';

function classifyEmail(email) {
  const lower = email.toLowerCase();
  const domain = lower.split('@')[1] || '';
  if (domain === STUDENT_DOMAIN) return 'mahasiswa';
  if (DOSEN_DOMAINS.includes(domain)) return 'dosen';
  return null;
}

function getStoredUsers() {
  try { return JSON.parse(localStorage.getItem('app_users') || '[]'); } catch { return []; }
}
function saveStoredUsers(users) {
  try { localStorage.setItem('app_users', JSON.stringify(users)); } catch {}
}

export function loginWithCredentials(identifier, password) {
  if (identifier === ADMIN_USER && btoa(password) === ADMIN_PASS_B64) {
    return { role: 'admin', email: 'admin', name: 'Administrator', lecturerName: '' };
  }
  const users = getStoredUsers();
  const found = users.find(u => u.email === identifier.toLowerCase() && u.passwordHash === btoa(password));
  if (found) return { role: found.role || 'user', email: found.email, name: found.name, lecturerName: found.lecturerName || '' };
  return null;
}

export function registerUser(email, password, overrideName = null, overrideRole = null) {
  if (!email.trim() || !password) return { error: 'Semua field wajib diisi.' };
  const emailLower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) return { error: 'Format email tidak valid.' };
  const role = overrideRole || classifyEmail(emailLower);
  if (!role) {
    return { error: 'Hanya email ITERA yang diizinkan (@sd.itera.ac.id, @student.itera.ac.id, dll.).' };
  }
  if (password.length < 6) return { error: 'Password minimal 6 karakter.' };
  const users = getStoredUsers();
  if (users.some(u => u.email === emailLower)) return { error: 'Email sudah terdaftar.' };
  const lecturerName = LECTURER_EMAIL_MAP[emailLower] || '';
  const name = overrideName || emailLower.split('@')[0];
  users.push({ email: emailLower, name, role, lecturerName, passwordHash: btoa(password) });
  saveStoredUsers(users);
  return { success: true };
}

export function resetPassword(email, newPassword) {
  const emailLower = email.trim().toLowerCase();
  if (!emailLower || !newPassword) return { error: 'Semua field wajib diisi.' };
  if (newPassword.length < 6) return { error: 'Password minimal 6 karakter.' };
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.email === emailLower);
  if (idx === -1) return { error: 'Email tidak ditemukan. Pastikan Anda sudah mendaftar.' };
  users[idx].passwordHash = btoa(newPassword);
  saveStoredUsers(users);
  return { success: true, name: users[idx].name };
}

// Reset token helpers (stored in localStorage so link works across sessions)
function getResetTokens() {
  try { return JSON.parse(localStorage.getItem('reset_tokens') || '[]'); } catch { return []; }
}
function storeResetToken(email, token) {
  const expiry = Date.now() + 60 * 60 * 1000; // 1 jam
  const active = getResetTokens().filter(t => t.email !== email && t.expiry > Date.now());
  active.push({ token, email, expiry });
  localStorage.setItem('reset_tokens', JSON.stringify(active));
}
export function validateResetToken(token) {
  return getResetTokens().find(t => t.token === token && t.expiry > Date.now()) || null;
}
export function consumeResetToken(token) {
  localStorage.setItem('reset_tokens', JSON.stringify(
    getResetTokens().filter(t => t.token !== token)
  ));
}
function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildNimToName() {
  const map = {};
  for (const [name, nim] of Object.entries(STUDENT_NIM_MAP)) {
    map[nim] = name.replace(/\b\w/g, c => c.toUpperCase());
  }
  return map;
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

export default function AuthModal({ isOpen, onClose, onSuccess, resetToken = null }) {
  const [tab, setTab] = useState('login');
  const [regRole, setRegRole] = useState('dosen');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Mahasiswa-specific
  const [regNim, setRegNim] = useState('');
  const [regFoundName, setRegFoundName] = useState('');
  const [regNimError, setRegNimError] = useState('');

  // Forgot password
  // If resetToken prop provided (from URL), resolve email immediately
  const tokenData = resetToken ? validateResetToken(resetToken) : null;
  const [forgotEmail, setForgotEmail] = useState(tokenData?.email || '');
  const [forgotStep, setForgotStep] = useState(tokenData ? 2 : 1); // 1=enter email, 2=set new password
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotError, setForgotError] = useState(
    resetToken && !tokenData ? 'Link reset sudah kedaluwarsa atau tidak valid. Silakan minta link baru.' : ''
  );
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const nimToName = useMemo(() => buildNimToName(), []);

  if (!isOpen) return null;

  // Live preview: show detected name while typing (dosen)
  const regEmailLower = regEmail.trim().toLowerCase();
  const detectedName = LECTURER_EMAIL_MAP[regEmailLower];
  const detectedRole = classifyEmail(regEmailLower);

  const resetForgot = () => {
    setForgotEmail(''); setForgotStep(1);
    setForgotNewPass(''); setForgotConfirm('');
    setForgotError(''); setForgotSuccess('');
  };

  const handleClose = () => {
    setLoginEmail(''); setLoginPassword(''); setLoginError('');
    setRegEmail(''); setRegPassword(''); setRegConfirm('');
    setRegError(''); setRegSuccess('');
    setRegNim(''); setRegFoundName(''); setRegNimError('');
    resetForgot();
    setTab('login');
    onClose();
  };

  const sendResetLink = async (email) => {
    const users = getStoredUsers();
    const found = users.find(u => u.email === email);
    if (!found) return { error: 'Email tidak terdaftar di sistem. Silakan daftar akun baru.' };
    const token = generateToken();
    storeResetToken(email, token);
    const resetLink = `${window.location.origin}/?reset_token=${token}`;
    emailjsInit(EMAILJS_PUBLIC_KEY);
    await emailjsSend(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: email,
      user_name: found.name || email.split('@')[0],
      reset_link: resetLink,
    });
    return { success: true };
  };

  const handleForgotStep1 = async (e) => {
    e.preventDefault();
    setForgotError('');
    const email = forgotEmail.trim().toLowerCase();
    if (!email) { setForgotError('Masukkan email Anda.'); return; }
    setForgotLoading(true);
    try {
      const result = await sendResetLink(email);
      if (result.error) { setForgotError(result.error); }
      else { setForgotStep(2); }
    } catch {
      setForgotError('Gagal mengirim email. Periksa koneksi internet atau konfigurasi EmailJS.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotStep2 = (e) => {
    e.preventDefault();
    setForgotError('');
    if (forgotNewPass !== forgotConfirm) { setForgotError('Password tidak cocok.'); return; }
    setForgotLoading(true);
    setTimeout(() => {
      const result = resetPassword(forgotEmail, forgotNewPass);
      if (result.error) { setForgotError(result.error); }
      else {
        if (resetToken) consumeResetToken(resetToken);
        setForgotSuccess('Password berhasil direset. Silakan login dengan password baru.');
        setTimeout(() => { resetForgot(); setTab('login'); }, 2000);
      }
      setForgotLoading(false);
    }, 400);
  };

  const handleResendLink = async () => {
    setForgotError('');
    setForgotLoading(true);
    try {
      const result = await sendResetLink(forgotEmail.trim().toLowerCase());
      if (result.error) setForgotError(result.error);
      else setForgotError('');
    } catch {
      setForgotError('Gagal mengirim ulang. Coba lagi.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleNimSearch = () => {
    const nim = regNim.trim();
    if (!nim) { setRegNimError('Masukkan NIM terlebih dahulu.'); return; }
    const found = nimToName[nim];
    if (found) {
      setRegFoundName(found);
      setRegNimError('');
    } else {
      setRegFoundName('');
      setRegNimError('NIM tidak ditemukan dalam database mahasiswa Prodi Sains Data.');
    }
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
    if (regRole === 'mahasiswa' && !regFoundName) {
      setRegError('Cari NIM terlebih dahulu untuk memverifikasi data mahasiswa.'); return;
    }
    const overrideName = regRole === 'mahasiswa' ? regFoundName : null;
    setRegLoading(true);
    setTimeout(() => {
      const result = registerUser(regEmail, regPassword, overrideName, regRole);
      if (result.error) { setRegError(result.error); }
      else {
        setRegSuccess('Akun berhasil dibuat! Silakan login.');
        setRegEmail(''); setRegPassword(''); setRegConfirm('');
        setRegNim(''); setRegFoundName(''); setRegNimError('');
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
                  {tab === 'login' ? 'Masuk' : tab === 'register' ? 'Daftar Akun' : 'Reset Password'}
                </h2>
                <p className="text-xs text-white/70">Monitoring TA Prodi Sains Data</p>
              </div>
            </div>
            <button onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {tab !== 'forgot' && (
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
          )}
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
                  placeholder="Email ITERA"
                  autoFocus
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button type="button"
                  onClick={() => { setTab('forgot'); setForgotEmail(loginEmail.trim()); }}
                  className="text-[11px] text-brand-600 hover:underline font-medium">
                  Lupa password?
                </button>
              </div>
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

        {/* Forgot Password Form */}
        {tab === 'forgot' && (
          <div className="px-6 py-5 space-y-4">
            <button type="button" onClick={() => { resetForgot(); setTab('login'); }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke halaman masuk
            </button>

            {forgotError && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {forgotSuccess}
              </div>
            )}

            {/* Step 1: enter email → send link */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotStep1} className="space-y-4">
                <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
                  Masukkan email ITERA yang terdaftar. Kami akan mengirimkan link reset password ke email tersebut.
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email terdaftar</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="nama@sd.itera.ac.id"
                      autoFocus
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <button type="submit" disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg transition-all shadow-sm">
                  {forgotLoading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" />Mengirim link...</>
                    : <><Mail className="w-4 h-4" />Kirim Link Reset Password</>
                  }
                </button>
              </form>
            )}

            {/* Step 1 success: link sent */}
            {forgotStep === 2 && !resetToken && !forgotSuccess && (
              <div className="space-y-4">
                <div className="px-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="font-semibold">Link reset dikirim!</p>
                  <p className="text-xs text-emerald-700">
                    Cek email <span className="font-semibold">{forgotEmail}</span> dan klik link di dalamnya. Berlaku 1 jam.
                  </p>
                  <p className="text-[11px] text-emerald-600">Jika tidak ada di kotak masuk, periksa folder <span className="font-semibold">Spam</span>.</p>
                </div>
                <button type="button" onClick={handleResendLink} disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-600 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-lg transition-colors disabled:opacity-50">
                  {forgotLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Kirim ulang link
                </button>
              </div>
            )}

            {/* Step 2: set new password (after clicking link from email) */}
            {forgotStep === 2 && resetToken && !forgotSuccess && (
              <form onSubmit={handleForgotStep2} className="space-y-3">
                <div className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Link terverifikasi untuk <span className="font-semibold">{forgotEmail}</span>. Buat password baru di bawah.</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password baru</label>
                  <PasswordInput value={forgotNewPass} onChange={e => setForgotNewPass(e.target.value)} placeholder="Min. 6 karakter" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Konfirmasi password baru</label>
                  <PasswordInput value={forgotConfirm} onChange={e => setForgotConfirm(e.target.value)} placeholder="Ulangi password baru" />
                </div>
                <button type="submit" disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg transition-all shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {forgotLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="px-6 py-5 space-y-3">
            {/* Role selector */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button type="button"
                onClick={() => { setRegRole('dosen'); setRegEmail(''); setRegNim(''); setRegFoundName(''); setRegNimError(''); setRegError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  regRole === 'dosen' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <BookOpen className="w-3.5 h-3.5" />
                Dosen
              </button>
              <button type="button"
                onClick={() => { setRegRole('mahasiswa'); setRegEmail(''); setRegNim(''); setRegFoundName(''); setRegNimError(''); setRegError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  regRole === 'mahasiswa' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <GraduationCap className="w-3.5 h-3.5" />
                Mahasiswa
              </button>
            </div>

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

            {/* ── DOSEN FIELDS ── */}
            {regRole === 'dosen' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email ITERA</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="nama@sd.itera.ac.id"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 placeholder:text-slate-400"
                  />
                </div>
                {regEmailLower.includes('@') && detectedRole && (
                  <div className={`mt-2 px-3 py-2 rounded-lg text-xs flex items-start gap-2 ${
                    detectedName
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      {detectedName ? (
                        <>
                          <span className="font-semibold">Dosen terdeteksi:</span>{' '}
                          <span>{detectedName}</span>
                          <div className="text-emerald-600 mt-0.5 text-[11px]">
                            Filter mahasiswa bimbingan akan aktif otomatis saat login
                          </div>
                        </>
                      ) : (
                        <span className="font-medium capitalize">{detectedRole} ITERA terdeteksi</span>
                      )}
                    </div>
                  </div>
                )}
                {regEmailLower.includes('@') && !detectedRole && (
                  <p className="mt-1.5 text-[11px] text-red-500">Hanya email ITERA yang diterima</p>
                )}
              </div>
            )}

            {/* ── MAHASISWA FIELDS ── */}
            {regRole === 'mahasiswa' && (
              <div className="space-y-3">
                <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
                  Cari NIM terlebih dahulu. Setelah nama ditemukan, masukkan email mahasiswa ITERA dengan format{' '}
                  <span className="font-bold text-slate-800">nama.nim@student.itera.ac.id</span>.
                </div>

                {/* NIM search */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">NIM</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={regNim}
                      onChange={e => { setRegNim(e.target.value); setRegNimError(''); setRegFoundName(''); }}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleNimSearch())}
                      placeholder="Contoh: 121450007"
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 placeholder:text-slate-400"
                    />
                    <button type="button" onClick={handleNimSearch}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shrink-0">
                      <Search className="w-3.5 h-3.5" />
                      Cari
                    </button>
                  </div>
                  {regNimError && (
                    <p className="mt-1.5 text-[11px] text-red-500">{regNimError}</p>
                  )}
                </div>

                {/* Found name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama mahasiswa</label>
                  <input
                    type="text"
                    value={regFoundName}
                    readOnly
                    placeholder="Nama muncul setelah NIM ditemukan"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-700 placeholder:text-slate-400 cursor-default"
                  />
                </div>

                {/* Student email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email mahasiswa ITERA</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="nama.nim@student.itera.ac.id"
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 placeholder:text-slate-400"
                    />
                  </div>
                  {regFoundName && regNim && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Saran: <button type="button"
                        className="text-brand-600 hover:underline font-medium"
                        onClick={() => setRegEmail(`${regFoundName.toLowerCase().replace(/\s+/g, '.')}.${regNim}@student.itera.ac.id`)}>
                        {regFoundName.toLowerCase().replace(/\s+/g, '.')}.{regNim}@student.itera.ac.id
                      </button>
                    </p>
                  )}
                </div>
              </div>
            )}

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
