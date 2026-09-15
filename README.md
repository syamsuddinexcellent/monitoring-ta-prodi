# 📊 Dashboard Monitoring Tugas Akhir (TA) - Prodi Sains Data

Aplikasi web modern interaktif untuk memantau progres dan bimbingan mahasiswa Tugas Akhir (TA) tingkat Program Studi Sains Data ITERA secara mingguan, terintegrasi langsung dengan multi-tab Google Spreadsheet.

---

## ✨ Fitur Utama

1. **Sinkronisasi Otomatis 3 Tab Google Sheets**:
   - Terhubung langsung ke spreadsheet Prodi: `https://docs.google.com/spreadsheets/d/1Z7rI4N-qnRxmClLVmOCN6khWYzHpZbI_sIiif-xW9LM/`
   - Sinkronisasi serentak untuk Angkatan 2020 (`gid=0`), 2021 (`gid=436428123`), dan 2022 (`gid=166410248`).
   - Resolusi otomatis NIM 9-digit untuk seluruh 119 mahasiswa prodi berdasarkan basis data master Sains Data.
   - Tombol **"Sinkronkan"** untuk memperbarui data seketika tanpa perlu restart aplikasi.
   - Dilengkapi fallback lokal (`public/fallback_data.json` dan `public/data.csv`) bila offline.

2. **Dukungan Metadata Lengkap Tingkat Prodi**:
   - Menampilkan **Dosen Pembimbing 1**, **Dosen Pembimbing 2**, dan **Dosen Penguji 1**.
   - Informasi tahapan **Status TA** (*Sudah Sempro*, *Belum Sempro*, *Baru Sempro*) dan **Target** (*Semhas*, *Sidang*).
   - Catatan progres mingguan dan target pekan berikutnya.

3. **Ringkasan Metrik & KPI Prodi**:
   - Total Mahasiswa Prodi (119 mahasiswa).
   - Jumlah & persentase **Sudah Melapor (On Track)**.
   - Jumlah & persentase **Belum Melapor (Perlu Follow-up)**.
   - Fokus tahapan terbanyak pada pekan berjalan (Coding, Bab 4-5, Sempro, BAP).

4. **Visualisasi Data Interaktif (Recharts)**:
   - **Donut Chart**: Persentase kepatuhan pelaporan progres per pekan.
   - **Bar Chart**: Distribusi tahapan pengerjaan skripsi & toggle sebaran beban bimbingan per dosen.
   - **Trend Line Chart**: Tren keaktifan bimbingan mahasiswa lintas pekan.

5. **Multi-View Interface**:
   - **Tampilan Kartu (Grid View)**: Kartu mahasiswa visual dengan avatar, badge tahapan, info Dosen Pembimbing/Penguji, status TA, catatan progres, dan target pekan depan.
   - **Tampilan Tabel (Table View)**: Format ringkas untuk pemindaian cepat nama, NIM, angkatan, pembimbing, status, dan milestone.
   - **Tampilan Matriks Lintas Pekan (Matrix View)**: Menampilkan seluruh mahasiswa dan seluruh minggu dalam satu grid terintegrasi seperti spreadsheet cerdas dengan preview per sel.

6. **Pencarian & Multi-Filter Cerdas**:
   - Pencarian real-time berdasarkan Nama atau NIM.
   - Tombol Cepat: **"Mahasiswa Bimbingan Saya"** (khusus mahasiswa bimbingan Pak M. Syamsuddin Wisnubroto).
   - Filter Dosen Pembimbing (menampilkan mahasiswa di bawah dosen tertentu).
   - Filter Angkatan (Semua, 2020, 2021, 2022).
   - Filter Status Pelaporan (*Semua*, *Sudah Lapor*, *Belum Lapor*).
   - Filter Kategori Tahapan TA.

7. **Quick WhatsApp Reminder & WhatsApp Gateway**:
   - **Personal Reminder**: Membuat draf pesan pengingat sopan personal ke mahasiswa dengan tautan langsung WhatsApp Web.
   - **Format Broadcast Grup**: Membuat draf rekap otomatis seluruh mahasiswa yang belum mengisi formulir bimbingan untuk disalin ke grup WhatsApp bimbingan.
   - **WhatsApp Gateway Baileys (`server.js`)**: Pengiriman otomatis di latar belakang (*Auto-Send*) via scan QR Code pairing (port 3002).

8. **Ekspor Data CSV**:
   - Mengunduh rekapitulasi data mahasiswa sesuai filter dan pekan yang sedang dipilih ke file `.csv`.

---

## 🚀 Cara Menjalankan

### 1. Menjalankan Server Development (Frontend)
```bash
npm run dev
```
Akses di browser melalui: **`http://localhost:5174`**

### 2. Menjalankan WhatsApp Gateway (Opsional untuk Fitur Auto-Send)
```bash
npm run server
```
Gateway berjalan di port `3002`.

### 3. Membangun untuk Produksi (Build)
```bash
npm run build
```
Hasil file static HTML/JS siap pakai akan berada di folder `dist/`.
