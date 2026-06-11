# SiMRT RT 05 — Backend Server

Express.js backend untuk integrasi Midtrans Snap + Firebase Admin.

---

## Setup Cepat

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Setup environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
MIDTRANS_SERVER_KEY=SB-Mid-server-GANTI_DENGAN_SERVER_KEY_ANDA
MIDTRANS_CLIENT_KEY=Mid-client-ctC99iAlzQNhSwl0
MIDTRANS_IS_PRODUCTION=false
PORT=3001
FRONTEND_URL=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

> **Dapatkan Server Key:**
> Midtrans Dashboard → Settings → Access Keys → Server Key

### 3. Download Firebase Service Account

1. Firebase Console → Project Settings → Service Accounts
2. Klik "Generate new private key"
3. Simpan file sebagai `backend/serviceAccountKey.json`

### 4. Buat akun Admin (satu kali)

```bash
npm run setup
```

Output:
```
✅ Firebase Auth user dibuat: ketua@rt05kapasan.id
✅ Firestore document dibuat: users/<UID>
── Login Credentials ──
   Email    : ketua@rt05kapasan.id
   Password : Admin@RT05!
```

### 5. Jalankan server

```bash
npm run dev    # Development (auto-restart)
npm start      # Production
```

Server berjalan di: `http://localhost:3001`

---

## Endpoint

| Method | Path | Keterangan |
|--------|------|------------|
| GET | /health | Health check |
| POST | /create-transaction | Buat transaksi Midtrans |
| POST | /midtrans-webhook | Terima notifikasi pembayaran |

---

## Setup Webhook Midtrans

### Development (dengan ngrok)

```bash
# Install ngrok: https://ngrok.com
ngrok http 3001
```

Copy URL: `https://xxxx.ngrok.io`

Di Midtrans Dashboard:
- Settings → Configuration → Payment Notification URL
- Isi: `https://xxxx.ngrok.io/midtrans-webhook`

### Production

Ganti dengan URL deployed backend:
- `https://your-backend.railway.app/midtrans-webhook`

---

## Deploy Backend

### Railway (Recommended)

1. Push ke GitHub
2. Buat proyek baru di [railway.app](https://railway.app)
3. Connect repo → pilih folder `backend`
4. Set environment variables di dashboard
5. Copy URL → update `VITE_BACKEND_URL` di frontend

### Render

1. New Web Service → Connect repo
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Set environment variables

---

## Alur Pembayaran

```
Warga klik "Bayar"
       ↓
Frontend → POST /create-transaction
       ↓
Backend → Midtrans API → snap_token
       ↓
Frontend → window.snap.pay(token)
       ↓
Midtrans Popup (QRIS / Bank / E-wallet)
       ↓
User membayar
       ↓
Midtrans → POST /midtrans-webhook (backend)
       ↓
Backend verifikasi signature
       ↓
Firestore: iuran.status = "Lunas"
       ↓
Frontend onSnapshot → UI update otomatis ✅
```
