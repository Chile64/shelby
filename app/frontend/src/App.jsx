import React, { useEffect, useMemo, useState } from "react";

export default function App() {
  // ---- State ----
  const [wallet, setWallet] = useState("");
  const [connected, setConnected] = useState(false);

  const [metrics, setMetrics] = useState(null);
  const [metricsErr, setMetricsErr] = useState("");

  const [blobList, setBlobList] = useState([]);
  const [selectedBlob, setSelectedBlob] = useState(null);

  const [search, setSearch] = useState("");
  const [blobError, setBlobError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // ---- Backend base (uses Vite proxy if you have it) ----
  // If your backend is NOT proxied, replace "" with "http://localhost:3000"
  const API_BASE = useMemo(() => "", []);

  // ---- Helpers ----
  async function fetchJson(path, options) {
    const res = await fetch(`${API_BASE}${path}`, options);
    const text = await res.text();
    // if server returns HTML error page, JSON.parse will fail — we show clean message
    try {
      const data = JSON.parse(text);
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      return data;
    } catch (e) {
      if (!res.ok) {
        throw new Error(`Request failed (${res.status}): ${text.slice(0, 160)}`);
      }
      // if ok but not json, still error
      throw new Error(`Expected JSON but got: ${text.slice(0, 160)}`);
    }
  }

  // ---- Wallet Connect (simple window.aptos) ----
  async function connectWallet() {
    try {
      if (!window.aptos?.connect) {
        alert(
          "No Aptos wallet detected. Install Petra / Martian / Pontem, then refresh."
        );
        return;
      }
      const res = await window.aptos.connect();
      const addr = res?.address || "";
      setWallet(addr);
      setConnected(!!addr);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  // ---- Metrics ----
  async function refreshMetrics() {
    try {
      setMetricsErr("");
      const m = await fetchJson("/metrics");
      setMetrics(m);
    } catch (e) {
      setMetricsErr(String(e?.message || e));
    }
  }

  // ---- Blobs ----
  async function loadBlobs() {
    try {
      setBlobError("");
      const data = await fetchJson("/blobs");
      const list = Array.isArray(data) ? data : data?.blobs || [];
      setBlobList(list);
      if (list.length && !selectedBlob) setSelectedBlob(list[0]);
    } catch (e) {
      setBlobError(String(e?.message || e));
    }
  }

  async function runSearch() {
    try {
      setBlobError("");
      const q = (search || "").trim();
      if (!q) {
        await loadBlobs();
        return;
      }
      const data = await fetchJson(`/search?q=${encodeURIComponent(q)}`);
      const list = Array.isArray(data) ? data : data?.blobs || [];
      setBlobList(list);
      setSelectedBlob(list[0] || null);
    } catch (e) {
      setBlobError(String(e?.message || e));
    }
  }

  // ---- Upload ----
  async function uploadAnalyticsBlob() {
    try {
      setUploading(true);
      setUploadResult(null);

      const w = (wallet || "").trim();
      if (!w) {
        alert("Enter wallet address (or click Connect Wallet).");
        return;
      }

      // simple “analytics” payload — you can upgrade later
      const payload = {
        wallet: w,
        footprint: Math.floor(Math.random() * 100000),
        createdAt: Date.now(),
        note: "Shelby dashboard test upload",
      };

      const data = await fetchJson("/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setUploadResult(data);
      await refreshMetrics();
      await loadBlobs();
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setUploading(false);
    }
  }

  // ---- Auto refresh on load ----
  useEffect(() => {
    refreshMetrics();
    loadBlobs();
    const t = setInterval(refreshMetrics, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- UI ----
  return (
    <div style={{ fontFamily: "system-ui, Arial", padding: 24, maxWidth: 1100 }}>
      <h1 style={{ marginBottom: 6 }}>Shelby Analytics Dashboard</h1>
      <div style={{ color: "#666", marginBottom: 16 }}>
        Explorer + Metrics + Wallet Identity (SDK-ready scaffold)
      </div>

      {/* Top Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* Wallet */}
        <div style={card}>
          <h3 style={h3}>Wallet</h3>
          <input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            style={input}
          />
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button onClick={connectWallet} style={btn}>
              {connected ? "Connected" : "Connect Wallet"}
            </button>
            <button
              onClick={() => {
                setConnected(false);
                setWallet("");
              }}
              style={btnSecondary}
            >
              Clear
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            Status:{" "}
            <b>{connected && wallet ? `${wallet.slice(0, 10)}...` : "Not connected"}</b>
          </div>
        </div>

        {/* Actions */}
        <div style={card}>
          <h3 style={h3}>Actions</h3>
          <button
            onClick={uploadAnalyticsBlob}
            style={{ ...btn, width: "100%" }}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Analytics Blob"}
          </button>

          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            Upload creates a blob + stores it in explorer history.
          </div>

          {uploadResult ? (
            <pre style={preSmall}>{JSON.stringify(uploadResult, null, 2)}</pre>
          ) : null}
        </div>

        {/* Metrics */}
        <div style={card}>
          <h3 style={h3}>Live Metrics</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <pill>uploads: {metrics?.uploads ?? "-"}</pill>
            <pill>blobs: {metrics?.blobs ?? "-"}</pill>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            serverTime:{" "}
            {metrics?.serverTime ? new Date(metrics.serverTime).toLocaleString() : "-"}
          </div>
          {metricsErr ? <div style={errBox}>{metricsErr}</div> : null}
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        {/* Explorer */}
        <div style={card}>
          <h3 style={h3}>Blob Explorer</h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by id, wallet, payload..."
              style={{ ...input, flex: 1, minWidth: 240 }}
            />
            <button onClick={runSearch} style={btn}>
              Search
            </button>
            <button onClick={loadBlobs} style={btnSecondary}>
              Refresh
            </button>
          </div>

          {blobError ? <div style={errBox}>{blobError}</div> : null}

          {blobList.length === 0 ? (
            <div style={{ color: "#777", fontSize: 13 }}>
              Upload a blob to see network activity appear here.
            </div>
          ) : (
            <div style={{ maxHeight: 360, overflow: "auto", paddingRight: 6 }}>
              {blobList.map((b) => (
                <div
                  key={String(b.id ?? Math.random())}
                  onClick={() => setSelectedBlob(b)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #eee",
                    marginBottom: 10,
                    cursor: "pointer",
                    background: selectedBlob?.id === b.id ? "#f2f2f2" : "white",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>
                    Blob #{String(b.id ?? "-")}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    wallet: {String(b.wallet || "").slice(0, 10)}...
                  </div>
                  <div style={{ fontSize: 12, color: "#999" }}>click to inspect →</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inspector */}
        <div style={card}>
          <h3 style={h3}>Selected Blob</h3>

          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(selectedBlob || {}, null, 2));
              alert("Copied!");
            }}
            style={btn}
            disabled={!selectedBlob}
          >
            Copy JSON
          </button>

          <pre style={pre}>
            {JSON.stringify(selectedBlob || {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ---- Small styles ----
const card = {
  border: "1px solid #e9e9e9",
  borderRadius: 14,
  padding: 16,
  background: "white",
};

const h3 = { margin: "0 0 10px 0" };

const input = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  outline: "none",
};

const btn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "white",
  cursor: "pointer",
};

const btnSecondary = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};

const pill = ({ children }) => (
  <span
    style={{
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid #eee",
      background: "#fafafa",
      fontSize: 12,
    }}
  >
    {children}
  </span>
);

const pre = {
  marginTop: 10,
  padding: 12,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #eee",
  minHeight: 240,
  overflow: "auto",
};

const preSmall = {
  marginTop: 10,
  padding: 10,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #eee",
  maxHeight: 160,
  overflow: "auto",
  fontSize: 12,
};

const errBox = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ffcccc",
  background: "#fff5f5",
  color: "#990000",
  fontSize: 12,
};
