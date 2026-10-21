# Farrel - Persona Web Chat & Admin Dashboard

Aplikasi web persona yang menirukan gaya bahasa, kepribadian, dan cara pandang **Farrel** menggunakan **Google Gemini API**, dilengkapi dengan pelacakan perangkat, penyimpanan riwayat ke **Firebase Firestore / file .txt lokal**, dan **Dasbor Admin** rahasia.

Desain antarmuka dibuat **90%+ persis** dengan gambar referensi:
- Latar matte dark (`#222225`)
- Judul hybrid: **"Hai, FARREL here!"** (font *Bricolage Grotesque* pada "Hai, here!" & font serif slate-blue `#98abc3` pada `FARREL`)
- Subtitle: *"Tanya aja apapun deh serius tapi ojo kenemenen token e sengaja tk buat dikit, hehehe"*
- Input pill rounded abu-abu (`#5e5f6e`) dengan tombol kirim squircle (`#9eb1c7`) dan ikon panah atas `↑`
- Disclaimer: *"Bukan Farrel asli langsung, jawabannya bisa keliru."*
- Footer: `@Created by FarreL`

---

## 🚀 Fitur Utama

1. **Ultra-Lightweight & Cepat**
   - Murni **HTML5, CSS3, & Vanilla JS** di frontend (tanpa React/Next.js/bundler yang berat). Waktu muat instan (<50ms).
   - Backend menggunakan **Node.js 24 + Express**.
2. **Hemat Token & 90% Mirip Karakter Farrel**
   - Menggunakan teknik *High-Density Persona* (< 400 token system instruction).
   - Bebas dari bahasa kaku/robotik AI (dilarang jawab *"Sebagai AI..."* atau *"Tentu! Ada yang bisa saya bantu?"*).
   - Menggunakan gaya bahasa santai sehari-hari khas Jawa kasual (*"santai ae"*, *"ojo kenemenen"*, *"iyo"*, *"ancene"*, *"hehehe"*).
3. **Penyimpanan Isi Pikiran & Pandangan Diri (`config/farrel-mind.json`)**
   - Kamu bisa memasukkan isi pikiran, prinsip, dan opinimu sebanyak apa pun ke file ini.
   - Sistem secara pintar hanya mengambil potongan pikiran yang cocok dengan pertanyaan pengunjung agar **tetap hemat token**.
4. **Pelacakan Perangkat (Device Tracking)**
   - Setiap pengunjung diberi UUID unik yang disimpan di browser.
   - Sistem mencatat tipe perangkat pengunjung (misal: *iPhone*, *Android*, *Windows PC / Chrome*).
5. **Penyimpanan Log Percakapan (Firebase Firestore & File .TXT)**
   - Jika kredensial Firebase belum dipasang, sistem **secara otomatis mencatat log ke file `data/chat-log.txt`** dan `data/devices.json`.
   - Jika Firebase dipasang, data otomatis tersinkronisasi ke Cloud Firestore.
6. **Dasbor Admin Terproteksi (`/admin`)**
   - Melihat total pengunjung/perangkat yang mencoba web.
   - Melihat riwayat percakapan lengkap per perangkat.
   - Mencari chat berdasarkan kata kunci.
   - Tombol satu-klik untuk mengunduh log chat dalam format `.txt`.

---

## 📁 Struktur Direktori

