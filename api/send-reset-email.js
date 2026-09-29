import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, resetLink, userName } = req.body;
  if (!email || !resetLink) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const name = userName || email.split('@')[0];

  try {
    await transporter.sendMail({
      from: `"Monitoring TA Prodi Sains Data" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Password – Monitoring TA Prodi Sains Data',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
          <div style="background:#4f46e5;border-radius:10px;padding:24px 28px;margin-bottom:24px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Reset Password</h1>
            <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;">Monitoring Tugas Akhir Prodi Sains Data</p>
          </div>
          <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e2e8f0;">
            <p style="color:#374151;margin:0 0 12px;">Halo <strong>${name}</strong>,</p>
            <p style="color:#6b7280;line-height:1.6;margin:0 0 24px;">
              Kami menerima permintaan reset password untuk akun Anda. Klik tombol di bawah untuk membuat password baru:
            </p>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${resetLink}"
                style="display:inline-block;padding:13px 32px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
                Buat Password Baru
              </a>
            </div>
            <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0 0 8px;">
              Link berlaku selama <strong>1 jam</strong>. Jika Anda tidak meminta reset password, abaikan email ini — password Anda tidak akan berubah.
            </p>
            <p style="color:#9ca3af;font-size:11px;word-break:break-all;margin:0;">
              Atau salin tautan ini ke browser: <a href="${resetLink}" style="color:#4f46e5;">${resetLink}</a>
            </p>
          </div>
          <p style="text-align:center;color:#d1d5db;font-size:11px;margin-top:16px;">
            Prodi Sains Data · Institut Teknologi Sumatera
          </p>
        </div>
      `,
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: 'Gagal mengirim email. Cek konfigurasi SMTP.' });
  }
}
