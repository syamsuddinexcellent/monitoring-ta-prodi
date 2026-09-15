import urllib.request, io, csv, json, os, zipfile, xml.etree.ElementTree as ET

GOOGLE_SPREADSHEET_ID = "1pj3negFYVU9nHrTVvnXW8an8soJrp2Kyfs3BVXG-eq0"
TABS = {
    "2020": "0",
    "2021": "436428123",
    "2022": "166410248"
}

def main():
    print("🔄 Memulai sinkronisasi data Monitoring TA Prodi langsung di memori (tanpa download file)...")

    # 1. Fetch CSV contents directly into memory via HTTP (Zero downloads, Zero residual files)
    tab_csv_contents = {}
    for year, gid in TABS.items():
        url = f"https://docs.google.com/spreadsheets/d/{GOOGLE_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid={gid}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                text = resp.read().decode("utf-8")
                if "<html" in text or "ServiceLogin" in text:
                    print("⚠️ Akses Google Sheet belum diubah ke \x27Siapa saja yang memiliki link\x27. Harap ubah izin akses di Google Sheet terlebih dahulu.")
                    return
                tab_csv_contents[year] = text
        except Exception as e:
            print(f"⚠️ Gagal mengambil data tab {year}: {e}")
            return
            
    print("✅ Berhasil mengunduh data langsung ke memori (tanpa file fisik).")

    # 2. Master DB for NIM
    db = {}
    master_xlsx = os.path.expanduser("~/Downloads/Progress Database TA All In.xlsx")
    if os.path.exists(master_xlsx):
        try:
            with zipfile.ZipFile(master_xlsx) as z:
                shared_strings = []
                if "xl/sharedStrings.xml" in z.namelist():
                    ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
                    for si in ss_root.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                        t = si.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                        shared_strings.append(t.text if t is not None else "")
                sheet_xml = z.read("xl/worksheets/sheet1.xml")
                root = ET.fromstring(sheet_xml)
                for row in root.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row")[1:]:
                    cells = []
                    for c in row.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                        v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
                        val = v.text if v is not None else ""
                        if c.attrib.get("t") == "s" and val.isdigit():
                            val = shared_strings[int(val)]
                        cells.append(val)
                    if len(cells) >= 2:
                        nama = cells[0].strip().lower()
                        nim_raw = cells[1].strip()
                        try:
                            nim = str(int(float(nim_raw)))
                        except:
                            nim = nim_raw
                        db[nama] = nim
        except Exception as e:
            print("Master DB read note:", e)

    # 3. Known phone numbers - hardcoded fallback + existing data
    phones = {
        "120450062": "6288219758365",
        "120450022": "6282388137794",
        "120450004": "6285817743940",
        "120450019": "6285279852167",
        "121450136": "6282377198091",
        "121450161": "6282183021387",
        "121450062": "6282340189456",
        "121450126": "6281373938153",
        "122450003": "6281285256067",
        "122450006": "6288286496048",
        "122450023": "6283132034836",
        "122450027": "628877325774",
        "122450039": "6289632152848",
        "122450109": "6289505121002",
        "122450117": "628978262875",
        "122450122": "6281267862044",
        "122450132": "6285173444166",
    }
    for candidate in ["public/data.csv", "../Monitoring TA MSW/public/data.csv"]:
        if os.path.exists(candidate):
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    for r in csv.DictReader(f):
                        if r.get("Nomor WA") and r.get("NIM"):
                            phones[r["NIM"].strip()] = r["Nomor WA"].strip()
            except:
                pass

    all_students = []
    week_columns_set = set()

    for year, csv_text in tab_csv_contents.items():
        rows = list(csv.reader(io.StringIO(csv_text)))
        if not rows:
            continue
        headers = [h.strip() for h in rows[0]]

        nama_idx = headers.index("Nama") if "Nama" in headers else -1
        nim_idx = -1
        for i, h in enumerate(headers):
            if h.lower() in ["nim", "afifa"]:
                nim_idx = i
                break

        wa_idx = next((i for i, h in enumerate(headers) if any(k in h.lower() for k in ["wa", "telepon", "hp"])), -1)
        p1_idx = next((i for i, h in enumerate(headers) if "pembimbing 1" in h.lower()), -1)
        p2_idx = next((i for i, h in enumerate(headers) if "pembimbing 2" in h.lower()), -1)
        pj_idx = next((i for i, h in enumerate(headers) if "penguji 1" in h.lower()), -1)
        pj2_idx = next((i for i, h in enumerate(headers) if "penguji 2" in h.lower()), -1)
        status_idx = next((i for i, h in enumerate(headers) if h.lower() == "status"), -1)
        target_idx = next((i for i, h in enumerate(headers) if h.lower() == "target"), -1)
        ket_idx = next((i for i, h in enumerate(headers) if "keterangan" in h.lower()), -1)
        dok_idx = next((i for i, h in enumerate(headers) if "dokumen" in h.lower()), -1)

        meta_indices = {nama_idx, nim_idx, wa_idx, p1_idx, p2_idx, pj_idx, pj2_idx, status_idx, target_idx, ket_idx, dok_idx}
        tab_weeks = [h for i, h in enumerate(headers) if i not in meta_indices and h and not h.startswith("Unnamed") and not h.startswith("_") and "keterangan" not in h.lower() and len(h) > 1]
        for w in tab_weeks:
            week_columns_set.add(w)

        for r in rows[1:]:
            if not r:
                continue
            nama = r[nama_idx].strip() if nama_idx != -1 and nama_idx < len(r) else ""
            if not nama or nama.lower() == "nama":
                continue

            nim = ""
            if nim_idx != -1 and nim_idx < len(r) and r[nim_idx].strip():
                val = r[nim_idx].strip()
                if val.isdigit() and len(val) >= 7:
                    nim = val
            if not nim and nama.lower() in db:
                nim = db[nama.lower()]
            if not nim:
                nim = f"12{year[2:]}450xxx"

            phone = ""
            if wa_idx != -1 and wa_idx < len(r) and r[wa_idx].strip():
                phone = r[wa_idx].strip()
            if not phone:
                phone = phones.get(nim, "")

            p1 = r[p1_idx].strip() if p1_idx != -1 and p1_idx < len(r) else ""
            p2 = r[p2_idx].strip() if p2_idx != -1 and p2_idx < len(r) else ""
            pj = r[pj_idx].strip() if pj_idx != -1 and pj_idx < len(r) else ""
            pj2 = r[pj2_idx].strip() if pj2_idx != -1 and pj2_idx < len(r) else ""
            status_ta = r[status_idx].strip() if status_idx != -1 and status_idx < len(r) else ""
            target = r[target_idx].strip() if target_idx != -1 and target_idx < len(r) else ""
            ket = r[ket_idx].strip() if ket_idx != -1 and ket_idx < len(r) else ""
            dok = r[dok_idx].strip() if dok_idx != -1 and dok_idx < len(r) else ""

            raw_updates = {}
            for w in tab_weeks:
                w_idx = headers.index(w)
                raw_updates[w] = r[w_idx].strip() if w_idx < len(r) else ""

            all_students.append({
                "nim": nim,
                "nama": nama,
                "angkatan": year,
                "phone": phone,
                "pembimbing1": p1,
                "pembimbing2": p2,
                "penguji1": pj,
                "penguji2": pj2,
                "statusTA": status_ta,
                "target": target,
                "keterangan": ket,
                "dokumenPendukung": dok,
                "rawUpdates": raw_updates
            })

    ordered_active_weeks = [
        "31 - 04 September 26",
        "07 - 11 September 26",
        "14 - 18 September 26",
        "21 - 25 September 26",
        "28 - 02 Oktober 26"
    ]
    active_weeks = [w for w in ordered_active_weeks if w in week_columns_set]
    other_weeks = [w for w in sorted(list(week_columns_set)) if w not in ordered_active_weeks]
    all_weeks = active_weeks + other_weeks

    output_data = {"students": all_students, "weeks": all_weeks}

    target_dirs = [".", "../Monitoring TA MSW"]
    for d in target_dirs:
        if os.path.exists(d):
            json_file = os.path.join(d, "public", "fallback_data.json")
            with open(json_file, "w", encoding="utf-8") as f:
                json.dump(output_data, f, indent=2)

            csv_file = os.path.join(d, "public", "data.csv")
            with open(csv_file, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                headers = ["NIM", "Nama", "Angkatan", "Nomor WA", "Pembimbing 1", "Pembimbing 2", "Penguji 1", "Penguji 2", "Status TA", "Target", "Dokumen Pendukung"] + all_weeks
                writer.writerow(headers)
                for s in all_students:
                    row = [
                        s["nim"],
                        s["nama"],
                        s["angkatan"],
                        s.get("phone", ""),
                        s.get("pembimbing1", ""),
                        s.get("pembimbing2", ""),
                        s.get("penguji1", ""),
                        s.get("penguji2", ""),
                        s.get("statusTA", ""),
                        s.get("target", ""),
                        s.get("dokumenPendukung", "")
                    ]
                    for w in all_weeks:
                        row.append(s["rawUpdates"].get(w, ""))
                    writer.writerow(row)
            print(f"✅ Data diperbarui di {d} (Total: {len(all_students)} mahasiswa, {len(all_weeks)} pekan)")

    print("✨ Sinkronisasi in-memory selesai tanpa download file apa pun!")

if __name__ == "__main__":
    main()