```text
Farrels/
├── public/                       # Frontend statis
│   ├── index.html                # Tampilan chat utama
│   ├── admin.html                # Halaman dasbor admin
│   └── assets/
│       ├── css/
│       │   ├── base.css          # Variabel warna & typography
│       │   ├── chat.css          # Styling chat & transisi
│       │   └── admin.css         # Styling dasbor admin
│       └── js/
│           ├── api.js            # Fetcher API
│           ├── chat.js           # Logika interaksi chat & streaming
│           ├── admin.js          # Logika dasbor admin & autentikasi
│           └── utils/device.js   # UUID & platform detector
├── config/
│   ├── persona.json              # Aturan gaya bahasa, identitas & few-shots
│   ├── farrel-mind.json          # File isi pikiran, prinsip & pandangan hidup
│   └── serviceAccountKey.json    # Kredensial Firebase (opsional)
├── data/
│   ├── chat-log.txt              # Log chat terformat rapi yang bisa langsung dibaca
│   ├── devices.json              # Data perangkat pengunjung
│   └── chats.json                # JSON data percakapan
├── src/
│   ├── server.js                 # Entry point server
│   ├── app.js                    # Inisialisasi Express & routing
│   ├── routes/                   # Endpoint /api/chat dan /api/admin
│   ├── controllers/              # Handler logika chat & admin
│   ├── services/                 # Gemini API, Firebase & Persona Engine
│   ├── middlewares/              # Proteksi admin & error handler
│   └── utils/logger.js           # Logger file lokal otomatis
├── tests/                        # Unit test suite
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🛠️ Cara Menjalankan Aplikasi

### 1. Masukkan API Key Google Gemini
Buka file `.env` di root folder, lalu isi API Key dari [Google AI Studio](https://aistudio.google.com/):
```env
PORT=3000
GEMINI_API_KEY=AIzaSy...Isi_API_Key_Kamu_Di_Sini...
GEMINI_MODEL=gemini-1.5-flash
ADMIN_PASSWORD=farrel123
```
*(Catatan: Jika API key belum diisi, bot tetap bisa dijalankan dalam mode demo/fallback).*

### 2. Jalankan Server
Buka terminal di folder proyek, lalu jalankan:
```bash
# Menjalankan server
npm start

# Atau mode development (auto-reload jika kode diubah)
npm run dev
```

Buka browser di:
👉 **Halaman Chat:** [http://localhost:3000](http://localhost:3000)  
👉 **Dasbor Admin:** [http://localhost:3000/admin](http://localhost:3000/admin) *(Password default: `farrel123`)*

---

## 🧠 Cara Mengubah & Memasukkan Isi Pikiranmu

Kamu bisa langsung mengedit 2 file di folder `config/` kapan saja menggunakan text editor:

1. **`config/farrel-mind.json`**: Masukkan pandangan hidup, hobi, dan opinimu tentang berbagai hal (teknologi, sekolah, pertemanan, dll).
2. **`config/persona.json`**: Ubah kosakata slang favorit, aturan gaya ketik, atau tambahkan contoh tanya-jawab khas kamu.

---

## ☁️ Menghubungkan ke Firebase Firestore (Opsional)

Jika kamu ingin chat tersimpan langsung ke Google Cloud Firestore:
1. Buat proyek baru di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Firestore Database**.
3. Buka **Project Settings -> Service Accounts -> Generate New Private Key**.
4. Simpan file JSON tersebut di `config/serviceAccountKey.json`.
5. Restart server (`npm start`). Log chat akan otomatis disinkronkan ke Firestore!

---

## 🚀 Cara Publish / Deploy ke Vercel

Aplikasi ini sudah dikonfigurasi penuh dengan `vercel.json` dan serverless entrypoint `api/index.js`.

### Opsi A: Lewat Vercel CLI (Paling Cepat)
1. Buka terminal di folder proyek ini:
   ```bash
   npx vercel
   ```
2. Ikuti instruksi login dan pilih `Y` untuk deploy.
3. Tambahkan Environment Variable di dasbor Vercel (atau lewat CLI `npx vercel env add`):
   - `GEMINI_API_KEY`: API Key Gemini kamu
   - `ADMIN_PASSWORD`: Password dasbor admin (misal: `farrel123`)

### Opsi B: Lewat GitHub
1. Upload folder proyek ke repository GitHub pribadimu.
2. Buka [vercel.com](https://vercel.com) dan klik **Add New Project**.
3. Import repository GitHub tersebut.
4. Di bagian **Environment Variables**, masukkan:
   - `GEMINI_API_KEY`
   - `ADMIN_PASSWORD`
5. Klik **Deploy**! Web kamu langsung live dengan URL `https://farrel-xxxx.vercel.app`.

---

## 🧪 Menjalankan Pengujian (Testing)

Aplikasi dilengkapi dengan automated test suite:
```bash
npm test
```
Semua 10 unit test berjalan dalam waktu <300ms.
