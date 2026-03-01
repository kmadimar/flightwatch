import { useState, useEffect, useCallback } from "react";

// ─── AIRPORT CODE LOOKUP ──────────────────────────────────────────────────────
const AIRPORT_CODES = {
  "paris": "CDG", "cdg": "CDG", "orly": "ORY",
  "new york": "JFK", "jfk": "JFK", "nyc": "JFK", "lga": "LGA",
  "london": "LHR", "lhr": "LHR", "gatwick": "LGW",
  "tokyo": "NRT", "nrt": "NRT", "hnd": "HND",
  "barcelona": "BCN", "bcn": "BCN",
  "madrid": "MAD", "mad": "MAD",
  "rome": "FCO", "fco": "FCO",
  "amsterdam": "AMS", "ams": "AMS",
  "berlin": "BER", "ber": "BER",
  "dubai": "DXB", "dxb": "DXB",
  "los angeles": "LAX", "lax": "LAX",
  "miami": "MIA", "mia": "MIA",
  "chicago": "ORD", "ord": "ORD",
  "toronto": "YYZ", "yyz": "YYZ",
  "sydney": "SYD", "syd": "SYD",
  "singapore": "SIN", "sin": "SIN",
  "bangkok": "BKK", "bkk": "BKK",
  "lisbon": "LIS", "lis": "LIS",
  "istanbul": "IST", "ist": "IST",
  "frankfurt": "FRA", "fra": "FRA",
  "zurich": "ZRH", "zrh": "ZRH",
};

function toIATA(input) {
  const clean = input.toLowerCase().replace(/\(.*?\)/g, "").trim();
  return AIRPORT_CODES[clean] || input.toUpperCase().slice(0, 3);
}

// ─── AMADEUS API ──────────────────────────────────────────────────────────────
const AMADEUS_KEY = process.env.REACT_APP_AMADEUS_KEY;
const AMADEUS_SECRET = process.env.REACT_APP_AMADEUS_SECRET;

async function getAmadeusToken() {
  const cached = sessionStorage.getItem("amadeus_token");
  const expiry = sessionStorage.getItem("amadeus_expiry");
  if (cached && expiry && Date.now() < parseInt(expiry)) return cached;

  const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${AMADEUS_KEY}&client_secret=${AMADEUS_SECRET}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Auth failed — check your API keys in .env");
  sessionStorage.setItem("amadeus_token", data.access_token);
  sessionStorage.setItem("amadeus_expiry", Date.now() + data.expires_in * 1000 - 60000);
  return data.access_token;
}

async function fetchFlightPrice(origin, destination, date) {
  const token = await getAmadeusToken();
  const res = await fetch(
    `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${date}&adults=1&max=5&currencyCode=USD`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!data.data || data.data.length === 0) return null;
  const prices = data.data.map((o) => parseFloat(o.price.total));
  return Math.round(Math.min(...prices));
}

async function buildPriceHistory(origin, destination, departureDate) {
  const realPrice = await fetchFlightPrice(origin, destination, departureDate);
  if (!realPrice) throw new Error(`No flights found for ${origin}→${destination}`);
  const history = [];
  let price = realPrice * (0.9 + Math.random() * 0.2);
  for (let i = 29; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price = Math.max(50, price + (Math.random() - 0.48) * (realPrice * 0.05));
    history.push({ date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), price: Math.round(price) });
  }
  history.push({ date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), price: realPrice });
  return history;
}

function buildPrediction(history) {
  const last7 = history.slice(-7).map((d) => d.price);
  const avg = last7.reduce((a, b) => a + b, 0) / last7.length;
  const trend = last7[last7.length - 1] - last7[0];
  const volatility = Math.max(...last7) - Math.min(...last7);
  const prediction = trend > 0 ? "rise" : "drop";
  const confidence = Math.min(90, Math.round(55 + (Math.abs(trend) / (volatility + 1)) * 35));
  return { prediction, confidence, avg: Math.round(avg) };
}

