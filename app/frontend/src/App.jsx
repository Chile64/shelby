import React from "react";
import { Network } from "@aptos-labs/ts-sdk";
import {
  AptosWalletAdapterProvider,
  useWallet,
} from "@aptos-labs/wallet-adapter-react";

/** Prevent blank screens: shows the real error instead */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.log("React crash:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "Arial" }}>
          <h2>App crashed (real error):</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p>Open DevTools → Console for full stack trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Convert wallet adapter address to a safe string */
function toAddrString(addr) {
  if (!addr) return "";
  if (typeof addr === "string") return addr;

  // Many Aptos libs use AccountAddress objects with .toString()
  if (typeof addr.toString === "function") return addr.toString();

  // If it’s something like { data: ... }, stringify safely
  try {
    return JSON.stringify(addr);
  } catch {
    return String(addr);
  }
}

function Dashboard() {
  const [blobList, setBlobList] = React.useState([]);
const [selectedBlob, setSelectedBlob] = React.useState(null);
const [search, setSearch] = React.useState("");
const [blobError, setBlobError] = React.useState("");

  const { wallets, connect, disconnect, account, connected } = useWallet();

  // IMPORTANT: always convert address to string before rendering or sending to API
  const walletAddr = toAddrString(account?.address);

  const [metrics, setMetrics] = React.useState(null);
  const [metricsError, setMetricsError] = React.useState("");

  const [lastUpload, setLastUpload] = React.useState(null);
  const [uploadError, setUploadError] = React.useState("");

  async function loadMetrics() {
    try {
      setMetricsError("");
      const res = await fetch("/metrics");
      if (!res.ok) {
        const text = await res.text();
        setMetricsError(`GET /metrics failed: ${res.status} ${text.slice(0, 120)}`);
        return;
      }
      setMetrics(await res.json());
    } catch (e) {
      setMetricsError(String(e?.message || e));
    }
  }

  async function uploadBlob() {
    async function loadBlobs() {
  try {
    setBlobError("");
    const res = await fetch("/blobs");
    if (!res.ok) throw new Error("Failed to load /blobs");
    const data = await res.json();
    setBlobList(data.blobs || []);
  } catch (e) {
    setBlobError(String(e?.message || e));
  }
}

async function runSearch() {
  try {
    setBlobError("");
    const q = search.trim();
    if (!q) {
      await loadBlobs();
      return;
    }
    const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    setBlobList(data.blobs || []);
  } catch (e) {
    setBlobError(String(e?.message || e));
  }
}

function selectBlob(b) {
  setSelectedBlob(b);
}

    try {
      setUploadError("");
      setLastUpload(null);

      if (!connected || !walletAddr) {
        setUploadError("Connect wallet first.");
        return;
      }

      const res = await fetch("/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddr }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        setUploadError(data?.error || `Upload failed: ${res.status}`);
        return;
      }

      setLastUpload(data);
      await loadBlobs();
      await loadMetrics();
    } catch (e) {
      setUploadError(String(e?.message || e));
    }
  }

  React.useEffect(() => {
  loadMetrics();
  loadBlobs();
  const t = setInterval(loadMetrics, 1500);
  return () => clearInterval(t);
}, []);

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Shelby Dashboard</h1>
      <p style={{ color: "#555" }}>Frontend: 5173 | Backend: 3000 (proxied)</p>

      {/* WALLET CARD */}
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, maxWidth: 900 }}>
        <h3 style={{ marginTop: 0 }}>Wallet</h3>

        <div style={{ marginBottom: 10 }}>
          <b>Status:</b>{" "}
          {connected ? (
            <span style={{ fontFamily: "monospace", fontSize: 12 }}>
              {walletAddr}
            </span>
          ) : (
            "Not connected"
          )}
        </div>

        {!connected ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {wallets.map((w) => (
              <button
                key={w.name}
                onClick={() => connect(w.name)}
                style={{ padding: "10px 12px", cursor: "pointer" }}
              >
                Connect {w.name}
              </button>
            ))}
            {wallets.length === 0 && (
              <div style={{ color: "#777" }}>
                No wallet detected. Install Petra/Martian/Rise then refresh.
              </div>
            )}
          </div>
        ) : (
          <button onClick={disconnect} style={{ padding: "10px 12px", cursor: "pointer" }}>
            Disconnect
          </button>
        )}
      </div>

      {/* UPLOAD CARD */}
      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 16, maxWidth: 900 }}>
        <h3 style={{ marginTop: 0 }}>Upload</h3>

        <button
          onClick={uploadBlob}
          disabled={!connected}
          style={{ padding: "10px 12px", cursor: connected ? "pointer" : "not-allowed" }}
        >
          Upload Analytics Blob
        </button>

        {!connected && <div style={{ marginTop: 8, color: "#777" }}>Connect wallet to enable upload.</div>}

        {uploadError && <div style={{ marginTop: 10, color: "crimson" }}>{uploadError}</div>}

        {lastUpload && (
          <pre style={{ marginTop: 12, background: "#f7f7f7", padding: 12, borderRadius: 10, overflow: "auto" }}>
            {JSON.stringify(lastUpload, null, 2)}
          </pre>
        )}
      </div>
      {/* BLOB EXPLORER */}
<div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 16, maxWidth: 900 }}>
  <h3 style={{ marginTop: 0 }}>Blob Explorer</h3>

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search by id, wallet, payload..."
      style={{ padding: 10, width: 320 }}
    />
    <button onClick={runSearch} style={{ padding: "10px 12px", cursor: "pointer" }}>
      Search
    </button>
    <button onClick={loadBlobs} style={{ padding: "10px 12px", cursor: "pointer" }}>
      Refresh
    </button>
  </div>

  {blobError && <div style={{ color: "crimson", marginBottom: 10 }}>{blobError}</div>}

  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, minHeight: 180 }}>
      <b>History</b>
      <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto" }}>
        {blobList.length === 0 ? (
          <div style={{ color: "#777" }}>No blobs yet. Upload one.</div>
        ) : (
          blobList.map((b) => (
            <div
              key={String(b.id)}
              onClick={() => selectBlob(b)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #eee",
                marginBottom: 8,
                cursor: "pointer",
                background: selectedBlob?.id === b.id ? "#f2f2f2" : "white",
              }}
            >
              <div><b>ID:</b> {String(b.id)}</div>
              <div style={{ fontFamily: "monospace", fontSize: 11 }}>
                {String(b.wallet || "").slice(0, 10)}...
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, minHeight: 180 }}>
      <b>Selected Blob</b>
      <pre style={{ marginTop: 10, background: "#f7f7f7", padding: 12, borderRadius: 10, overflow: "auto" }}>
        {JSON.stringify(selectedBlob ?? {}, null, 2)}
      </pre>
    </div>
  </div>
</div>


      {/* METRICS CARD */}
      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 16, maxWidth: 900 }}>
        <h3 style={{ marginTop: 0 }}>Live Metrics</h3>

        {metricsError && <div style={{ color: "crimson", marginBottom: 10 }}>{metricsError}</div>}

        <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 10, overflow: "auto" }}>
          {JSON.stringify(metrics ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AptosWalletAdapterProvider autoConnect={false} dappConfig={{ network: Network.TESTNET }}>
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>
    </AptosWalletAdapterProvider>
  );
}
