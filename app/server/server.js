import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend folder (../frontend)
app.use(express.static(path.join(__dirname, "../frontend")));

// Simple metrics store (in memory)
let uploads = 0;
let lastUploadAt = null;
const blobs = []; // newest first

// POST /upload (mock “upload blob”)
app.post("/upload", async (req, res) => {
  try {
    const { wallet } = req.body || {};
    if (!wallet) return res.status(400).json({ error: "wallet is required" });

    uploads += 1;
    lastUploadAt = Date.now();

    const blob = {
      id: "blob_" + Math.random().toString(16).slice(2) + "_" + Date.now(),
      wallet,
      createdAt: Date.now(),
      payload: {
        type: "onchain_analytics_blob",
        metrics: [
          { block: 1, txs: 120, volume: 30 },
          { block: 2, txs: 98, volume: 22 },
          { block: 3, txs: 150, volume: 45 }
        ]
      }
    };

    blobs.unshift(blob);
    res.json(blob);
  } catch (e) {
    res.status(500).json({ error: e?.message || "upload failed" });
  }
});

// GET /metrics
app.get("/metrics", (req, res) => {
  res.json({
    uploads,
    blobCount: blobs.length,
    lastUploadAt,
    serverTime: Date.now()
  });
});

// GET /blobs (optional search)
app.get("/blobs", (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  if (!q) return res.json(blobs);

  const filtered = blobs.filter((b) =>
    JSON.stringify(b).toLowerCase().includes(q)
  );
  res.json(filtered);
});

// GET /blobs/:id
app.get("/blobs/:id", (req, res) => {
  const b = blobs.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: "not found" });
  res.json(b);
});

// POST /anchor (stub)
app.post("/anchor", (req, res) => {
  res.json({
    ok: true,
    note: "stub: will anchor to Aptos later",
    received: req.body || {}
  });
});

app.listen(3000, () => {
  console.log("✅ Shelby backend running on http://localhost:3000");
});

// List blobs (history)
app.get("/blobs", (req, res) => {
  res.json({ blobs: blobs.slice().reverse() }); // newest first
});

// Get one blob by id
app.get("/blobs/:id", (req, res) => {
  const id = req.params.id;
  const found = blobs.find((b) => String(b.id) === String(id));
  if (!found) return res.status(404).json({ error: "Blob not found" });
  res.json(found);
});

// Search blobs by wallet or payload text
app.get("/search", (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  if (!q) return res.json({ blobs: [] });

  const results = blobs
    .filter((b) => {
      const w = String(b.wallet || "").toLowerCase();
      const p = JSON.stringify(b.payload || "").toLowerCase();
      const id = String(b.id || "").toLowerCase();
      return w.includes(q) || p.includes(q) || id.includes(q);
    })
    .slice()
    .reverse();

  res.json({ blobs: results });
});
