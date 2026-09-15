/**
 * Helper utilities for Monitoring Tugas Akhir Prodi Sains Data
 */

export function getAngkatan(nim, defaultVal = '2022') {
  if (!nim) return defaultVal;
  const clean = String(nim).trim();
  if (clean.startsWith('120')) return '2020';
  if (clean.startsWith('121')) return '2021';
  if (clean.startsWith('122')) return '2022';
  if (clean.startsWith('123')) return '2023';
  if (clean.startsWith('124')) return '2024';
  if (clean.length >= 3 && clean.startsWith('1')) {
    return `20${clean.substring(1, 3)}`;
  }
  return defaultVal;
}

export function cleanPhoneNumber(raw) {
  if (!raw) return '';
  let clean = String(raw).replace(/\D/g, '');
  if (!clean) return '';

  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '628' + clean.slice(1);
  }
  return clean;
}

export function formatPhoneDisplay(raw) {
  const clean = cleanPhoneNumber(raw);
  if (!clean) return '-';

  if (clean.startsWith('62')) {
    const local = clean.slice(2);
    if (local.length >= 9) {
      return `+62 ${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    }
    return `+62 ${local}`;
  }
  return clean;
}

export function getDirectWhatsAppUrl(phone, text = '') {
  const clean = cleanPhoneNumber(phone);
  const encoded = encodeURIComponent(text);
  if (clean) {
    return `https://api.whatsapp.com/send?phone=${clean}&text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}

export function detectCategory(text) {
  if (!text || text.trim() === '') return 'Belum Lapor';
  const lower = text.toLowerCase();

  if (lower.includes('koding') || lower.includes('coding') || lower.includes('aplikasi') || lower.includes('sistem') || lower.includes('model') || lower.includes('cnn') || lower.includes('lstm') || lower.includes('bigru') || lower.includes('algoritma')) {
    return 'Coding / Implementasi';
  }
  if (lower.includes('bab 4') || lower.includes('bab iv') || lower.includes('bab 5') || lower.includes('bab v') || lower.includes('naskah') || lower.includes('analisis') || lower.includes('pembahasan') || lower.includes('laporan')) {
    return 'Penulisan Naskah / Bab 4-5';
  }
  if (lower.includes('sempro') || lower.includes('seminar proposal')) {
    return 'Seminar Proposal (Sempro)';
  }
  if (lower.includes('proposal') || lower.includes('bap') || lower.includes('bab 1') || lower.includes('bab 2') || lower.includes('bab 3')) {
    return 'BAP / Draft Proposal';
  }
  if (lower.includes('semhas') || lower.includes('sidang') || lower.includes('pendadaran') || lower.includes('yudisium') || lower.includes('lulus')) {
    return 'Seminar Hasil / Sidang';
  }
  return 'Lainnya';
}

export function getCategoryBadgeStyle(category) {
  switch (category) {
    case 'Coding / Implementasi':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        hex: '#3b82f6'
      };
    case 'Penulisan Naskah / Bab 4-5':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
        hex: '#a855f7'
      };
    case 'Seminar Proposal (Sempro)':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        hex: '#10b981'
      };
    case 'BAP / Draft Proposal':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        hex: '#f59e0b'
      };
    case 'Seminar Hasil / Sidang':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        border: 'border-teal-200',
        dot: 'bg-teal-500',
        hex: '#14b8a6'
      };
    case 'Belum Lapor':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        hex: '#f43f5e'
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        hex: '#64748b'
      };
  }
}

export function parseProgressCell(rawContent) {
  if (!rawContent || rawContent.trim() === '') {
    return {
      reported: false,
      raw: '',
      progress: '',
      next: '',
      category: 'Belum Lapor'
    };
  }

  const clean = rawContent.trim();
  let progress = '';
  let next = '';

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (/^next\s*:?/i.test(line)) {
      next = line.replace(/^next\s*:?\s*/i, '').trim();
    } else if (/^(progres|progress)\s*:?/i.test(line)) {
      progress = line.replace(/^(progres|progress)\s*:?\s*/i, '').trim();
    } else if (!progress) {
      progress = line;
    } else if (!next) {
      next = line;
    }
  }

  if (!progress && clean) {
    progress = clean;
  }

  const category = detectCategory(progress || clean);

  return {
    reported: true,
    raw: clean,
    progress: progress || 'Mengisi progres bimbingan',
    next: next || '',
    category
  };
}

export function formatWhatsAppReminder(
  student,
  weekName,
  isReported,
  progressInfo,
  nextWeekName = ''
) {
  const dosenLines = [
    student.pembimbing1 ? `👨‍🏫 *Pembimbing 1:* ${student.pembimbing1}` : '',
    student.pembimbing2 ? `👨‍🏫 *Pembimbing 2:* ${student.pembimbing2}` : '',
    student.penguji1    ? `👨‍⚖️ *Penguji 1:* ${student.penguji1}`       : '',
    student.penguji2    ? `👨‍⚖️ *Penguji 2:* ${student.penguji2}`       : '',
  ].filter(Boolean).join('\n');

  if (!isReported) {
    return `Halo ${student.nama} (${student.nim}), selamat pagi/siang/sore/malam.

Mengingatkan kembali terkait perkembangan Tugas Akhir (TA) Program Studi Sains Data pekan *${weekName}*.
${dosenLines ? `\n${dosenLines}\n` : ''}
Dihimbau untuk *segera melakukan sesi bimbingan langsung dengan dosen pembimbing/penguji*, agar progres pengerjaan skripsi/TA Anda dapat dievaluasi dan kendala teknis/penulisan dapat segera teratasi.

Silakan jadwalkan waktu bimbingan Anda ya. Semangat selalu!

Salam,
Koordinator / Tim Monitoring TA Prodi Sains Data`;
  }

  // Khusus untuk yang sudah ada progres dan target
  const nextScheduleText = nextWeekName
    ? `pekan depan, tanggal ${nextWeekName}`
    : 'pekan depan';

  return `Halo ${student.nama} (${student.nim}), selamat pagi/siang/sore/malam.

Terima kasih telah mencatatkan progres bimbingan Tugas Akhir (TA) pada pekan *${weekName}*:
📌 *Progres Saat Ini:* ${progressInfo.progress}
🎯 *Target:* ${progressInfo.next || '-'}
${dosenLines ? `${dosenLines}\n` : ''}
Selanjutnya, dihimbau untuk *melanjutkan sesi bimbingan pada ${nextScheduleText}*, agar target pengerjaan dapat tercapai sesuai rencana.

Tetap semangat dan sukses untuk Tugas Akhirnya!

Salam,
Koordinator / Tim Monitoring TA Prodi Sains Data`;
}
