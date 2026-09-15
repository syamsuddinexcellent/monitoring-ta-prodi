export async function triggerSyncDatabase() {
  try {
    let baseUrl = 'http://localhost:3002';
    if (typeof window !== 'undefined') {
      if (window.location.port === '5174' || window.location.port === '3002') {
        baseUrl = 'http://localhost:3002';
      } else if (window.location.port === '5173' || window.location.port === '3001') {
        baseUrl = 'http://localhost:3001';
      } else {
        baseUrl = window.location.origin;
      }
    }
    const endpoint = `${baseUrl}/api/sync`;
    const res = await fetch(endpoint, { method: 'POST' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Sync trigger note:', e);
  }
  return null;
}

import Papa from 'papaparse';
import { parseProgressCell, getAngkatan, cleanPhoneNumber } from '../utils/helpers.js';
import { lookupStudentNIM, lookupStudentPhone } from '../utils/studentDatabase.js';

export const GOOGLE_SPREADSHEET_ID = '1pj3negFYVU9nHrTVvnXW8an8soJrp2Kyfs3BVXG-eq0';
export const GOOGLE_SHEETS_VIEW_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit?usp=sharing`;

export const TABS_CONFIG = [
  { angkatan: '2020', gid: '0' },
  { angkatan: '2021', gid: '436428123' },
  { angkatan: '2022', gid: '166410248' }
];

export const ORDERED_DEFAULT_WEEKS = [
  '31 - 04 September 26',
  '07 - 11 September 26',
  '14 - 18 September 26',
  '21 - 25 September 26',
  '28 - 02 Oktober 26'
];

/**
 * Fetch a single sheet tab as CSV
 */
async function fetchSheetCsv(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} fetching gid=${gid}`);
  }
  return await res.text();
}

/**
 * Load all monitoring data across all tabs
 */
export async function loadMonitoringData() {
  let source = 'google_sheets';
  let fetchedTabs = [];

  // 1. Try fetching live Google Sheets tabs concurrently
  try {
    const promises = TABS_CONFIG.map(tab =>
      fetchSheetCsv(tab.gid).then(csvText => ({
        angkatan: tab.angkatan,
        csvText
      }))
    );
    const results = await Promise.allSettled(promises);
    fetchedTabs = results
      .filter(r => r.status === 'fulfilled' && r.value.csvText.includes('Nama') && !r.value.csvText.includes('<html') && !r.value.csvText.includes('<!DOCTYPE'))
      .map(r => r.value);
  } catch (err) {
    console.warn('Direct Google Sheet fetch encountered error:', err);
  }

  // 2. If Google Sheets fetch failed, try fallback_data.json
  if (fetchedTabs.length === 0) {
    try {
      const res = await fetch('/fallback_data.json');
      if (res.ok) {
        const json = await res.json();
        if (json.students && json.students.length > 0) {
          return processFallbackJson(json, 'fallback_json');
        }
      }
    } catch {
      // ignore
    }

    // 3. Try /data.csv
    try {
      const res = await fetch('/data.csv');
      if (res.ok) {
        const text = await res.text();
        return processCombinedCSV(text, 'local_csv');
      }
    } catch {
      // ignore
    }
  }

  // Process live fetched tabs
  if (fetchedTabs.length > 0) {
    return processTabsData(fetchedTabs, source);
  }

  throw new Error('Tidak dapat memuat data monitoring dari Google Sheets maupun data lokal.');
}

/**
 * Process multiple raw CSV tabs into unified application state
 */
