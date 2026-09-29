// EmailJS configuration
// Setup: https://www.emailjs.com/
// 1. Buat akun di emailjs.com (gratis 200 email/bulan)
// 2. Tambahkan Email Service (Gmail/Outlook) → catat SERVICE_ID
// 3. Buat Email Template dengan variabel berikut:
//      To email : {{to_email}}
//      Subject  : Reset Password - Monitoring TA Prodi Sains Data
//      Body     :
//        Halo {{user_name}},
//        Klik tautan berikut untuk mereset password Anda (berlaku 1 jam):
//        {{reset_link}}
//        Jika Anda tidak meminta reset password, abaikan email ini.
//    Catat TEMPLATE_ID
// 4. Pergi ke Account → API Keys → catat PUBLIC_KEY

export const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';   // ← ganti
export const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';  // ← ganti
export const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';   // ← ganti
