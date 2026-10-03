import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

// ─── Excel exports ────────────────────────────────────────────────────────────

export function exportExcelPeriode(students, week, weekColumns) {
  const idx = weekColumns.indexOf(week);
  const wb = XLSX.utils.book_new();
  const rows = [
    ['No', 'NIM', 'Nama', 'Angkatan', 'Pembimbing 1', 'Pembimbing 2', 'Penguji 1', 'Penguji 2',
      'No WA', 'Status TA', 'Status Lapor', 'Kategori', 'Progres', 'Target Periode Depan'],
    ...students.map((s, i) => {
      const upd = s.weeklyUpdates?.[week] || {};
      return [
        i + 1, s.nim, s.nama, s.angkatan,
        s.pembimbing1 || '-', s.pembimbing2 || '-',
        s.penguji1 || '-', s.penguji2 || '-',
        s.phone || '-', s.statusTA || '-',
        upd.reported ? 'Sudah Lapor' : 'Belum Lapor',
        upd.category || '-',
        upd.progress || '-',
        upd.next || '-',
      ];
    }),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [4, 14, 28, 9, 22, 22, 22, 22, 14, 14, 12, 16, 40, 30].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, `Periode ${idx + 1}`);
  const label = week.replace(/[\/\\?*[\]]/g, '-');
  XLSX.writeFile(wb, `Rekap_TA_Periode_${idx + 1}_${label}.xlsx`);
}

