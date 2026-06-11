/**
 * ════════════════════════════════════════════════════════════
 *  SiMRT RT 05 — Backend Server
 *  Stack : Express.js + Midtrans + Firebase Admin
 *  Mode  : Sandbox (set MIDTRANS_IS_PRODUCTION=true for live)
 * ════════════════════════════════════════════════════════════
 *
 *  Endpoints:
 *    POST /create-transaction   → returns snap_token
 *    POST /midtrans-webhook     → handles payment notification
 *    GET  /health               → health check
 *
 *  DEPLOY OPTIONS:
 *    Local  : node server.js (or npm run dev)
 *    Railway: Connect repo, set env vars in dashboard
 *    Render : Connect repo, set env vars in dashboard
 */

"use strict";

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const midtrans   = require("midtrans-client");
const admin      = require("firebase-admin");
const crypto     = require("crypto");

// ─── Validate required env vars ──────────────────────────────────────────────
const REQUIRED_ENV = ["MIDTRANS_SERVER_KEY", "MIDTRANS_CLIENT_KEY"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[FATAL] Missing env vars: ${missing.join(", ")}`);
  console.error("Copy .env.example → .env and fill in the values.");
  process.exit(1);
}

// ─── Firebase Admin Init ─────────────────────────────────────────────────────
function initFirebase() {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Option B: inline JSON (for cloud deployment)
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(sa) });
    } else {
      // Option A: file path
      const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";
      const sa     = require(saPath);
      admin.initializeApp({ credential: admin.credential.cert(sa) });
    }
    console.log("[Firebase] Admin SDK initialized");
  } catch (err) {
    console.error("[Firebase] Init failed:", err.message);
    console.error(
      "Download Service Account from: Firebase Console → Project Settings → Service Accounts"
    );
    process.exit(1);
  }
}

initFirebase();
const db = admin.firestore();

(async () => {
  try {
    const test = await db.collection("_test").limit(1).get();
    console.log("Firestore TEST SUCCESS");
  } catch (err) {
    console.error("Firestore TEST FAILED");
    console.error(err);
  }
})();

// ─── Midtrans Snap Init ───────────────────────────────────────────────────────
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

// Trim keys to remove any whitespace
const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
const clientKey = (process.env.MIDTRANS_CLIENT_KEY || "").trim();

if (!serverKey || !clientKey) {
  console.error("[FATAL] Midtrans keys are missing or empty after trimming");
  console.error("  - MIDTRANS_SERVER_KEY:", serverKey ? "SET" : "EMPTY");
  console.error("  - MIDTRANS_CLIENT_KEY:", clientKey ? "SET" : "EMPTY");
  process.exit(1);
}

const snap = new midtrans.Snap({
  isProduction,
  serverKey,
  clientKey,
});

console.log(`[Midtrans] Mode: ${isProduction ? "PRODUCTION" : "SANDBOX"}`);
console.log(`[Midtrans] Server Key: ${serverKey.substring(0, 15)}...`);
console.log(`[Midtrans] Client Key: ${clientKey.substring(0, 15)}...`);

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();

// CORS — allow React frontend
const allowedOrigins = [
  (process.env.FRONTEND_URL || "").replace(/\/$/, ""),
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow Postman / curl (no origin) or allowed origins
      if (
  !origin ||
  allowedOrigins.includes(origin.replace(/\/$/, ""))
)
 return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods:     ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:      "ok",
    service:     "SiMRT RT 05 Backend",
    environment: isProduction ? "production" : "sandbox",
    timestamp:   new Date().toISOString(),
  });
});

//COR TEST
app.get("/cors-test", (req, res) => {
  res.json({
    frontendUrl: process.env.FRONTEND_URL,
    origin: req.headers.origin || null,
  });
});

// ─── Midtrans Diagnostic Check ────────────────────────────────────────────────
app.get("/midtrans-check", (_req, res) => {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  const clientKey = (process.env.MIDTRANS_CLIENT_KEY || "").trim();
  
  const issues = [];
  if (!serverKey) issues.push("MIDTRANS_SERVER_KEY tidak ter-set di .env");
  if (!clientKey) issues.push("MIDTRANS_CLIENT_KEY tidak ter-set di .env");
  if (serverKey && !serverKey.startsWith("Mid-server-")) issues.push("MIDTRANS_SERVER_KEY format tidak sesuai (harus diawali 'Mid-server-')");
  if (clientKey && !clientKey.startsWith("Mid-client-")) issues.push("MIDTRANS_CLIENT_KEY format tidak sesuai (harus diawali 'Mid-client-')");
  
  res.json({
    status: issues.length === 0 ? "ok" : "error",
    environment: isProduction ? "production" : "sandbox",
    serverKeySet: !!serverKey,
    clientKeySet: !!clientKey,
    serverKeyPreview: serverKey ? serverKey.substring(0, 15) + "..." : "NOT SET",
    clientKeyPreview: clientKey ? clientKey.substring(0, 15) + "..." : "NOT SET",
    issues,
    timestamp: new Date().toISOString(),
  });
});

// ─── POST /create-transaction ─────────────────────────────────────────────────
/**
 * Body: { amount, iuranId, namaWarga, email, bulan }
 * Returns: { snapToken, orderId }
 */
app.post("/create-transaction", async (req, res) => {
  try {
    const { amount, iuranId, namaWarga, email, bulan } = req.body;

    // ── Validate input ──
    if (!amount || !iuranId || !namaWarga || !bulan) {
      return res.status(400).json({
        error: "Field wajib: amount, iuranId, namaWarga, bulan",
      });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "amount harus berupa angka positif" });
    }

    // ── Build unique order ID ──
    const orderId = `TRX-${iuranId}-${Date.now()}`;

    // ── Midtrans transaction parameters ──
    const parameter = {
      transaction_details: {
        order_id:     orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: namaWarga,
        email:      email || "warga@rt05kapasan.id",
        phone:      "",
      },
      item_details: [
        {
          id:       iuranId,
          price:    amount,
          quantity: 1,
          name:     `Iuran Bulanan RT 05 Kapasan — ${bulan}`,
          category: "Iuran",
          merchant_name: "RT 05 Kapasan, Simokerto, Surabaya",
        },
      ],
      credit_card: {
        secure: true,
      },
    };

    // ── Create transaction at Midtrans ──
    const transaction = await snap.createTransaction(parameter);

    // ── Persist order mapping in Firestore ──
    await db.collection("payment_orders").doc(orderId).set({
      iuranId,
      namaWarga,
      bulan,
      amount,
      email:      email || "",
      snapToken:  transaction.token,
      status:     "pending",
      createdAt:  admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[Payment] Created: ${orderId} | ${namaWarga} | ${bulan} | Rp ${amount}`);

    return res.json({
      snapToken: transaction.token,
      orderId,
    });
  } catch (err) {
    console.error("[/create-transaction] Error:", err);
    console.error("[/create-transaction] Midtrans Keys Status:");
    console.error("  - Server Key set:", !!serverKey);
    console.error("  - Client Key set:", !!clientKey);
    console.error("  - Server Key preview:", serverKey.substring(0, 15) + "...");
    console.error("  - Production mode:", isProduction);
    console.error("[/create-transaction] Full error details:", {
      message: err.message,
      status: err.status,
      httpStatusCode: err.httpStatusCode,
      statusCode: err.statusCode,
      body: err.body ? JSON.parse(err.body) : null,
    });
    
    const errorMessage = err.httpStatusCode === 401 
      ? "Autentikasi Midtrans gagal. Periksa Server Key di backend .env"
      : err.message || "Terjadi kesalahan pada server";
    
    return res.status(500).json({
      error: errorMessage,
    });
  }
});