export function processTabsData(tabs, source = 'google_sheets') {
  const allStudents = [];
  const weekSet = new Set();
  const rawWeeksByTab = {};

  tabs.forEach(tab => {
    const parsed = Papa.parse(tab.csvText, {
      header: true,
      skipEmptyLines: 'greedy'
    });

    const headers = (parsed.meta.fields || []).map(h => (h || '').trim());
    
    // Find column positions
    const namaHeader = headers.find(h => /^nama$/i.test(h)) || 'Nama';
    const nimHeader = headers.find(h => /^nim$/i.test(h));
    const waHeader = headers.find(h => /wa|telepon|phone|hp|nomor/i.test(h));
    const p1Header = headers.find(h => /pembimbing 1/i.test(h));
    const p2Header = headers.find(h => /pembimbing 2/i.test(h));
    const pjHeader = headers.find(h => /penguji 1/i.test(h));
    const pj2Header = headers.find(h => /penguji 2/i.test(h));
    const statusHeader = headers.find(h => /^status$/i.test(h));
    const targetHeader = headers.find(h => /^target$/i.test(h));
    const ketHeader = headers.find(h => /keterangan/i.test(h));

    const metaHeaders = new Set([
      namaHeader,
      nimHeader,
      waHeader,
      p1Header,
      p2Header,
      pjHeader,
      pj2Header,
      statusHeader,
      targetHeader,
      ketHeader
    ].filter(Boolean));

    const tabWeeks = headers.filter(h => h && !metaHeaders.has(h) && !h.startsWith('Unnamed') && !h.startsWith('_') && h.trim().length > 1);
    tabWeeks.forEach(w => weekSet.add(w));
    rawWeeksByTab[tab.angkatan] = tabWeeks;

    (parsed.data || []).forEach(row => {
      const nama = (row[namaHeader] || '').trim();
      if (!nama || nama.toLowerCase() === 'nama') return;

      let nim = (nimHeader ? row[nimHeader] : '').trim();
      if (!nim) {
        nim = lookupStudentNIM(nama, tab.angkatan);
      }

      let phone = (waHeader ? row[waHeader] : '').trim();
      if (!phone) {
        phone = lookupStudentPhone(nim);
      }

      const p1 = (p1Header ? row[p1Header] : '').trim();
      const p2 = (p2Header ? row[p2Header] : '').trim();
      const pj = (pjHeader ? row[pjHeader] : '').trim();
      const pj2 = (pj2Header ? row[pj2Header] : '').trim();
      const statusTA = (statusHeader ? row[statusHeader] : '').trim();
      const target = (targetHeader ? row[targetHeader] : '').trim();
      const ket = (ketHeader ? row[ketHeader] : '').trim();

      const weeklyUpdates = {};
      tabWeeks.forEach(w => {
        const rawCell = (row[w] || '').trim();
        weeklyUpdates[w] = parseProgressCell(rawCell);
      });

      const resolvedNim = nim || `12${tab.angkatan.slice(2)}450xxx`;
      allStudents.push({
        nim: resolvedNim,
        nama,
        angkatan: getAngkatan(resolvedNim, tab.angkatan),
        phone: cleanPhoneNumber(phone),
        rawPhone: phone,
        pembimbing1: p1,
        pembimbing2: p2,
        penguji1: pj,
        penguji2: pj2,
        statusTA,
        target,
        keterangan: ket,
        weeklyUpdates
      });
    });
  });

  // Deduplicate by NIM — merge weekly updates from multiple tabs
  const nimMap = new Map();
  allStudents.forEach(st => {
    if (!nimMap.has(st.nim)) {
      nimMap.set(st.nim, { ...st });
    } else {
      const existing = nimMap.get(st.nim);
      // Merge weekly updates: prefer non-empty entries
      Object.entries(st.weeklyUpdates).forEach(([w, update]) => {
        if (!existing.weeklyUpdates[w] || !existing.weeklyUpdates[w].reported) {
          existing.weeklyUpdates[w] = update;
        }
      });
      // Fill missing fields from later tabs
      if (!existing.pembimbing1 && st.pembimbing1) existing.pembimbing1 = st.pembimbing1;
      if (!existing.pembimbing2 && st.pembimbing2) existing.pembimbing2 = st.pembimbing2;
      if (!existing.penguji1 && st.penguji1) existing.penguji1 = st.penguji1;
      if (!existing.penguji2 && st.penguji2) existing.penguji2 = st.penguji2;
      if (!existing.phone && st.phone) existing.phone = st.phone;
    }
  });
  const dedupedStudents = Array.from(nimMap.values());

  // Organize weeks: Priority to current semester active weeks, then past updates
  const activeWeeks = ORDERED_DEFAULT_WEEKS.filter(w => weekSet.has(w));
  const otherWeeks = Array.from(weekSet).filter(w => !ORDERED_DEFAULT_WEEKS.includes(w));
  
  // Sort other weeks by dates or keep original order
  const weekColumns = [...activeWeeks, ...otherWeeks];

  // Fill empty weekly updates for weeks not present in student's tab
  dedupedStudents.forEach(st => {
    weekColumns.forEach(w => {
      if (!st.weeklyUpdates[w]) {
        st.weeklyUpdates[w] = {
          reported: false,
          raw: '',
          progress: '',
          next: '',
          category: 'Belum Lapor'
        };
      }
    });
  });

  return {
    source,
    lastUpdated: new Date(),
    weekColumns,
    students: dedupedStudents
  };
}

/**
 * Process fallback JSON snapshot
 */
