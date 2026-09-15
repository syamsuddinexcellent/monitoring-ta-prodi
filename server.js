import express from 'express';
import cors from 'cors';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const AUTH_DIR = path.join(process.cwd(), 'auth_info_baileys_prodi');

let sock = null;
let currentQR = null;
let isConnected = false;
let connectedPhone = null;
let connectionStatus = 'initializing'; // 'initializing', 'waiting_qr', 'connecting', 'connected', 'disconnected'

// Silent logger for clean console
const logger = pino({ level: 'silent' });

async function initWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger,
      browser: ['Monitoring TA Prodi', 'Chrome', '1.0.0'],
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = await QRCode.toDataURL(qr);
        connectionStatus = 'waiting_qr';
        isConnected = false;
        try {
          const base64Data = currentQR.replace(/^data:image\/png;base64,/, '');
          fs.writeFileSync(path.join(process.cwd(), 'public', 'qr.png'), base64Data, 'base64');
        } catch (e) {
          // ignore
        }
        console.log('📱 QR Code baru siap dipindai dari WhatsApp HP Anda.');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        isConnected = false;
        connectedPhone = null;
        connectionStatus = 'disconnected';
        console.log(`⚠️ Koneksi WhatsApp terputus (Status: ${statusCode}). Mencoba menghubungkan kembali: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {
            console.error('Gagal menghapus sesi lama:', e);
          }
        }

        if (shouldReconnect) {
          setTimeout(initWhatsApp, 3000);
        } else {
          setTimeout(initWhatsApp, 2000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        currentQR = null;
        connectionStatus = 'connected';
        const userJid = sock.user?.id || '';
        connectedPhone = userJid.split(':')[0] || userJid.split('@')[0];
        console.log(`✅ WhatsApp Gateway Prodi BERHASIL TERHUBUNG! Nomor: ${connectedPhone}`);
      }
    });

  } catch (err) {
    console.error('Error saat inisialisasi WhatsApp Gateway:', err);
    setTimeout(initWhatsApp, 5000);
  }
}

// 0. Sync API
app.post('/api/sync', (req, res) => {
  exec('python3 sync_database.py', (err, stdout, stderr) => {
    if (err) {
      console.error('Sync error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    console.log(stdout);
    return res.json({ success: true, message: 'Database berhasil disinkronkan dari Google Sheet!' });
  });
});

// 0b. Offline Database API
app.get('/api/database', (req, res) => {
  const jsonPath = path.join(process.cwd(), 'public', 'fallback_data.json');
  if (fs.existsSync(jsonPath)) {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(jsonPath);
  } else {
    res.status(404).json({ error: 'Database offline belum tersedia.' });
  }
});

// 1. Status API
app.get('/api/wa/status', (req, res) => {
  res.json({
    status: connectionStatus,
    isConnected,
    connectedPhone,
    qr: currentQR
  });
});

// Helper to format JID
function formatJid(phone) {
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '628' + clean.slice(1);
  }
  return `${clean}@s.whatsapp.net`;
}

// 2. Send Single Message API
app.post('/api/wa/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ success: false, error: 'Nomor telepon dan pesan wajib diisi.' });
  }

  if (!isConnected || !sock) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp Gateway belum terhubung. Silakan pindai QR Code terlebih dahulu di dashboard.'
    });
  }

  try {
    const jid = formatJid(phone);
    const sent = await sock.sendMessage(jid, { text: message });
    return res.json({
      success: true,
      messageId: sent.key.id,
      recipient: jid,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Gagal mengirim pesan WA:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Gagal mengirim pesan WhatsApp.'
    });
  }
});

// 3. Send Message to WhatsApp Group API
app.post('/api/wa/send-group', async (req, res) => {
  const { inviteCode, message } = req.body;

  if (!inviteCode || !message) {
    return res.status(400).json({ success: false, error: 'Kode undangan grup dan pesan wajib diisi.' });
  }

  if (!isConnected || !sock) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp Gateway belum terhubung. Silakan pindai QR Code terlebih dahulu.'
    });
  }

  try {
    const cleanCode = inviteCode.replace(/https:\/\/chat\.whatsapp\.com\//g, '').split('?')[0].trim();
    let groupJid = null;

    try {
      const inviteInfo = await sock.groupGetInviteInfo(cleanCode);
      if (inviteInfo?.id) {
        groupJid = inviteInfo.id.includes('@g.us') ? inviteInfo.id : `${inviteInfo.id}@g.us`;
      }
    } catch (e) {
      console.log('groupGetInviteInfo note:', e.message);
    }

    if (!groupJid) {
      try {
        const joinResult = await sock.groupAcceptInvite(cleanCode);
        if (joinResult) {
          groupJid = joinResult.includes('@g.us') ? joinResult : `${joinResult}@g.us`;
        }
      } catch (e) {
        console.log('groupAcceptInvite note:', e.message);
      }
    }

    if (!groupJid) {
      const participating = await sock.groupFetchAllParticipating();
      const groups = Object.values(participating);
      if (groups.length > 0) {
        groupJid = groups[0].id;
      }
    }

    if (!groupJid) {
      return res.status(400).json({
        success: false,
        error: 'Tidak dapat mengidentifikasi grup WhatsApp dari link undangan tersebut.'
      });
    }

    const sent = await sock.sendMessage(groupJid, { text: message });
    return res.json({
      success: true,
      messageId: sent.key.id,
      groupJid,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Gagal mengirim pesan ke grup WA:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Gagal mengirim pesan ke grup WhatsApp.'
    });
  }
});

// 4. Send Bulk Message API
app.post('/api/wa/send-bulk', async (req, res) => {
  const { targets } = req.body;

  if (!Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ success: false, error: 'Daftar penerima (targets) kosong.' });
  }

  if (!isConnected || !sock) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp Gateway belum terhubung. Silakan pindai QR Code terlebih dahulu.'
    });
  }

  const results = [];

  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    try {
      const jid = formatJid(item.phone);
      await sock.sendMessage(jid, { text: item.message });
      results.push({
        phone: item.phone,
        name: item.name,
        nim: item.nim,
        success: true
      });
    } catch (err) {
      results.push({
        phone: item.phone,
        name: item.name,
        nim: item.nim,
        success: false,
        error: err.message
      });
    }

    if (i < targets.length - 1) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  res.json({
    success: true,
    total: targets.length,
    sentCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
    results
  });
});

// 5. Logout API
app.post('/api/wa/logout', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch (err) {
    // ignore
  }

  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }

  isConnected = false;
  connectedPhone = null;
  currentQR = null;
  connectionStatus = 'initializing';

  setTimeout(initWhatsApp, 1500);

  res.json({ success: true, message: 'Berhasil keluar dari sesi WhatsApp.' });
});

// Serve static build from dist and assets from public
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(path.join(process.cwd(), 'public')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Gateway Prodi Server berjalan di http://localhost:${PORT}`);
  initWhatsApp();
});