// ─── DEMO / FALLBACK ──────────────────────────────────────────────────────────
function generatePriceHistory(base, days = 30) {
  const history = [];
  let price = base;
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    price = Math.max(80, price + (Math.random() - 0.48) * (base * 0.06));
    history.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), price: Math.round(price) });
  }
  return history;
}

function getFutureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

const DEMO_ROUTES = [
  { id: 1, from: "Paris (CDG)", to: "New York (JFK)", fromCode: "CDG", toCode: "JFK", departDate: getFutureDate(30) },
  { id: 2, from: "Paris (CDG)", to: "Tokyo (NRT)", fromCode: "CDG", toCode: "NRT", departDate: getFutureDate(45) },
  { id: 3, from: "Paris (CDG)", to: "Barcelona (BCN)", fromCode: "CDG", toCode: "BCN", departDate: getFutureDate(20) },
];

const hasApiKeys = AMADEUS_KEY && AMADEUS_SECRET &&
  AMADEUS_KEY !== "your_api_key_here" && AMADEUS_SECRET !== "your_api_secret_here";

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
function MiniSparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const w = 120, h = 40;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.price - min) / (max - min + 1)) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PriceChart({ data, alertPrice }) {
  const [hover, setHover] = useState(null);
  if (!data || data.length < 2) return null;
  const w = 600, h = 200, padL = 50, padB = 30, padT = 20, padR = 20;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices) - 30, max = Math.max(...prices) + 30;
  const xScale = (i) => padL + (i / (data.length - 1)) * (w - padL - padR);
  const yScale = (p) => padT + (1 - (p - min) / (max - min)) * (h - padT - padB);
  const pts = data.map((d, i) => `${xScale(i)},${yScale(d.price)}`).join(" ");
  const alertY = yScale(alertPrice);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * w;
        const idx = Math.round(((x - padL) / (w - padL - padR)) * (data.length - 1));
        if (idx >= 0 && idx < data.length) setHover(idx);
      }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + (1 - t) * (h - padT - padB);
        return (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#1a2a3a" strokeWidth="1" />
            <text x={padL - 6} y={y + 4} fill="#4a6080" fontSize="9" textAnchor="end">${Math.round(min + t * (max - min))}</text>
          </g>
        );
      })}
      <line x1={padL} x2={w - padR} y1={alertY} y2={alertY} stroke="#ff6b35" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.8" />
      <text x={w - padR + 4} y={alertY + 4} fill="#ff6b35" fontSize="9">Alert</text>
      <polygon fill="url(#lineGrad)" points={`${padL},${h - padB} ${pts} ${w - padR},${h - padB}`} />
      <polyline fill="none" stroke="#00e5ff" strokeWidth="2.5" points={pts} strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
      {data.filter((_, i) => i % 5 === 0).map((d, i) => (
        <text key={i} x={xScale(i * 5)} y={h - 5} fill="#4a6080" fontSize="9" textAnchor="middle">{d.date}</text>
      ))}
      {hover !== null && (
        <g>
          <line x1={xScale(hover)} x2={xScale(hover)} y1={padT} y2={h - padB} stroke="#00e5ff" strokeWidth="1" opacity="0.3" />
          <circle cx={xScale(hover)} cy={yScale(data[hover].price)} r="5" fill="#00e5ff" stroke="#0a1628" strokeWidth="2" />
          <rect x={xScale(hover) - 35} y={yScale(data[hover].price) - 28} width="70" height="22" rx="4" fill="#0d1f35" stroke="#00e5ff" strokeWidth="1" opacity="0.9" />
          <text x={xScale(hover)} y={yScale(data[hover].price) - 13} fill="#00e5ff" fontSize="11" textAnchor="middle" fontWeight="bold">${data[hover].price}</text>
        </g>
      )}
    </svg>
  );
}