// ─── POST /midtrans-webhook ────────────────────────────────────────────────────
/**
 * Midtrans calls this endpoint with payment status updates.
 * Register this URL at: Midtrans Dashboard → Settings → Configuration → Payment Notification URL
 * Use a public URL (ngrok for dev, deployed URL for prod).
 */
app.post("/midtrans-webhook", async (req, res) => {
  try {
    const notification = req.body;
    const orderId      = notification.order_id;

    if (!orderId) {
      return res.status(400).json({ error: "Missing order_id" });
    }

    // ── Verify notification authenticity ──
    // Midtrans signature: SHA512(order_id + status_code + gross_amount + server_key)
    const serverKey       = process.env.MIDTRANS_SERVER_KEY;
    const signatureString = `${orderId}${notification.status_code}${notification.gross_amount}${serverKey}`;
    const expectedSig     = crypto.createHash("sha512").update(signatureString).digest("hex");

    if (notification.signature_key !== expectedSig) {
      console.warn(`[Webhook] Invalid signature for order ${orderId}`);
      return res.status(403).json({ error: "Invalid signature" });
    }

    // ── Fetch verified status from Midtrans (don't rely on raw POST body) ──
    const statusResponse      = await snap.transaction.notification(notification);
    const transactionStatus   = statusResponse.transaction_status;
    const fraudStatus         = statusResponse.fraud_status;
    const paymentType         = statusResponse.payment_type;
    const transactionId       = statusResponse.transaction_id;

    console.log(`[Webhook] ${orderId} | status: ${transactionStatus} | fraud: ${fraudStatus}`);

    // ── Determine payment outcome ──
    let finalStatus = "pending";

    if (
      transactionStatus === "capture" && fraudStatus === "accept" ||
      transactionStatus === "settlement"
    ) {
      finalStatus = "settlement"; // ✅ Paid
    } else if (
      transactionStatus === "deny"   ||
      transactionStatus === "cancel" ||
      transactionStatus === "expire"
    ) {
      finalStatus = "failed";
    } else if (transactionStatus === "pending") {
      finalStatus = "pending";
    }

    // ── Update payment_orders document ──
    await db.collection("payment_orders").doc(orderId).update({
      status:        finalStatus,
      transactionId: transactionId || null,
      paymentType:   paymentType   || null,
      updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
      rawStatus:     transactionStatus,
    });

    // ── On settlement: update the iuran document ──
    if (finalStatus === "settlement") {
      const orderDoc = await db.collection("payment_orders").doc(orderId).get();

      if (orderDoc.exists) {
        const { iuranId } = orderDoc.data();

        await db.collection("iuran").doc(iuranId).update({
          status:      "Lunas",
          tanggal:     new Date().toISOString().split("T")[0],
          paidAt:      admin.firestore.FieldValue.serverTimestamp(),
          referenceId: orderId,
          paymentMethod: paymentType || "midtrans",
        });

        console.log(`[Webhook] ✅ Iuran ${iuranId} marked LUNAS | order: ${orderId}`);
      }
    }

    // ── Always return 200 to Midtrans ──
    return res.status(200).json({ status: "OK" });
  } catch (err) {
    console.error("[/midtrans-webhook] Error:", err);
    // Still return 200 to prevent Midtrans from retrying indefinitely
    return res.status(200).json({ status: "error", message: err.message });
  }
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, () => {
  console.log("\n══════════════════════════════════════════════");
  console.log("  SiMRT RT 05 — Backend Server");
  console.log(`  URL      : http://localhost:${PORT}`);
  console.log(`  Mode     : ${isProduction ? "🔴 PRODUCTION" : "🟡 SANDBOX"}`);
  console.log("══════════════════════════════════════════════\n");
  console.log("Endpoints tersedia:");
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/create-transaction`);
  console.log(`  POST http://localhost:${PORT}/midtrans-webhook`);
  console.log("\nWebhook URL untuk Midtrans Dashboard:");
  console.log("  Dev  : https://YOUR-NGROK-ID.ngrok.io/midtrans-webhook");
  console.log("  Prod : https://your-backend.railway.app/midtrans-webhook\n");
});