# SURANTAKA POS — Aplikasi Kasir Web + PWA (Neumorphism)

Aplikasi kasir (Point of Sale) **100% client-side** berbasis **IndexedDB** + **Tailwind CSS**.
Bisa di-host di **GitHub Pages** (gratis, 24/7) atau dibuka langsung dari file (`file://`).

## Dua Mode

| Mode | Penjelasan | File yang dipakai |
|------|-----------|------------------|
| **🌐 Web (Flask)** | Server Python + SQLite, multi-device shared DB | `app.py`, `server.py`, `config/`, `models/`, `repositories/`, `services/` |
| **📱 Client-Side** | IndexedDB di browser, 1 device = 1 DB, deploy ke GitHub Pages | `frontend/` |

> **Mode saat ini:** Client-Side (IndexedDB) — siap deploy ke GitHub Pages.

---

## ✨ Fitur

| Modul | Admin | Kasir |
|-------|:-----:|:-----:|
| Dashboard (omset, profit, grafik 7 hari, stok menipis) | ✅ | ❌ |
| CRUD Produk (3 varian: Normal / Medium / Max + upload gambar) | ✅ | ❌ |
| CRUD Kategori | ✅ | ❌ |
| Transaksi Penjualan + Keranjang + Varian Pop-up | ✅ | ✅ |
| Checkout (diskon % / Rp, kembalian, atomic transaction) | ✅ | ✅ |
| Cetak Struk via `window.print()` (printer thermal 58mm) | ✅ | ✅ |
| Laporan Keuangan (filter tanggal + platform) | ✅ | ❌ |
| Pengaturan Toko & QR Code fleksibel (URL WA / upload gambar) | ✅ | ❌ |
| 🌙 **Dark / Light Mode** (toggle switch, anti-flash, persisten) | ✅ | ✅ |

Platform yang didukung: **Pickup, Take Away, GrabFood, ShopeeFood, GoFood**.

### 🌙 Dark Mode (Solid Flat)
Desain flat material dark menggunakan palet presisi:

| Token | Hex | Penggunaan |
|-------|-----|-----------|
| Main Background | `#121212` | Latar halaman utama |
| Cards / Sidebar / Input | `#3b3b3b` | Semua kontainer & formulir |
| Text & Icons | `#f6f6f6` | Teks utama, judul, ikon |
| Raised / Hover | `#484848` | Hover tombol/nav, elemen timbul |
| Inset | `#2a2a2a` | Input field, area cekung |

---

## 📱 PWA — Install ke Home Screen
- Buka URL POS di **Chrome** (Android) / **Safari** (iPhone)
- Chrome: tap **⋮** → **"Install app"**
- Safari: tap **↑** → **"Add to Home Screen"**
- Aplikasi muncul di home screen dengan ikon & nama toko Anda
- Full-screen, tanpa address bar, seperti aplikasi native!

---

## 🏗️ Arsitektur (Client-Side / IndexedDB)

```
frontend/
├── index.html              # SPA entry point
├── manifest.json           # PWA manifest (nama ikut settings)
├── sw.js                   # Service Worker (offline app-shell cache)
├── icons/                  # PWA icons
├── css/neu.css             # Custom styles + dark/light theme
└── js/
    ├── db.js               # IndexedDB layer (buka DB, CRUD, seeding)
    ├── backend.js          # Business logic (port dari Python services)
    ├── api.js              # Wrapper async → memanggil Backend.*
    ├── helpers.js           # Utility (formatRp, escape, fileToBase64, dll)
    ├── notify.js            # SweetAlert2 notifications
    ├── state.js             # App state (user, settings, cart)
    ├── theme.js             # Dark/Light theme manager
    ├── router.js            # SPA router + RBAC menu filter
    ├── app.js               # Bootstrap
    └── views/
        ├── login.js
        ├── dashboard.js
        ├── products.js
        ├── categories.js
        ├── transaction.js
        ├── reports.js
        └── settings.js
```

### Alur Data
1. `Db.init()` → buka IndexedDB, seed data awal jika DB baru
2. `Backend.*` → business logic (validasi, hitung diskon/profit, generate Order ID)
3. `API.*` → wrapper yang menegakkan RBAC (`requireAdmin`, `requireLogin`)
4. Views (`*View.render()`) → memanggil `API.*`, render UI

---

## 🚀 Deploy ke GitHub Pages

### Cara Paling Mudah: Deploy folder `frontend/`

1. **Push ke GitHub**
   ```bash
   cd kasir
   git init
   git add .
   git commit -m "Initial commit: SURANTAKA POS"
   git remote add origin https://github.com/USERNAME/kasir.git
   git push -u origin main
   ```

2. **Aktifkan GitHub Pages**
   - Buka repo di GitHub → **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` — folder: `/ (root)` atau `/frontend`
   - Jika root: buat file `index.html` di root yang redirect ke `frontend/`
   - **Rekomendasi**: set folder ke `/frontend` agar langsung serve

3. **Buka aplikasi**
   ```
   https://USERNAME.github.io/kasir/
   ```
   (atau `https://USERNAME.github.io/kasir/frontend/` jika deploy dari root)

### Jika deploy dari root (tanpa set folder)
File `index.html` di root akan otomatis redirect ke `frontend/`.

---

## 🧪 Uji Coba Lokal

### Opsi 1: Buka langsung di browser
Cukup double-click `frontend/index.html` — tidak perlu server!
IndexedDB bekerja normal dari `file://` protocol.

### Opsi 2: HTTP server lokal (untuk Service Worker)
Service Worker hanya bisa di-serve dari HTTP/HTTPS (bukan `file://`).
```bash
cd frontend
# Python
python -m http.server 5000
# atau Node.js
npx serve .
```
Buka `http://localhost:5000`

### Login default
| Role  | Username | Password |
|-------|----------|----------|
| Admin | `admin`  | `admin`  |
| Kasir | `kasir`  | `kasir`  |

---

## ⚠️ Perbedaan Mode Client-Side vs Server

| Aspek | Server (Flask) | Client-Side (IndexedDB) |
|-------|---------------|------------------------|
| Database | SQLite (server) | IndexedDB (browser) |
| Multi-device | ✅ shared DB | ❌ 1 browser = 1 DB |
| Cetak struk | Silent via Win32 GDI | Dialog `window.print()` |
| Gambar produk | File di server disk | Base64 di IndexedDB |
| Hosting | Butuh server Python | GitHub Pages (gratis) |
| Offline | ❌ butuh server | ✅ PWA offline-ready |

---

## 📦 File Server (Flask) — Referensi

File-file Python di root folder (`app.py`, `server.py`, `config/`, `models/`,
`repositories/`, `services/`) adalah versi server yang masih bisa dipakai secara
mandiri. Untuk menjalankan mode server:

```bash
pip install -r requirements.txt
python app.py
```

---

## 📦 Dependensi

**Frontend (CDN — tidak perlu install):**
- Tailwind CSS
- SweetAlert2
- Chart.js
- Cropper.js

**Server (opsional — untuk mode Flask):**
```
Flask>=3.0
qrcode>=7.4
Pillow>=10.0
pywin32>=306  # Windows-only, cetak struk server-side
```

---

## 🔒 Catatan Keamanan

Password disimpan plain-text untuk kesederhanaan. Untuk produksi:
- Hash password (mis. `bcrypt` / `argon2`)
- Data IndexedDB bisa di-inspect dari DevTools — jangan simpan data sensitif