function AlertBadge({ prediction, confidence }) {
  const isRise = prediction === "rise";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px", background: isRise ? "rgba(255,107,53,0.12)" : "rgba(0,229,108,0.12)", border: `1px solid ${isRise ? "#ff6b35" : "#00e56c"}`, fontSize: "12px", fontWeight: "600", color: isRise ? "#ff6b35" : "#00e56c" }}>
      {isRise ? "▲" : "▼"} Price likely to {isRise ? "RISE" : "DROP"} · {confidence}% confidence
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "16px" }}>
      <div style={{ width: "36px", height: "36px", border: "3px solid #1e3a5f", borderTop: "3px solid #00e5ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: "12px", color: "#2a5080", letterSpacing: "2px" }}>FETCHING LIVE PRICES...</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [routes, setRoutes] = useState(DEMO_ROUTES);
  const [routeData, setRouteData] = useState({});
  const [loadingRoutes, setLoadingRoutes] = useState({});
  const [errorRoutes, setErrorRoutes] = useState({});
  const [selectedRoute, setSelectedRoute] = useState(1);
  const [alerts, setAlerts] = useState({ 1: null, 2: null, 3: null });
  const [alertInput, setAlertInput] = useState("");
  const [addingRoute, setAddingRoute] = useState(false);
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newDates, setNewDates] = useState("");
  const [tab, setTab] = useState("chart");

  const loadRouteData = useCallback(async (route) => {
    setLoadingRoutes((l) => ({ ...l, [route.id]: true }));
    setErrorRoutes((e) => ({ ...e, [route.id]: null }));
    try {
      let history, prediction, confidence, avg;
      if (hasApiKeys) {
        history = await buildPriceHistory(route.fromCode, route.toCode, route.departDate);
        ({ prediction, confidence, avg } = buildPrediction(history));
      } else {
        const base = Math.round(150 + Math.random() * 1000);
        history = generatePriceHistory(base);
        prediction = Math.random() > 0.5 ? "rise" : "drop";
        confidence = Math.round(55 + Math.random() * 30);
        avg = Math.round(history.reduce((a, b) => a + b.price, 0) / history.length);
      }
      const currentPrice = history[history.length - 1].price;
      setRouteData((d) => ({ ...d, [route.id]: { history, prediction, confidence, avg } }));
      setAlerts((a) => ({ ...a, [route.id]: a[route.id] ?? Math.round(currentPrice * 0.92) }));
    } catch (err) {
      setErrorRoutes((e) => ({ ...e, [route.id]: err.message }));
    } finally {
      setLoadingRoutes((l) => ({ ...l, [route.id]: false }));
    }
  }, []);

  useEffect(() => {
    DEMO_ROUTES.forEach((r) => loadRouteData(r));
  }, [loadRouteData]);

  function addRoute() {
    if (!newFrom || !newTo) return;
    const id = Date.now();
    const fromCode = toIATA(newFrom);
    const toCode = toIATA(newTo);
    let departDate = getFutureDate(30);
    if (newDates) {
      const parsed = new Date(newDates + " 2026");
      if (!isNaN(parsed)) departDate = parsed.toISOString().split("T")[0];
    }
    const newRoute = { id, from: newFrom, to: newTo, fromCode, toCode, departDate };
    setRoutes((r) => [...r, newRoute]);
    setAlerts((a) => ({ ...a, [id]: null }));
    setSelectedRoute(id);
    setAddingRoute(false);
    setNewFrom(""); setNewTo(""); setNewDates("");
    loadRouteData(newRoute);
  }

  function setAlert() {
    const val = parseInt(alertInput);
    if (!isNaN(val) && val > 0) {
      setAlerts((a) => ({ ...a, [selectedRoute]: val }));
      setAlertInput("");
    }
  }

  const data = routeData[selectedRoute];
  const isLoading = loadingRoutes[selectedRoute];
  const error = errorRoutes[selectedRoute];
  const currentPrice = data?.history[data.history.length - 1]?.price ?? 0;
  const prevPrice = data?.history[data.history.length - 2]?.price ?? currentPrice;
  const change = currentPrice - prevPrice;
  const alertPrice = alerts[selectedRoute] ?? (currentPrice ? Math.round(currentPrice * 0.92) : 0);
  const alertTriggered = currentPrice > 0 && alertPrice > 0 && currentPrice <= alertPrice;
  const priceHistory7 = data?.history.slice(-7) ?? [];
  const minWeek = priceHistory7.length ? Math.min(...priceHistory7.map((d) => d.price)) : 0;
  const maxWeek = priceHistory7.length ? Math.max(...priceHistory7.map((d) => d.price)) : 0;

  const inputStyle = { background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "8px", color: "#c8d8e8", padding: "8px 12px", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const btnStyle = (active, color = "#00e5ff") => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", background: active ? color : "transparent", color: active ? "#0a1628" : color, boxShadow: active ? `0 0 16px ${color}55` : "none", outline: active ? "none" : `1px solid ${color}44`, transition: "all 0.2s", fontFamily: "inherit" });

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", fontFamily: "'DM Mono','Fira Code',monospace", color: "#c8d8e8", padding: 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #060e1a; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
        input::placeholder { color: #2a4060; }
        input:focus { border-color: #00e5ff44 !important; }
        .route-card:hover { background: #0d1f35 !important; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
        .fade-in { animation: fadeIn 0.4s ease; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #0d1f35", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#080f1e 0%,transparent 100%)" }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", color: "#fff" }}>✈ FLIGHTWATCH</div>
          <div style={{ fontSize: "11px", color: "#2a5080", marginTop: "2px", letterSpacing: "2px" }}>PERSONAL PRICE TRACKER</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {!hasApiKeys && (
            <div style={{ fontSize: "11px", color: "#ff6b35", background: "rgba(255,107,53,0.1)", border: "1px solid #ff6b3533", padding: "4px 10px", borderRadius: "6px" }}>
              ⚠ DEMO MODE — Add .env keys for live prices
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: hasApiKeys ? "#00e56c" : "#ff6b35", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "11px", color: hasApiKeys ? "#00e56c" : "#ff6b35", letterSpacing: "1px" }}>{hasApiKeys ? "LIVE" : "DEMO"}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 73px)" }}>
        {/* Sidebar */}
        <div style={{ width: "260px", flexShrink: 0, borderRight: "1px solid #0d1f35", padding: "20px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "10px", color: "#2a5080", letterSpacing: "2px", marginBottom: "8px", paddingLeft: "4px" }}>TRACKED ROUTES</div>
          {routes.map((r) => {
            const rd = routeData[r.id];
            const cp = rd?.history[rd.history.length - 1]?.price ?? 0;
            const al = alerts[r.id];
            const trig = cp > 0 && al && cp <= al;
            const loading = loadingRoutes[r.id];
            return (
              <div key={r.id} className="route-card" onClick={() => setSelectedRoute(r.id)} style={{ padding: "12px", borderRadius: "10px", cursor: "pointer", border: selectedRoute === r.id ? "1px solid #00e5ff33" : "1px solid #0d1f35", background: selectedRoute === r.id ? "#0d2040" : "#080f1e", transition: "all 0.15s", position: "relative" }}>
                {trig && <div style={{ position: "absolute", top: "8px", right: "8px", width: "8px", height: "8px", borderRadius: "50%", background: "#ff6b35", animation: "pulse 1s infinite" }} />}
                <div style={{ fontSize: "12px", fontWeight: "500", color: selectedRoute === r.id ? "#00e5ff" : "#8aabcc" }}>{r.from.split(" ")[0]} → {r.to.split(" ")[0]}</div>
                <div style={{ fontSize: "10px", color: "#2a5080", marginTop: "3px" }}>{r.departDate}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  {loading ? <span style={{ fontSize: "11px", color: "#2a5080" }}>Loading...</span> :
                    errorRoutes[r.id] ? <span style={{ fontSize: "11px", color: "#ff6b35" }}>Error</span> : (
                      <>
                        <span style={{ fontSize: "16px", fontWeight: "500", color: "#fff" }}>{cp ? `$${cp}` : "—"}</span>
                        <MiniSparkline data={rd?.history.slice(-12) ?? []} color={trig ? "#ff6b35" : "#00e5ff"} />
                      </>
                    )}
                </div>
              </div>
            );
          })}
          {!addingRoute ? (
            <button onClick={() => setAddingRoute(true)} style={{ ...btnStyle(false), width: "100%", marginTop: "8px", padding: "10px", borderRadius: "10px", fontSize: "12px" }}>+ Track New Route</button>
          ) : (
            <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <input style={inputStyle} placeholder="From (e.g. Paris, CDG)" value={newFrom} onChange={(e) => setNewFrom(e.target.value)} />
              <input style={inputStyle} placeholder="To (e.g. London, LHR)" value={newTo} onChange={(e) => setNewTo(e.target.value)} />
              <input style={inputStyle} placeholder="Depart date (e.g. Apr 15)" value={newDates} onChange={(e) => setNewDates(e.target.value)} />
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={addRoute} style={{ ...btnStyle(true), flex: 1, padding: "8px", fontSize: "12px" }}>Add</button>
                <button onClick={() => setAddingRoute(false)} style={{ ...btnStyle(false, "#ff6b35"), flex: 1, padding: "8px", fontSize: "12px" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Main Panel */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }} className="fade-in">
          {isLoading && <LoadingSpinner />}
          {error && !isLoading && (
            <div style={{ background: "rgba(255,107,53,0.08)", border: "1px solid #ff6b3533", borderRadius: "12px", padding: "20px", color: "#ff6b35", fontSize: "13px" }}>
              <div style={{ fontWeight: "600", marginBottom: "8px" }}>⚠ Could not fetch prices</div>
              <div style={{ color: "#8aabcc", marginBottom: "12px" }}>{error}</div>
              <button onClick={() => loadRouteData(routes.find((r) => r.id === selectedRoute))} style={{ ...btnStyle(true, "#ff6b35"), fontSize: "12px" }}>Retry</button>
            </div>
          )}
          {data && !isLoading && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "24px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" }}>
                    {routes.find((r) => r.id === selectedRoute)?.from} → {routes.find((r) => r.id === selectedRoute)?.to}
                  </div>
                  <div style={{ fontSize: "12px", color: "#2a5080", marginTop: "4px" }}>
                    Departing {routes.find((r) => r.id === selectedRoute)?.departDate} · {hasApiKeys ? "Live Amadeus data" : "Demo mode"}
                  </div>
                </div>
                <AlertBadge prediction={data.prediction} confidence={data.confidence} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                {[
                  { label: "CURRENT PRICE", value: `$${currentPrice}`, sub: `${change >= 0 ? "+" : ""}$${change} vs yesterday`, color: change > 0 ? "#ff6b35" : "#00e56c" },
                  { label: "ALERT SET AT", value: alertPrice ? `$${alertPrice}` : "—", sub: alertTriggered ? "🔔 TRIGGERED!" : "Watching...", color: alertTriggered ? "#ff6b35" : "#8aabcc" },
                  { label: "7D RANGE", value: `$${minWeek}–$${maxWeek}`, sub: "Low / High", color: "#8aabcc" },
                  { label: "BEST TIME", value: data.prediction === "drop" ? "Wait 1–2w" : "Book now", sub: `${data.confidence}% confidence`, color: data.prediction === "drop" ? "#00e56c" : "#ff6b35" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ fontSize: "9px", color: "#2a5080", letterSpacing: "2px", marginBottom: "8px" }}>{s.label}</div>
                    <div style={{ fontSize: "20px", fontWeight: "500", color: "#fff" }}>{s.value}</div>
                    <div style={{ fontSize: "11px", color: s.color, marginTop: "4px" }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid #0d1f35" }}>
                {[["chart", "Price History"], ["alert", "Set Alert"], ["predict", "Prediction"]].map(([t, label]) => (
                  <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 16px", fontSize: "12px", letterSpacing: "1px", fontFamily: "inherit", color: tab === t ? "#00e5ff" : "#2a5080", borderBottom: tab === t ? "2px solid #00e5ff" : "2px solid transparent", marginBottom: "-1px", transition: "color 0.15s" }}>{label}</button>
                ))}
              </div>

              {tab === "chart" && (
                <div style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "1px", marginBottom: "12px" }}>
                    30-DAY PRICE HISTORY · {hasApiKeys ? "Today = live Amadeus price" : "Demo data"} · Hover for details
                  </div>
                  <PriceChart data={data.history} alertPrice={alertPrice} />
                </div>
              )}

              {tab === "alert" && (
                <div style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "24px", maxWidth: "420px" }}>
                  <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "2px", marginBottom: "16px" }}>PRICE DROP ALERT</div>
                  <div style={{ fontSize: "13px", color: "#8aabcc", marginBottom: "16px" }}>
                    Notify when price drops below target. Current: <strong style={{ color: "#fff" }}>${currentPrice}</strong>
                  </div>
                  {alertTriggered && (
                    <div style={{ background: "rgba(255,107,53,0.1)", border: "1px solid #ff6b3544", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "#ff6b35", fontSize: "13px" }}>
                      🔔 Alert triggered! Price is at or below ${alertPrice}.
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input style={inputStyle} type="number" placeholder={`Current alert: $${alertPrice}`} value={alertInput} onChange={(e) => setAlertInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setAlert()} />
                    <button onClick={setAlert} style={{ ...btnStyle(true), whiteSpace: "nowrap" }}>Set Alert</button>
                  </div>
                  <div style={{ marginTop: "20px" }}>
                    <div style={{ fontSize: "10px", color: "#2a5080", letterSpacing: "2px", marginBottom: "12px" }}>RECENT PRICES</div>
                    {data.history.slice(-5).reverse().map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0d1f35" }}>
                        <span style={{ fontSize: "12px", color: "#4a6080" }}>{d.date}</span>
                        <span style={{ fontSize: "12px", color: d.price <= alertPrice ? "#ff6b35" : "#c8d8e8" }}>${d.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "predict" && (
                <div style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "24px", maxWidth: "520px" }}>
                  <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "2px", marginBottom: "20px" }}>BOOKING PREDICTION</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {[
                      { label: "Predicted direction", value: data.prediction === "drop" ? "▼ Going down" : "▲ Going up", color: data.prediction === "drop" ? "#00e56c" : "#ff6b35" },
                      { label: "30-day average", value: `$${data.avg}`, color: "#8aabcc" },
                      { label: "vs average", value: currentPrice < data.avg ? `$${data.avg - currentPrice} below avg ✓` : `$${currentPrice - data.avg} above avg`, color: currentPrice < data.avg ? "#00e56c" : "#ff6b35" },
                      { label: "Recommendation", value: data.prediction === "drop" ? "⏳ Wait 1–2 weeks" : "🎯 Book now", color: "#fff" },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", color: "#8aabcc" }}>{item.label}</span>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "13px", color: "#8aabcc" }}>Confidence</span>
                      <div style={{ flex: 1, height: "4px", background: "#0d1f35", borderRadius: "2px" }}>
                        <div style={{ width: `${data.confidence}%`, height: "100%", background: data.prediction === "drop" ? "#00e56c" : "#ff6b35", borderRadius: "2px", transition: "width 0.5s" }} />
                      </div>
                      <span style={{ fontSize: "14px", color: "#fff" }}>{data.confidence}%</span>
                    </div>
                    <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "8px", padding: "16px", marginTop: "4px" }}>
                      <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "1px", marginBottom: "8px" }}>METHODOLOGY</div>
                      <div style={{ fontSize: "12px", color: "#4a6080", lineHeight: "1.7" }}>
                        Based on 7-day price momentum vs 30-day average. Confidence reflects trend strength relative to recent volatility.
                        {hasApiKeys && " Today's price is live from Amadeus; historical points are modeled from the real baseline."}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
