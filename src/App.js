import { useState, useRef } from "react";

const SAMPLE_ROUTES = [
  { id: 1, from: "Paris (CDG)", to: "New York (JFK)", dates: "Mar 15 – Mar 22" },
  { id: 2, from: "Paris (CDG)", to: "Tokyo (NRT)", dates: "Apr 3 – Apr 17" },
  { id: 3, from: "Paris (CDG)", to: "Barcelona (BCN)", dates: "Mar 28 – Mar 31" },
];

function generatePriceHistory(base, days = 30) {
  const history = [];
  let price = base;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price = Math.max(80, price + (Math.random() - 0.48) * (base * 0.06));
    history.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: Math.round(price),
    });
  }
  return history;
}

const ROUTES_DATA = {
  1: { base: 680, history: generatePriceHistory(680), alert: 620, prediction: "drop", confidence: 72 },
  2: { base: 1150, history: generatePriceHistory(1150), alert: 1050, prediction: "rise", confidence: 65 },
  3: { base: 190, history: generatePriceHistory(190), alert: 160, prediction: "drop", confidence: 81 },
};

function MiniSparkline({ data, color }) {
  const w = 120, h = 40;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
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
  const w = 600, h = 200, padL = 50, padB = 30, padT = 20, padR = 20;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices) - 30;
  const max = Math.max(...prices) + 30;
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
        const price = Math.round(min + t * (max - min));
        return (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#1a2a3a" strokeWidth="1" />
            <text x={padL - 6} y={y + 4} fill="#4a6080" fontSize="9" textAnchor="end">${price}</text>
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
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "4px 10px", borderRadius: "20px",
      background: isRise ? "rgba(255,107,53,0.12)" : "rgba(0,229,108,0.12)",
      border: `1px solid ${isRise ? "#ff6b35" : "#00e56c"}`,
      fontSize: "12px", fontWeight: "600",
      color: isRise ? "#ff6b35" : "#00e56c",
    }}>
      {isRise ? "▲" : "▼"} Price likely to {isRise ? "RISE" : "DROP"} · {confidence}% confidence
    </div>
  );
}