export function exportExcelAll(students, weekColumns) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekap ringkasan semua periode
  const summaryHeader = [
    'No', 'NIM', 'Nama', 'Angkatan', 'Pembimbing 1', 'Pembimbing 2',
    'Penguji 1', 'Penguji 2', 'No WA', 'Status TA',
    ...weekColumns.map((w, i) => `P${i + 1} – ${w}`),
    'Total Lapor',
  ];
  const summaryRows = [
    summaryHeader,
    ...students.map((s, i) => {
      const perPeriode = weekColumns.map(w => {
        const upd = s.weeklyUpdates?.[w];
        return upd?.reported ? upd.category : '-';
      });
      const total = weekColumns.filter(w => s.weeklyUpdates?.[w]?.reported).length;
      return [
        i + 1, s.nim, s.nama, s.angkatan,
        s.pembimbing1 || '-', s.pembimbing2 || '-',
        s.penguji1 || '-', s.penguji2 || '-',
        s.phone || '-', s.statusTA || '-',
        ...perPeriode,
        `${total}/${weekColumns.length}`,
      ];
    }),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [4, 14, 28, 9, 22, 22, 18, 18, 14, 14,
    ...weekColumns.map(() => ({ wch: 18 })), 10].map(w => (typeof w === 'number' ? { wch: w } : w));
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekap Semua Periode');

  // Sheet per periode
  weekColumns.forEach((week, idx) => {
    const rows = [
      ['No', 'NIM', 'Nama', 'Angkatan', 'Pembimbing 1', 'Pembimbing 2',
        'Status Lapor', 'Kategori', 'Progres', 'Target'],
      ...students.map((s, i) => {
        const upd = s.weeklyUpdates?.[week] || {};
        return [
          i + 1, s.nim, s.nama, s.angkatan,
          s.pembimbing1 || '-', s.pembimbing2 || '-',
          upd.reported ? 'Sudah Lapor' : 'Belum Lapor',
          upd.category || '-',
          upd.progress || '-',
          upd.next || '-',
        ];
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [4, 14, 28, 9, 22, 22, 12, 16, 40, 30].map(w => ({ wch: w }));
    const sheetName = `P${idx + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `Rekap_Monitoring_TA_Prodi_Sains_Data.xlsx`);
}

export function exportExcelSemester(students, semesterName, weekColumns) {
  const wb = XLSX.utils.book_new();
  const summaryHeader = [
    'No', 'NIM', 'Nama', 'Angkatan', 'Pembimbing 1', 'Pembimbing 2',
    'Penguji 1', 'Penguji 2', 'No WA', 'Status TA',
    ...weekColumns.map((w, i) => `P${i + 1} – ${w}`),
    'Total Lapor',
  ];
  const summaryRows = [
    summaryHeader,
    ...students.map((s, i) => {
      const perPeriode = weekColumns.map(w => {
        const upd = s.weeklyUpdates?.[w];
        return upd?.reported ? upd.category : '-';
      });
      const total = weekColumns.filter(w => s.weeklyUpdates?.[w]?.reported).length;
      return [
        i + 1, s.nim, s.nama, s.angkatan,
        s.pembimbing1 || '-', s.pembimbing2 || '-',
        s.penguji1 || '-', s.penguji2 || '-',
        s.phone || '-', s.statusTA || '-',
        ...perPeriode,
        `${total}/${weekColumns.length}`,
      ];
    }),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [4, 14, 28, 9, 22, 22, 18, 18, 14, 14,
    ...weekColumns.map(() => ({ wch: 18 })), 10].map(w => (typeof w === 'number' ? { wch: w } : w));
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekap Semester');
  weekColumns.forEach((week, idx) => {
    const rows = [
      ['No', 'NIM', 'Nama', 'Angkatan', 'Pembimbing 1', 'Pembimbing 2',
        'Status Lapor', 'Kategori', 'Progres', 'Target'],
      ...students.map((s, i) => {
        const upd = s.weeklyUpdates?.[week] || {};
        return [
          i + 1, s.nim, s.nama, s.angkatan,
          s.pembimbing1 || '-', s.pembimbing2 || '-',
          upd.reported ? 'Sudah Lapor' : 'Belum Lapor',
          upd.category || '-', upd.progress || '-', upd.next || '-',
        ];
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [4, 14, 28, 9, 22, 22, 12, 16, 40, 30].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, `P${idx + 1}`);
  });
  const safeLabel = semesterName.replace(/[\/\\?*[\]]/g, '-');
  XLSX.writeFile(wb, `Rekap_TA_${safeLabel}.xlsx`);
}

export function printRekapSemester(students, semesterName, weekColumns) {
  const periodeSections = weekColumns.map((week, idx) => {
    const sudah = students.filter(s => s.weeklyUpdates?.[week]?.reported).length;
    const belum = students.length - sudah;
    const rate = Math.round((sudah / (students.length || 1)) * 100);
    const rows = students.map((s, i) => {
      const upd = s.weeklyUpdates?.[week] || {};
      const reported = upd.reported;
      return `<tr style="${i % 2 === 0 ? '' : 'background:#f8fafc;'}">
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;">${i + 1}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:10px;">${s.nim}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:11px;">${s.nama}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-size:10px;">${s.angkatan}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;">
          <span style="background:${reported ? '#d1fae5' : '#fee2e2'};color:${reported ? '#065f46' : '#991b1b'};padding:2px 7px;border-radius:9999px;font-size:10px;font-weight:700;">
            ${reported ? 'Sudah' : 'Belum'}
          </span>
        </td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-size:10px;">${upd.category || '-'}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-size:10px;max-width:160px;">${upd.progress || '-'}</td>
      </tr>`;
    }).join('');
    return `
      <div style="break-inside:avoid;margin-bottom:32px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;border-bottom:2px solid #4f46e5;padding-bottom:6px;margin-bottom:10px;">
          <div>
            <span style="font-size:14px;font-weight:800;color:#1e293b;">Periode ${idx + 1}</span>
            <span style="font-size:12px;color:#64748b;margin-left:8px;">${week}</span>
          </div>
          <div style="display:flex;gap:12px;font-size:11px;">
            <span style="color:#059669;font-weight:700;">${sudah} lapor</span>
            <span style="color:#e11d48;font-weight:700;">${belum} belum</span>
            <span style="color:#4f46e5;font-weight:700;">${rate}%</span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">No</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">NIM</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Nama</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Angk.</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Status</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Kategori</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Progres</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  const overallSudah = weekColumns.length > 0
    ? students.filter(s => weekColumns.some(w => s.weeklyUpdates?.[w]?.reported)).length
    : 0;

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Rekap TA – ${semesterName}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; font-size: 12px; }
  @media print { button { display: none !important; } body { padding: 12px; } }
  @page { size: A4 landscape; margin: 14mm; }
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #4f46e5;">
  <div>
    <h1 style="font-size:20px;font-weight:900;margin:0 0 2px;">Rekap Monitoring Tugas Akhir</h1>
    <div style="color:#64748b;font-size:12px;">Program Studi Sains Data · ${semesterName} · ${weekColumns.length} periode · ${students.length} mahasiswa</div>
  </div>
  <button onclick="window.print()" style="padding:8px 18px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Cetak / Simpan PDF</button>
</div>
<div style="display:flex;gap:12px;margin-bottom:20px;">
  <div style="flex:1;padding:10px 14px;border-radius:8px;border:1px solid #bfdbfe;background:#eff6ff;">
    <div style="font-size:20px;font-weight:900;color:#1d4ed8;">${weekColumns.length}</div>
    <div style="font-size:11px;color:#64748b;">Total Periode</div>
  </div>
  <div style="flex:1;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;">
    <div style="font-size:20px;font-weight:900;color:#1e293b;">${students.length}</div>
    <div style="font-size:11px;color:#64748b;">Total Mahasiswa</div>
  </div>
  <div style="flex:1;padding:10px 14px;border-radius:8px;border:1px solid #bbf7d0;background:#f0fdf4;">
    <div style="font-size:20px;font-weight:900;color:#059669;">${overallSudah}</div>
    <div style="font-size:11px;color:#64748b;">Pernah Melapor</div>
  </div>
</div>
${periodeSections}
<div style="margin-top:16px;font-size:10px;color:#94a3b8;text-align:right;">
  Dicetak dari Sistem Monitoring TA Prodi Sains Data · ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ─── PDF via print window ─────────────────────────────────────────────────────

export function printStudentHistory(student, weekColumns, verifData = {}) {
  const nim = student.nim;
  const verifNim = verifData[nim] || {};

  const reportedCount = weekColumns.filter(w => student.weeklyUpdates?.[w]?.reported).length;
  const totalCount = weekColumns.length;
  const pctVal = totalCount > 0 ? Math.round((reportedCount / totalCount) * 100) : 0;

  const tableRows = weekColumns.map((week, idx) => {
    const upd = student.weeklyUpdates?.[week] || {};
    const verif = verifNim[week];
    if (!verif?.verified) return '';

    const num = idx + 1;
    const progres = upd.progress || '<span class="text-muted">-</span>';
    const target = upd.next || '<span class="text-muted">-</span>';
    const category = upd.category || '';
    const dosenName = verif.dosenName ? verif.dosenName.split(',')[0] : '';

    return `<tr>
      <td><div class="p-label">P${num}</div><div class="p-range">${week}</div></td>
      <td><span class="badge badge-verified">&#10003; Terverifikasi</span>${category ? `<div class="cat-text">${category}</div>` : ''}</td>
      <td>${progres}</td>
      <td>${target}</td>
      <td class="col-ttd"><div class="ttd-space"></div><div class="ttd-name">${dosenName}</div></td>
    </tr>`;
  }).join('');

  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Riwayat Bimbingan TA — ${student.nama}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#1e293b;background:#fff;padding:32px 40px}
  @media print{body{padding:0}@page{margin:12mm 10mm;size:A4 portrait}.no-print{display:none!important}}

  .top-bar{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px}
  .doc-title h1{font-size:20px;font-weight:800;color:#0f172a}
  .doc-title p{font-size:12px;color:#64748b;margin-top:3px}
  .print-btn{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}

  .profile-card{border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px 24px}
  .profile-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .profile-value{font-size:13px;font-weight:600;color:#1e293b}
  .profile-value.mono{font-family:monospace}

  .progress-info{display:inline-flex;align-items:center;gap:8px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;margin-bottom:16px}
  .progress-pct{background:#16a34a;color:#fff;border-radius:999px;padding:1px 9px;font-size:11px;font-weight:700}

  table{width:100%;border-collapse:collapse;font-size:13px}
  thead th{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;background:#f8fafc}
  tbody tr{border-bottom:1px solid #f1f5f9}
  tbody tr:last-child{border-bottom:none}
  tbody td{padding:12px;vertical-align:top;line-height:1.6}
  th:first-child,td:first-child{width:120px}
  th:nth-child(2),td:nth-child(2){width:130px}
  .col-ttd{width:140px;text-align:center}
  .ttd-space{height:48px;border-bottom:1px solid #cbd5e1;margin-bottom:6px}
  .ttd-name{font-size:11px;color:#475569;text-align:center}

  .p-label{font-size:15px;font-weight:800;color:#0f172a}
  .p-range{font-size:11px;color:#94a3b8;margin-top:2px}
  .badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap;display:inline-block}
  .badge-verified{background:#dcfce7;color:#166534}
  .cat-text{font-size:11px;color:#64748b;margin-top:5px}
  .text-muted{color:#94a3b8}

  .doc-footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:right;font-size:11px;color:#94a3b8}
</style></head><body>

<div class="top-bar">
  <div class="doc-title">
    <h1>Riwayat Bimbingan Tugas Akhir</h1>
    <p>Program Studi Sains Data &middot; Semester Ganjil 2026/2027</p>
  </div>
  <button class="print-btn no-print" onclick="window.print()">Cetak / Simpan PDF</button>
</div>

<div class="profile-card">
  <div><div class="profile-label">Nama</div><div class="profile-value">${student.nama}</div></div>
  <div><div class="profile-label">NIM</div><div class="profile-value mono">${student.nim}</div></div>
  <div><div class="profile-label">Angkatan</div><div class="profile-value">${student.angkatan}</div></div>
  <div><div class="profile-label">Pembimbing 1</div><div class="profile-value">${student.pembimbing1 || '-'}</div></div>
  <div><div class="profile-label">Pembimbing 2</div><div class="profile-value">${student.pembimbing2 || '-'}</div></div>
  <div><div class="profile-label">Status TA</div><div class="profile-value">${student.statusTA || '-'}</div></div>
</div>

<div class="progress-info">
  ${reportedCount} dari ${totalCount} periode terlaporkan
  <span class="progress-pct">${pctVal}%</span>
</div>

<table>
  <thead><tr>
    <th>Periode</th><th>Status</th><th>Progres</th><th>Target Berikutnya</th><th class="col-ttd">Tanda Tangan</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>

<div class="doc-footer">Dicetak dari Sistem Monitoring TA Prodi Sains Data &middot; ${todayStr}</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}


export function printRekapPeriode(students, week, weekColumns) {
  const idx = weekColumns.indexOf(week);
  const sudah = students.filter(s => s.weeklyUpdates?.[week]?.reported).length;
  const belum = students.length - sudah;

  const rows = students.map((s, i) => {
    const upd = s.weeklyUpdates?.[week] || {};
    const reported = upd.reported;
    return `<tr style="${i % 2 === 0 ? '' : 'background:#f8fafc;'}">
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:11px;">${s.nim}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-weight:600;">${s.nama}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${s.angkatan}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${s.pembimbing1 || '-'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">
        <span style="background:${reported ? '#d1fae5' : '#fee2e2'};color:${reported ? '#065f46' : '#991b1b'};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;">
          ${reported ? 'Sudah Lapor' : 'Belum Lapor'}
        </span>
      </td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${upd.category || '-'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;max-width:200px;">${upd.progress || '-'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Rekap Periode ${idx + 1} – ${week}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { color: #64748b; font-size: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #f1f5f9; }
  th { padding: 8px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  .stats { display: flex; gap: 16px; margin-bottom: 16px; }
  .stat { flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
  @media print { button { display: none; } }
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
  <div>
    <h1>Rekap Monitoring TA – Periode ${idx + 1}</h1>
    <div class="subtitle">${week} · Program Studi Sains Data</div>
  </div>
  <button onclick="window.print()" style="padding:8px 18px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Cetak / Simpan PDF</button>
</div>
<div class="stats">
  <div class="stat" style="background:#f0fdf4;border-color:#bbf7d0;">
    <div style="font-size:22px;font-weight:900;color:#059669;">${sudah}</div>
    <div style="font-size:12px;color:#64748b;">Sudah Melapor</div>
  </div>
  <div class="stat" style="background:#fff1f2;border-color:#fecdd3;">
    <div style="font-size:22px;font-weight:900;color:#e11d48;">${belum}</div>
    <div style="font-size:12px;color:#64748b;">Belum Melapor</div>
  </div>
  <div class="stat">
    <div style="font-size:22px;font-weight:900;color:#4f46e5;">${students.length}</div>
    <div style="font-size:12px;color:#64748b;">Total Mahasiswa</div>
  </div>
  <div class="stat" style="background:#eff6ff;border-color:#bfdbfe;">
    <div style="font-size:22px;font-weight:900;color:#1d4ed8;">${Math.round((sudah / (students.length || 1)) * 100)}%</div>
    <div style="font-size:12px;color:#64748b;">Tingkat Kepatuhan</div>
  </div>
</div>
<table>
  <thead><tr>
    <th>No</th><th>NIM</th><th>Nama</th><th>Angk.</th>
    <th>Pembimbing 1</th><th>Status</th><th>Kategori</th><th>Progres</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div style="margin-top:16px;font-size:10px;color:#94a3b8;text-align:right;">
  Dicetak dari Sistem Monitoring TA Prodi Sains Data · ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// PDF: all periods summary via print window
export function printRekapAll(students, weekColumns) {
  const periodeSections = weekColumns.map((week, idx) => {
    const sudah = students.filter(s => s.weeklyUpdates?.[week]?.reported).length;
    const belum = students.length - sudah;
    const rate = Math.round((sudah / (students.length || 1)) * 100);

    const rows = students.map((s, i) => {
      const upd = s.weeklyUpdates?.[week] || {};
      const reported = upd.reported;
      return `<tr style="${i % 2 === 0 ? '' : 'background:#f8fafc;'}">
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;">${i + 1}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:10px;">${s.nim}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:11px;">${s.nama}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-size:10px;">${s.angkatan}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;">
          <span style="background:${reported ? '#d1fae5' : '#fee2e2'};color:${reported ? '#065f46' : '#991b1b'};padding:2px 7px;border-radius:9999px;font-size:10px;font-weight:700;">
            ${reported ? 'Sudah' : 'Belum'}
          </span>
        </td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-size:10px;">${upd.category || '-'}</td>
        <td style="padding:5px 7px;border-bottom:1px solid #e2e8f0;font-size:10px;max-width:160px;">${upd.progress || '-'}</td>
      </tr>`;
    }).join('');

    return `
      <div style="break-inside:avoid;margin-bottom:32px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;border-bottom:2px solid #4f46e5;padding-bottom:6px;margin-bottom:10px;">
          <div>
            <span style="font-size:14px;font-weight:800;color:#1e293b;">Periode ${idx + 1}</span>
            <span style="font-size:12px;color:#64748b;margin-left:8px;">${week}</span>
          </div>
          <div style="display:flex;gap:12px;font-size:11px;">
            <span style="color:#059669;font-weight:700;">${sudah} lapor</span>
            <span style="color:#e11d48;font-weight:700;">${belum} belum</span>
            <span style="color:#4f46e5;font-weight:700;">${rate}%</span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">No</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">NIM</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Nama</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Angk.</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Status</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Kategori</th>
            <th style="padding:5px 7px;text-align:left;font-size:10px;color:#64748b;border-bottom:2px solid #e2e8f0;">Progres</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  const overallSudah = weekColumns.length > 0
    ? students.filter(s => weekColumns.some(w => s.weeklyUpdates?.[w]?.reported)).length
    : 0;

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Rekap Monitoring TA – Semua Periode</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; font-size: 12px; }
  @media print { button { display: none !important; } body { padding: 12px; } }
  @page { size: A4 landscape; margin: 14mm; }
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #4f46e5;">
  <div>
    <h1 style="font-size:20px;font-weight:900;margin:0 0 2px;">Rekap Monitoring Tugas Akhir</h1>
    <div style="color:#64748b;font-size:12px;">Program Studi Sains Data · Semua Periode (${weekColumns.length} periode) · ${students.length} mahasiswa</div>
  </div>
  <button onclick="window.print()" style="padding:8px 18px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Cetak / Simpan PDF</button>
</div>
<div style="display:flex;gap:12px;margin-bottom:20px;">
  <div style="flex:1;padding:10px 14px;border-radius:8px;border:1px solid #bfdbfe;background:#eff6ff;">
    <div style="font-size:20px;font-weight:900;color:#1d4ed8;">${weekColumns.length}</div>
    <div style="font-size:11px;color:#64748b;">Total Periode</div>
  </div>
  <div style="flex:1;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;">
    <div style="font-size:20px;font-weight:900;color:#1e293b;">${students.length}</div>
    <div style="font-size:11px;color:#64748b;">Total Mahasiswa</div>
  </div>
  <div style="flex:1;padding:10px 14px;border-radius:8px;border:1px solid #bbf7d0;background:#f0fdf4;">
    <div style="font-size:20px;font-weight:900;color:#059669;">${overallSudah}</div>
    <div style="font-size:11px;color:#64748b;">Pernah Melapor</div>
  </div>
</div>
${periodeSections}
<div style="margin-top:16px;font-size:10px;color:#94a3b8;text-align:right;">
  Dicetak dari Sistem Monitoring TA Prodi Sains Data · ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ─── Verifikasi helpers ───────────────────────────────────────────────────────

const VERIF_KEY = 'verifikasi_laporan';

function getLocalVerifikasi() {
  try { return JSON.parse(localStorage.getItem(VERIF_KEY) || '{}'); } catch { return {}; }
}

export async function getVerifikasi() {
  if (supabase) {
    const { data, error } = await supabase.from('verifikasi_laporan').select('*');
    if (!error && data) {
      const result = {};
      data.forEach(r => {
        if (!result[r.nim]) result[r.nim] = {};
        result[r.nim][r.week] = { verified: true, dosenName: r.dosen_name, at: r.verified_at };
      });
      return result;
    }
  }
  return getLocalVerifikasi();
}

export async function saveVerifikasi(nim, week, dosenName) {
  if (supabase) {
    await supabase.from('verifikasi_laporan').upsert(
      { nim, week, dosen_name: dosenName, verified_at: new Date().toISOString() },
      { onConflict: 'nim,week' }
    );
    return;
  }
  const all = getLocalVerifikasi();
  if (!all[nim]) all[nim] = {};
  all[nim][week] = { verified: true, dosenName, at: new Date().toISOString() };
  localStorage.setItem(VERIF_KEY, JSON.stringify(all));
}

export async function cancelVerifikasi(nim, week) {
  if (supabase) {
    await supabase.from('verifikasi_laporan').delete().eq('nim', nim).eq('week', week);
    return;
  }
  const all = getLocalVerifikasi();
  if (all[nim]) delete all[nim][week];
  localStorage.setItem(VERIF_KEY, JSON.stringify(all));
}

// ─── Penolakan helpers ────────────────────────────────────────────────────────

const PENOLAKAN_KEY = 'penolakan_laporan';

function getLocalPenolakan() {
  try { return JSON.parse(localStorage.getItem(PENOLAKAN_KEY) || '{}'); } catch { return {}; }
}

export async function getPenolakan() {
  if (supabase) {
    const { data, error } = await supabase.from('penolakan_laporan').select('*');
    if (!error && data) {
      const result = {};
      data.forEach(r => {
        if (!result[r.nim]) result[r.nim] = {};
        result[r.nim][r.week] = { alasan: r.alasan, dosenName: r.dosen_name, at: r.rejected_at };
      });
      return result;
    }
  }
  return getLocalPenolakan();
}

export async function savePenolakan(nim, week, dosenName, alasan) {
  if (supabase) {
    await supabase.from('penolakan_laporan').upsert(
      { nim, week, dosen_name: dosenName, alasan, rejected_at: new Date().toISOString() },
      { onConflict: 'nim,week' }
    );
    return;
  }
  const all = getLocalPenolakan();
  if (!all[nim]) all[nim] = {};
  all[nim][week] = { alasan, dosenName, at: new Date().toISOString() };
  localStorage.setItem(PENOLAKAN_KEY, JSON.stringify(all));
}

export async function cancelPenolakan(nim, week) {
  if (supabase) {
    await supabase.from('penolakan_laporan').delete().eq('nim', nim).eq('week', week);
    return;
  }
  const all = getLocalPenolakan();
  if (all[nim]) delete all[nim][week];
  localStorage.setItem(PENOLAKAN_KEY, JSON.stringify(all));
}

// ─── Admin: all laporan & masuk-database tracking ────────────────────────────

export async function getAllLaporanBimbingan() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('laporan_bimbingan')
    .select('nim, nama, week, category, progress, next_target, dosen_hadir, submitted_at')
    .order('submitted_at', { ascending: false });
  return error ? [] : (data || []);
}

const MASUK_DB_KEY = 'laporan_masuk_database';
function _getLocalMasukDb() {
  try { return JSON.parse(localStorage.getItem(MASUK_DB_KEY) || '[]'); } catch { return []; }
}

export async function getLaporanMasukDatabase() {
  if (supabase) {
    const { data, error } = await supabase.from('laporan_masuk_database').select('nim, week, masuk_at');
    if (!error && data) return data;
  }
  return _getLocalMasukDb();
}

export async function tandaiMasukDatabase(nim, week) {
  if (supabase) {
    await supabase.from('laporan_masuk_database').upsert(
      { nim, week, masuk_at: new Date().toISOString() },
      { onConflict: 'nim,week' }
    );
    return;
  }
  const list = _getLocalMasukDb();
  if (!list.some(r => r.nim === nim && r.week === week)) {
    localStorage.setItem(MASUK_DB_KEY, JSON.stringify([...list, { nim, week, masuk_at: new Date().toISOString() }]));
  }
}

export async function batalMasukDatabase(nim, week) {
  if (supabase) {
    await supabase.from('laporan_masuk_database').delete().eq('nim', nim).eq('week', week);
    return;
  }
  const list = _getLocalMasukDb();
  localStorage.setItem(MASUK_DB_KEY, JSON.stringify(list.filter(r => !(r.nim === nim && r.week === week))));
}

// ─── Built-in semesters (hardcoded baseline) ─────────────────────────────────

export const BUILTIN_SEMESTERS = [
  'Semester Ganjil 2026/2027',
];

// ─── Local semesters helpers (admin-added) ────────────────────────────────────

const LOCAL_SEMESTERS_KEY = 'local_semesters';

export function getLocalSemesters() {
  try { return JSON.parse(localStorage.getItem(LOCAL_SEMESTERS_KEY) || '[]'); } catch { return []; }
}

export function saveLocalSemesters(list) {
  localStorage.setItem(LOCAL_SEMESTERS_KEY, JSON.stringify(list));
}

// ─── Custom periods helpers (Supabase-backed, localStorage fallback) ─────────

const LOCAL_PERIODS_KEY = 'local_periods';

function _getLocalPeriods() {
  try { return JSON.parse(localStorage.getItem(LOCAL_PERIODS_KEY) || '[]'); } catch { return []; }
}
function _saveLocalPeriods(list) {
  localStorage.setItem(LOCAL_PERIODS_KEY, JSON.stringify(list));
}

export async function getCustomPeriods() {
  if (supabase) {
    const { data, error } = await supabase.from('custom_periods').select('label, semester').order('created_at');
    if (!error && data) return data.map(r => ({ label: r.label, semester: r.semester || BUILTIN_SEMESTERS[0] }));
  }
  return _getLocalPeriods().map(label => ({ label, semester: BUILTIN_SEMESTERS[0] }));
}

export async function addCustomPeriod(label, semester = BUILTIN_SEMESTERS[0]) {
  if (supabase) {
    await supabase.from('custom_periods').insert({ label, semester });
    return;
  }
  const list = _getLocalPeriods();
  if (!list.includes(label)) _saveLocalPeriods([...list, label]);
}

export async function deleteCustomPeriod(label) {
  if (supabase) {
    await supabase.from('custom_periods').delete().eq('label', label);
    return;
  }
  _saveLocalPeriods(_getLocalPeriods().filter(p => p !== label));
}

export async function updateCustomPeriod(oldLabel, newLabel) {
  if (supabase) {
    await supabase.from('custom_periods').update({ label: newLabel }).eq('label', oldLabel);
    return;
  }
  _saveLocalPeriods(_getLocalPeriods().map(p => p === oldLabel ? newLabel : p));
}

// kept for backward compat (used by old localStorage data only)
export function getLocalPeriods() { return _getLocalPeriods(); }

// ─── Student dosen overrides (Supabase-backed, localStorage fallback) ─────────

const STUDENT_OV_KEY = 'student_overrides';

export async function getStudentOverrides() {
  if (supabase) {
    const { data, error } = await supabase.from('student_overrides').select('*');
    if (!error && data) return data.reduce((acc, r) => { acc[r.nim] = r; return acc; }, {});
  }
  try { return JSON.parse(localStorage.getItem(STUDENT_OV_KEY) || '{}'); } catch { return {}; }
}

export async function upsertStudentOverride(nim, fields) {
  if (supabase) {
    const payload = { nim, ...fields, updated_at: new Date().toISOString() };
    // is_custom must be stored as boolean
    if ('is_custom' in payload) payload.is_custom = Boolean(payload.is_custom);
    await supabase.from('student_overrides').upsert(payload, { onConflict: 'nim' });
    return;
  }
  try {
    const all = JSON.parse(localStorage.getItem(STUDENT_OV_KEY) || '{}');
    all[nim] = { ...(all[nim] || {}), nim, ...fields };
    localStorage.setItem(STUDENT_OV_KEY, JSON.stringify(all));
  } catch {}
}

export async function deleteStudentOverride(nim) {
  if (supabase) {
    await supabase.from('student_overrides').delete().eq('nim', nim);
    return;
  }
  try {
    const all = JSON.parse(localStorage.getItem(STUDENT_OV_KEY) || '{}');
    delete all[nim];
    localStorage.setItem(STUDENT_OV_KEY, JSON.stringify(all));
  } catch {}
}

// ─── Extra dosen helpers (Supabase / localStorage) ────────────────────────────

const EXTRA_DOSEN_KEY = 'extra_dosen';

export async function getExtraDosen() {
  if (supabase) {
    const { data, error } = await supabase.from('extra_dosen').select('nama').order('nama');
    if (!error && data) {
      const names = data.map(r => r.nama);
      try { localStorage.setItem(EXTRA_DOSEN_KEY, JSON.stringify(names)); } catch {}
      return names;
    }
  }
  try { return JSON.parse(localStorage.getItem(EXTRA_DOSEN_KEY) || '[]'); } catch { return []; }
}

export async function addExtraDosenName(nama) {
  if (supabase) {
    await supabase.from('extra_dosen').upsert({ nama }, { onConflict: 'nama' });
    return;
  }
  try {
    const arr = JSON.parse(localStorage.getItem(EXTRA_DOSEN_KEY) || '[]');
    if (!arr.includes(nama)) arr.push(nama);
    localStorage.setItem(EXTRA_DOSEN_KEY, JSON.stringify(arr));
  } catch {}
}

export async function removeExtraDosenName(nama) {
  if (supabase) {
    await supabase.from('extra_dosen').delete().eq('nama', nama);
    return;
  }
  try {
    const arr = JSON.parse(localStorage.getItem(EXTRA_DOSEN_KEY) || '[]');
    localStorage.setItem(EXTRA_DOSEN_KEY, JSON.stringify(arr.filter(n => n !== nama)));
  } catch {}
}

// ─── Hidden dosen helpers (localStorage) ──────────────────────────────────────

const HIDDEN_DOSEN_KEY = 'hidden_dosen';

export async function getHiddenDosen() {
  if (supabase) {
    const { data, error } = await supabase.from('hidden_dosen').select('nama');
    if (!error && data) {
      const names = data.map(r => r.nama);
      try { localStorage.setItem(HIDDEN_DOSEN_KEY, JSON.stringify(names)); } catch {}
      return new Set(names);
    }
  }
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_DOSEN_KEY) || '[]')); } catch { return new Set(); }
}

export async function unhideDosenName(nama) {
  if (supabase) {
    await supabase.from('hidden_dosen').delete().eq('nama', nama);
    return;
  }
  try {
    const s = new Set(JSON.parse(localStorage.getItem(HIDDEN_DOSEN_KEY) || '[]'));
    s.delete(nama);
    localStorage.setItem(HIDDEN_DOSEN_KEY, JSON.stringify([...s]));
  } catch {}
}

export async function hideDosenName(nama) {
  if (supabase) {
    await supabase.from('hidden_dosen').upsert({ nama }, { onConflict: 'nama' });
    return;
  }
  try {
    const s = new Set(JSON.parse(localStorage.getItem(HIDDEN_DOSEN_KEY) || '[]'));
    s.add(nama);
    localStorage.setItem(HIDDEN_DOSEN_KEY, JSON.stringify([...s]));
  } catch {}
}

// ─── Dosen info helpers (Supabase / localStorage) ────────────────────────────

const DOSEN_INFO_KEY = 'dosen_info_cache';

export async function getDosenInfo() {
  if (supabase) {
    const { data, error } = await supabase.from('dosen_info').select('*');
    if (!error && data) {
      const map = {};
      data.forEach(r => { map[r.nama] = { email: r.email || '', phone: r.phone || '', nidn: r.nidn || '' }; });
      try { localStorage.setItem(DOSEN_INFO_KEY, JSON.stringify(map)); } catch {}
      return map;
    }
  }
  try { return JSON.parse(localStorage.getItem(DOSEN_INFO_KEY) || '{}'); } catch { return {}; }
}

export async function upsertDosenInfo(nama, { email = '', phone = '', nidn = '' }) {
  if (supabase) {
    await supabase.from('dosen_info').upsert(
      { nama, email: email || null, phone: phone || null, nidn: nidn || null },
      { onConflict: 'nama' }
    );
    return;
  }
  try {
    const map = JSON.parse(localStorage.getItem(DOSEN_INFO_KEY) || '{}');
    map[nama] = { email, phone, nidn };
    localStorage.setItem(DOSEN_INFO_KEY, JSON.stringify(map));
  } catch {}
}

// ─── Locked periods helpers (Supabase-backed) ─────────────────────────────────

const LOCAL_LOCKED_KEY = 'locked_periods';

export async function getLockedPeriods() {
  if (supabase) {
    const { data, error } = await supabase.from('locked_periods').select('label');
    if (!error && data) return data.map(r => r.label);
  }
  try { return JSON.parse(localStorage.getItem(LOCAL_LOCKED_KEY) || '[]'); } catch { return []; }
}

export async function lockPeriod(label) {
  if (supabase) {
    await supabase.from('locked_periods').upsert({ label }, { onConflict: 'label' });
    return;
  }
  const list = await getLockedPeriods();
  if (!list.includes(label)) localStorage.setItem(LOCAL_LOCKED_KEY, JSON.stringify([...list, label]));
}

export async function unlockPeriod(label) {
  if (supabase) {
    await supabase.from('locked_periods').delete().eq('label', label);
    return;
  }
  const list = await getLockedPeriods();
  localStorage.setItem(LOCAL_LOCKED_KEY, JSON.stringify(list.filter(p => p !== label)));
}