function processFallbackJson(json, source = 'fallback_json') {
  const nimMap = new Map();
  json.students.forEach(s => {
    const weeklyUpdates = {};
    Object.entries(s.rawUpdates || {}).forEach(([w, text]) => {
      weeklyUpdates[w] = parseProgressCell(text);
    });

    const phone = s.phone || lookupStudentPhone(s.nim) || '';
    const entry = {
      nim: s.nim,
      nama: s.nama,
      angkatan: getAngkatan(s.nim, s.angkatan),
      phone: cleanPhoneNumber(phone),
      rawPhone: phone,
      pembimbing1: s.pembimbing1 || '',
      pembimbing2: s.pembimbing2 || '',
      penguji1: s.penguji1 || '',
      penguji2: s.penguji2 || '',
      statusTA: s.statusTA || '',
      target: s.target || '',
      keterangan: s.keterangan || '',
      weeklyUpdates
    };

    if (!nimMap.has(s.nim)) {
      nimMap.set(s.nim, entry);
    } else {
      const existing = nimMap.get(s.nim);
      Object.entries(weeklyUpdates).forEach(([w, upd]) => {
        if (!existing.weeklyUpdates[w] || !existing.weeklyUpdates[w].reported) {
          existing.weeklyUpdates[w] = upd;
        }
      });
      if (!existing.phone && entry.phone) existing.phone = entry.phone;
      if (!existing.pembimbing1 && entry.pembimbing1) existing.pembimbing1 = entry.pembimbing1;
      if (!existing.pembimbing2 && entry.pembimbing2) existing.pembimbing2 = entry.pembimbing2;
      if (!existing.penguji1 && entry.penguji1) existing.penguji1 = entry.penguji1;
      if (!existing.penguji2 && entry.penguji2) existing.penguji2 = entry.penguji2;
    }
  });
  const students = Array.from(nimMap.values());

  const weekSet = new Set(json.weeks || []);
  const activeWeeks = ORDERED_DEFAULT_WEEKS.filter(w => weekSet.has(w));
  const otherWeeks = (json.weeks || []).filter(w => !ORDERED_DEFAULT_WEEKS.includes(w));
  const weekColumns = [...activeWeeks, ...otherWeeks];

  students.forEach(st => {
    weekColumns.forEach(w => {
      if (!st.weeklyUpdates[w]) {
        st.weeklyUpdates[w] = {
          reported: false,
          raw: '',
          progress: '',
          next: '',
          category: 'Belum Lapor'
        };
      }
    });
  });

  return {
    source,
    lastUpdated: new Date(),
    weekColumns,
    students
  };
}

/**
 * Process single fallback CSV
 */
function processCombinedCSV(csvText, source = 'local_csv') {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });
  const headers = parsed.meta.fields || [];
  const fixed = new Set(['NIM', 'Nama', 'Angkatan', 'Nomor WA', 'Pembimbing 1', 'Pembimbing 2', 'Penguji 1', 'Status TA', 'Target']);
  const weekColumns = headers.filter(h => h && !fixed.has(h));

  const students = (parsed.data || []).map(row => {
    const weeklyUpdates = {};
    weekColumns.forEach(w => {
      weeklyUpdates[w] = parseProgressCell(row[w] || '');
    });
    return {
      nim: row['NIM'] || '',
      nama: row['Nama'] || '',
      angkatan: row['Angkatan'] || getAngkatan(row['NIM']),
      phone: cleanPhoneNumber(row['Nomor WA'] || ''),
      rawPhone: row['Nomor WA'] || '',
      pembimbing1: row['Pembimbing 1'] || '',
      pembimbing2: row['Pembimbing 2'] || '',
      penguji1: row['Penguji 1'] || '',
      penguji2: row['Penguji 2'] || '',
      statusTA: row['Status TA'] || '',
      target: row['Target'] || '',
      keterangan: '',
      weeklyUpdates
    };
  });

  return {
    source,
    lastUpdated: new Date(),
    weekColumns,
    students
  };
}

/**
 * Calculate weekly metrics for a specific week
 */
export function getWeeklyMetrics(students, selectedWeek) {
  const total = students.length;
  let reported = 0;
  let notReported = 0;
  const categoryCounts = {};
  const lecturerCounts = {};

  students.forEach(student => {
    const update = student.weeklyUpdates[selectedWeek];
    const isReported = Boolean(update && update.reported);
    
    if (isReported) {
      reported++;
      categoryCounts[update.category] = (categoryCounts[update.category] || 0) + 1;
    } else {
      notReported++;
      categoryCounts['Belum Lapor'] = (categoryCounts['Belum Lapor'] || 0) + 1;
    }

    if (student.pembimbing1) {
      if (!lecturerCounts[student.pembimbing1]) {
        lecturerCounts[student.pembimbing1] = { total: 0, reported: 0 };
      }
      lecturerCounts[student.pembimbing1].total++;
      if (isReported) {
        lecturerCounts[student.pembimbing1].reported++;
      }
    }
  });

  const percentage = total > 0 ? Math.round((reported / total) * 100) : 0;

  const categoryChartData = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / (total || 1)) * 100)
  }));

  const lecturerChartData = Object.entries(lecturerCounts)
    .map(([name, data]) => ({
      name,
      total: data.total,
      reported: data.reported,
      percentage: Math.round((data.reported / data.total) * 100)
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total,
    reported,
    notReported,
    percentage,
    categoryCounts,
    categoryChartData,
    lecturerChartData
  };
}

/**
 * Calculate trend metrics across all weeks
 */
export function getAllWeeksTrend(students, weekColumns) {
  return weekColumns.map((week, idx) => {
    let reported = 0;
    students.forEach(s => {
      if (s.weeklyUpdates[week]?.reported) {
        reported++;
      }
    });

    return {
      weekName: week,
      shortName: `Pekan ${idx + 1}`,
      reported,
      notReported: students.length - reported,
      total: students.length,
      percentage: students.length > 0 ? Math.round((reported / (students.length || 1)) * 100) : 0
    };
  });
}