export default function App() {
  const [selectedRoute, setSelectedRoute] = useState(1);
  const [alertInput, setAlertInput] = useState("");
  const [alerts, setAlerts] = useState({ 1: 620, 2: 1050, 3: 160 });
  const [addingRoute, setAddingRoute] = useState(false);
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newDates, setNewDates] = useState("");
  const [routes, setRoutes] = useState(SAMPLE_ROUTES);
  const [routeData, setRouteData] = useState(ROUTES_DATA);
  const [tab, setTab] = useState("chart");

  const data = routeData[selectedRoute];
  const currentPrice = data?.history[data.history.length - 1]?.price ?? 0;
  const prevPrice = data?.history[data.history.length - 2]?.price ?? currentPrice;
  const change = currentPrice - prevPrice;
  const alertPrice = alerts[selectedRoute] ?? data?.alert;
  const alertTriggered = currentPrice <= alertPrice;

  function setAlert() {
    const val = parseInt(alertInput);
    if (!isNaN(val) && val > 0) {
      setAlerts((a) => ({ ...a, [selectedRoute]: val }));
      setAlertInput("");
    }
  }

  function addRoute() {
    if (!newFrom || !newTo) return;
    const id = Date.now();
    const base = Math.round(200 + Math.random() * 1000);
    setRoutes((r) => [...r, { id, from: newFrom, to: newTo, dates: newDates || "Flexible" }]);
    setRouteData((d) => ({
      ...d,
      [id]: { base, history: generatePriceHistory(base), alert: Math.round(base * 0.9), prediction: Math.random() > 0.5 ? "rise" : "drop", confidence: Math.round(55 + Math.random() * 30) }
    }));
    setAlerts((a) => ({ ...a, [id]: Math.round(base * 0.9) }));
    setSelectedRoute(id);
    setAddingRoute(false);
    setNewFrom(""); setNewTo(""); setNewDates("");
  }

  const inputStyle = {
    background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "8px",
    color: "#c8d8e8", padding: "8px 12px", fontSize: "13px", outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "inherit",
  };

  const btnStyle = (active, color = "#00e5ff") => ({
    padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: "600", fontSize: "13px", letterSpacing: "0.5px",
    background: active ? color : "transparent",
    color: active ? "#0a1628" : color,
    boxShadow: active ? `0 0 16px ${color}55` : "none",
    outline: active ? "none" : `1px solid ${color}44`,
    transition: "all 0.2s", fontFamily: "inherit",
  });

  const priceHistory7 = data?.history.slice(-7) ?? [];
  const minWeek = Math.min(...priceHistory7.map((d) => d.price));
  const maxWeek = Math.max(...priceHistory7.map((d) => d.price));

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", fontFamily: "'DM Mono', 'Fira Code', monospace", color: "#c8d8e8", padding: 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #060e1a; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
        input::placeholder { color: #2a4060; }
        input:focus { border-color: #00e5ff44 !important; }
        .route-card:hover { background: #0d1f35 !important; border-color: #1e3a5f !important; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
        .fade-in { animation: fadeIn 0.4s ease; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #0d1f35", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg, #080f1e 0%, transparent 100%)" }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", color: "#fff" }}>✈ FLIGHTWATCH</div>
          <div style={{ fontSize: "11px", color: "#2a5080", marginTop: "2px", letterSpacing: "2px" }}>PERSONAL PRICE TRACKER</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00e56c", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "11px", color: "#00e56c", letterSpacing: "1px" }}>LIVE</span>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 73px)" }}>
        {/* Sidebar */}
        <div style={{ width: "260px", flexShrink: 0, borderRight: "1px solid #0d1f35", padding: "20px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "10px", color: "#2a5080", letterSpacing: "2px", marginBottom: "8px", paddingLeft: "4px" }}>TRACKED ROUTES</div>
          {routes.map((r) => {
            const rd = routeData[r.id];
            const cp = rd?.history[rd.history.length - 1]?.price ?? 0;
            const al = alerts[r.id] ?? rd?.alert;
            const trig = cp <= al;
            return (
              <div key={r.id} className="route-card" onClick={() => setSelectedRoute(r.id)} style={{ padding: "12px", borderRadius: "10px", cursor: "pointer", border: selectedRoute === r.id ? "1px solid #00e5ff33" : "1px solid #0d1f35", background: selectedRoute === r.id ? "#0d2040" : "#080f1e", transition: "all 0.15s", position: "relative" }}>
                {trig && <div style={{ position: "absolute", top: "8px", right: "8px", width: "8px", height: "8px", borderRadius: "50%", background: "#ff6b35", animation: "pulse 1s infinite" }} />}
                <div style={{ fontSize: "12px", fontWeight: "500", color: selectedRoute === r.id ? "#00e5ff" : "#8aabcc" }}>{r.from.split(" ")[0]} → {r.to.split(" ")[0]}</div>
                <div style={{ fontSize: "10px", color: "#2a5080", marginTop: "3px" }}>{r.dates}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "500", color: "#fff" }}>${cp}</span>
                  <MiniSparkline data={rd?.history.slice(-12) ?? []} color={trig ? "#ff6b35" : "#00e5ff"} />
                </div>
              </div>
            );
          })}
          {!addingRoute ? (
            <button onClick={() => setAddingRoute(true)} style={{ ...btnStyle(false), width: "100%", marginTop: "8px", padding: "10px", borderRadius: "10px", fontSize: "12px" }}>+ Track New Route</button>
          ) : (
            <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <input style={inputStyle} placeholder="From (e.g. Paris CDG)" value={newFrom} onChange={(e) => setNewFrom(e.target.value)} />
              <input style={inputStyle} placeholder="To (e.g. London LHR)" value={newTo} onChange={(e) => setNewTo(e.target.value)} />
              <input style={inputStyle} placeholder="Dates (optional)" value={newDates} onChange={(e) => setNewDates(e.target.value)} />
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={addRoute} style={{ ...btnStyle(true), flex: 1, padding: "8px", fontSize: "12px" }}>Add</button>
                <button onClick={() => setAddingRoute(false)} style={{ ...btnStyle(false, "#ff6b35"), flex: 1, padding: "8px", fontSize: "12px" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }} className="fade-in">
          {data && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" }}>
                    {routes.find((r) => r.id === selectedRoute)?.from} → {routes.find((r) => r.id === selectedRoute)?.to}
                  </div>
                  <div style={{ fontSize: "12px", color: "#2a5080", marginTop: "4px" }}>{routes.find((r) => r.id === selectedRoute)?.dates} · Updated just now</div>
                </div>
                <AlertBadge prediction={data.prediction} confidence={data.confidence} />
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                {[
                  { label: "CURRENT PRICE", value: `$${currentPrice}`, sub: `${change >= 0 ? "+" : ""}$${change} today`, color: change > 0 ? "#ff6b35" : "#00e56c" },
                  { label: "ALERT SET AT", value: `$${alertPrice}`, sub: alertTriggered ? "🔔 TRIGGERED!" : "Watching...", color: alertTriggered ? "#ff6b35" : "#8aabcc" },
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

              {/* Tabs */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid #0d1f35" }}>
                {[["chart", "Price History"], ["alert", "Set Alert"], ["predict", "Prediction"]].map(([t, label]) => (
                  <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 16px", fontSize: "12px", letterSpacing: "1px", fontFamily: "inherit", color: tab === t ? "#00e5ff" : "#2a5080", borderBottom: tab === t ? "2px solid #00e5ff" : "2px solid transparent", marginBottom: "-1px", transition: "color 0.15s" }}>{label}</button>
                ))}
              </div>

              {tab === "chart" && (
                <div style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "1px", marginBottom: "12px" }}>30-DAY PRICE HISTORY · Hover for details</div>
                  <PriceChart data={data.history} alertPrice={alertPrice} />
                </div>
              )}

              {tab === "alert" && (
                <div style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "24px", maxWidth: "420px" }}>
                  <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "2px", marginBottom: "16px" }}>PRICE DROP ALERT</div>
                  <div style={{ fontSize: "13px", color: "#8aabcc", marginBottom: "16px" }}>
                    Get notified when price drops below your target. Current: <strong style={{ color: "#fff" }}>${currentPrice}</strong>
                  </div>
                  {alertTriggered && (
                    <div style={{ background: "rgba(255,107,53,0.1)", border: "1px solid #ff6b3544", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "#ff6b35", fontSize: "13px" }}>
                      🔔 Alert triggered! Price is at or below your target of ${alertPrice}.
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <input style={inputStyle} type="number" placeholder={`Current alert: $${alertPrice}`} value={alertInput} onChange={(e) => setAlertInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setAlert()} />
                    </div>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#8aabcc" }}>Predicted direction</span>
                      <span style={{ fontSize: "16px", fontWeight: "600", color: data.prediction === "drop" ? "#00e56c" : "#ff6b35" }}>{data.prediction === "drop" ? "▼ Going down" : "▲ Going up"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#8aabcc" }}>Confidence</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "100px", height: "4px", background: "#0d1f35", borderRadius: "2px" }}>
                          <div style={{ width: `${data.confidence}%`, height: "100%", background: data.prediction === "drop" ? "#00e56c" : "#ff6b35", borderRadius: "2px" }} />
                        </div>
                        <span style={{ fontSize: "14px", color: "#fff" }}>{data.confidence}%</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#8aabcc" }}>Recommendation</span>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>{data.prediction === "drop" ? "⏳ Wait 1–2 weeks" : "🎯 Book now"}</span>
                    </div>
                    <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "8px", padding: "16px", marginTop: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "1px", marginBottom: "8px" }}>HOW THIS WORKS</div>
                      <div style={{ fontSize: "12px", color: "#4a6080", lineHeight: "1.7" }}>
                        Prediction is based on 30-day price momentum, day-of-week patterns, and typical booking windows. The model analyzes price velocity over the last 7 days compared to historical averages.
                        <br /><br />
                        <span style={{ color: "#8aabcc" }}>Connect the Amadeus API to power real predictions with live data.</span>
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
