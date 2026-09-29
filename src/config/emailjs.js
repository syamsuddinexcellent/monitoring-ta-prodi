// EmailJS configuration
// Setup: https://www.emailjs.com/
// 1. Buat akun di emailjs.com (gratis 200 email/bulan)
// 2. Tambahkan Email Service (Gmail, Outlook, dll.) → catat SERVICE_ID
// 3. Buat Email Template dengan variabel: {{to_email}}, {{otp_code}}, {{user_name}}
//    Contoh isi template:
//      Subject: Reset Password - Monitoring TA Prodi Sains Data
//      Body: Kode reset password Anda: {{otp_code}} (berlaku 10 menit)
//    Catat TEMPLATE_ID
// 4. Pergi ke Account → catat PUBLIC_KEY

export const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';   // ← ganti
export const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';  // ← ganti
export const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';   // ← ganti
