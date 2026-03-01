import { useState, useEffect, useCallback, useRef } from "react";

// ─── CITIES DATABASE ──────────────────────────────────────────────────────────
const CITIES = [
  { city: "Paris",         country: "France",         code: "CDG", flag: "🇫🇷" },
  { city: "Paris Orly",    country: "France",         code: "ORY", flag: "🇫🇷" },
  { city: "London",        country: "UK",             code: "LHR", flag: "🇬🇧" },
  { city: "London Gatwick",country: "UK",             code: "LGW", flag: "🇬🇧" },
  { city: "Barcelona",     country: "Spain",          code: "BCN", flag: "🇪🇸" },
  { city: "Madrid",        country: "Spain",          code: "MAD", flag: "🇪🇸" },
  { city: "Rome",          country: "Italy",          code: "FCO", flag: "🇮🇹" },
  { city: "Milan",         country: "Italy",          code: "MXP", flag: "🇮🇹" },
  { city: "Amsterdam",     country: "Netherlands",    code: "AMS", flag: "🇳🇱" },
  { city: "Berlin",        country: "Germany",        code: "BER", flag: "🇩🇪" },
  { city: "Frankfurt",     country: "Germany",        code: "FRA", flag: "🇩🇪" },
  { city: "Zurich",        country: "Switzerland",    code: "ZRH", flag: "🇨🇭" },
  { city: "Vienna",        country: "Austria",        code: "VIE", flag: "🇦🇹" },
  { city: "Prague",        country: "Czech Republic", code: "PRG", flag: "🇨🇿" },
  { city: "Lisbon",        country: "Portugal",       code: "LIS", flag: "🇵🇹" },
  { city: "Athens",        country: "Greece",         code: "ATH", flag: "🇬🇷" },
  { city: "Istanbul",      country: "Turkey",         code: "IST", flag: "🇹🇷" },
  { city: "Ankara",        country: "Turkey",         code: "ESB", flag: "🇹🇷" },
  { city: "Almaty",        country: "Kazakhstan",     code: "ALA", flag: "🇰🇿" },
  { city: "Dubai",         country: "UAE",            code: "DXB", flag: "🇦🇪" },
];


// ─── AIRLINE LOOKUP ───────────────────────────────────────────────────────────
const AIRLINES = {
  "AF": { name: "Air France",         logo: "🇫🇷" },
  "BA": { name: "British Airways",    logo: "🇬🇧" },
  "LH": { name: "Lufthansa",          logo: "🇩🇪" },
  "TK": { name: "Turkish Airlines",   logo: "🇹🇷" },
  "EK": { name: "Emirates",           logo: "🇦🇪" },
  "QR": { name: "Qatar Airways",      logo: "🇶🇦" },
  "EY": { name: "Etihad",             logo: "🇦🇪" },
  "SU": { name: "Aeroflot",           logo: "🇷🇺" },
  "KC": { name: "Air Astana",         logo: "🇰🇿" },
  "DV": { name: "SCAT Airlines",      logo: "🇰🇿" },
  "HY": { name: "Uzbekistan Airways", logo: "🇺🇿" },
  "PC": { name: "Pegasus",            logo: "🇹🇷" },
  "XQ": { name: "SunExpress",         logo: "🇹🇷" },
  "U2": { name: "easyJet",            logo: "🟠" },
  "FR": { name: "Ryanair",            logo: "🟡" },
  "W6": { name: "Wizz Air",           logo: "💜" },
  "VY": { name: "Vueling",            logo: "🟡" },
  "IB": { name: "Iberia",             logo: "🇪🇸" },
  "AZ": { name: "ITA Airways",        logo: "🇮🇹" },
  "KL": { name: "KLM",                logo: "🇳🇱" },
  "LX": { name: "Swiss",              logo: "🇨🇭" },
  "OS": { name: "Austrian",           logo: "🇦🇹" },
  "SK": { name: "SAS",                logo: "🇸🇪" },
  "AY": { name: "Finnair",            logo: "🇫🇮" },
  "TP": { name: "TAP Air Portugal",   logo: "🇵🇹" },
  "UA": { name: "United",             logo: "🇺🇸" },
  "AA": { name: "American",           logo: "🇺🇸" },
  "DL": { name: "Delta",              logo: "🇺🇸" },
  "NH": { name: "ANA",                logo: "🇯🇵" },
  "JL": { name: "Japan Airlines",     logo: "🇯🇵" },
  "SQ": { name: "Singapore Airlines", logo: "🇸🇬" },
  "CX": { name: "Cathay Pacific",     logo: "🇭🇰" },
  "TG": { name: "Thai Airways",       logo: "🇹🇭" },
  "QF": { name: "Qantas",             logo: "🇦🇺" },
};

function parseDuration(iso) {
  // PT8H30M → "8h 30m"
  const h = iso.match(/(\d+)H/);
  const m = iso.match(/(\d+)M/);
  return [h ? h[1] + "h" : "", m ? m[1] + "m" : ""].filter(Boolean).join(" ");
}

function formatTime(isoString) {
  // "2026-04-14T10:30:00" → "10:30"
  return isoString ? isoString.slice(11, 16) : "—";
}

// Generate date options (today + 365 days)
function generateDateOptions() {
  const options = [];
  const today = new Date();
  for (let i = 1; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    options.push({ value: iso, label });
  }
  return options;
}
const DATE_OPTIONS = generateDateOptions();

// ─── AMADEUS API ──────────────────────────────────────────────────────────────
const AMADEUS_KEY    = process.env.REACT_APP_AMADEUS_KEY;
const AMADEUS_SECRET = process.env.REACT_APP_AMADEUS_SECRET;
const hasApiKeys = AMADEUS_KEY && AMADEUS_SECRET &&
  AMADEUS_KEY !== "your_api_key_here" && AMADEUS_SECRET !== "your_api_secret_here";

async function getAmadeusToken() {
  const cached = sessionStorage.getItem("amadeus_token");
  const expiry  = sessionStorage.getItem("amadeus_expiry");
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

async function fetchFlightData(origin, destination, date, returnDate = null) {
  const token = await getAmadeusToken();
  let url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${date}&adults=1&max=5&currencyCode=USD`;
  if (returnDate) url += `&returnDate=${returnDate}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!data.data || !data.data.length) return null;

  // Sort by price, pick cheapest offer
  const sorted = [...data.data].sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total));
  const best = sorted[0];
  const price = Math.round(parseFloat(best.price.total));

  // Extract outbound flight info from first itinerary first segment
  const outbound = best.itineraries[0];
  const seg0 = outbound.segments[0];
  const lastSeg = outbound.segments[outbound.segments.length - 1];
  const carrierCode = seg0.carrierCode;
  const airline = AIRLINES[carrierCode] || { name: carrierCode, logo: "✈" };
  const stops = outbound.segments.length - 1;

  // Extract return flight info if round trip
  let returnInfo = null;
  if (best.itineraries[1]) {
    const ret = best.itineraries[1];
    const rSeg0 = ret.segments[0];
    const rLast = ret.segments[ret.segments.length - 1];
    const rCarrier = rSeg0.carrierCode;
    const rAirline = AIRLINES[rCarrier] || { name: rCarrier, logo: "✈" };
    returnInfo = {
      airline:    rAirline.name,
      logo:       rAirline.logo,
      code:       rCarrier,
      flight:     `${rCarrier}${rSeg0.number}`,
      departs:    formatTime(rSeg0.departure.at),
      arrives:    formatTime(rLast.arrival.at),
      duration:   parseDuration(ret.duration),
      stops:      ret.segments.length - 1,
    };
  }

  return {
    price,
    airline:    airline.name,
    logo:       airline.logo,
    code:       carrierCode,
    flight:     `${carrierCode}${seg0.number}`,
    departs:    formatTime(seg0.departure.at),
    arrives:    formatTime(lastSeg.arrival.at),
    duration:   parseDuration(outbound.duration),
    stops,
    returnInfo,
  };
}

function generatePriceHistory(base) {
  const history = [];
  let price = base;
  for (let i = 30; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    price = Math.max(80, price + (Math.random() - 0.48) * (base * 0.06));
    history.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), price: Math.round(price) });
  }
  return history;
}

async function buildPriceHistory(origin, destination, departureDate, returnDate = null) {
  const flightInfo = await fetchFlightData(origin, destination, departureDate, returnDate);
  if (!flightInfo) throw new Error(`No flights found for ${origin}→${destination} on ${departureDate}`);
  const { price: realPrice, ...rest } = flightInfo;
  const history = [];
  let price = realPrice * (0.9 + Math.random() * 0.2);
  for (let i = 29; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    price = Math.max(50, price + (Math.random() - 0.48) * (realPrice * 0.05));
    history.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), price: Math.round(price) });
  }
  history.push({ date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), price: realPrice });
  return { history, flightInfo: rest };
}

function buildPrediction(history) {
  const last7 = history.slice(-7).map((d) => d.price);
  const avg = last7.reduce((a, b) => a + b, 0) / last7.length;
  const trend = last7[last7.length - 1] - last7[0];
  const volatility = Math.max(...last7) - Math.min(...last7);
  return {
    prediction: trend > 0 ? "rise" : "drop",
    confidence: Math.min(90, Math.round(55 + (Math.abs(trend) / (volatility + 1)) * 35)),
    avg: Math.round(avg),
  };
}

function getFutureDate(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const DEMO_ROUTES = [
  { id: 1, fromCity: CITIES[0], toCity: CITIES[6],  departDate: getFutureDate(30), returnDate: getFutureDate(37), tripType: "round" },
  { id: 2, fromCity: CITIES[0], toCity: CITIES[10], departDate: getFutureDate(45), returnDate: null,              tripType: "oneway" },
  { id: 3, fromCity: CITIES[0], toCity: CITIES[13], departDate: getFutureDate(20), returnDate: getFutureDate(23), tripType: "round" },
];

// ─── CITY SEARCH DROPDOWN ─────────────────────────────────────────────────────
function CityDropdown({ value, onChange, placeholder, exclude }) {
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const ref                 = useRef(null);

  const filtered = CITIES.filter((c) =>
    (!exclude || c.code !== exclude.code) &&
    (c.city.toLowerCase().includes(query.toLowerCase()) ||
     c.code.toLowerCase().includes(query.toLowerCase()) ||
     c.country.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (value) setQuery("");
  }, [value]);

  const inputStyle = {
    background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "8px",
    color: "#c8d8e8", padding: "9px 12px", fontSize: "13px", outline: "none",
    width: "100%", fontFamily: "inherit", cursor: "pointer",
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <div
        style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}
        onClick={() => { setOpen(!open); setQuery(""); }}
      >
        {value ? (
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>{value.flag}</span>
            <span style={{ color: "#fff", fontWeight: "500" }}>{value.city}</span>
            <span style={{ color: "#2a5080", fontSize: "11px" }}>{value.code}</span>
          </span>
        ) : (
          <span style={{ color: "#2a4060" }}>{placeholder}</span>
        )}
        <span style={{ color: "#2a5080", fontSize: "10px" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "#0d1f35", border: "1px solid #1e3a5f", borderRadius: "10px",
          overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <div style={{ padding: "8px" }}>
            <input
              autoFocus
              style={{ ...inputStyle, fontSize: "12px" }}
              placeholder="Search city or airport code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 16px", fontSize: "12px", color: "#2a5080" }}>No airports found</div>
            ) : filtered.map((c) => (
              <div
                key={c.code}
                onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                style={{
                  padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
                  background: value?.code === c.code ? "#1a3a5f" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#1a2a4f"}
                onMouseLeave={(e) => e.currentTarget.style.background = value?.code === c.code ? "#1a3a5f" : "transparent"}
              >
                <span style={{ fontSize: "18px" }}>{c.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", color: "#c8d8e8", fontWeight: "500" }}>{c.city}</div>
                  <div style={{ fontSize: "10px", color: "#2a5080" }}>{c.country}</div>
                </div>
                <span style={{ fontSize: "11px", color: "#00e5ff", fontWeight: "600", background: "#001a2a", padding: "2px 6px", borderRadius: "4px" }}>{c.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DATE DROPDOWN ────────────────────────────────────────────────────────────
function DateDropdown({ value, onChange, placeholder }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref               = useRef(null);

  const filtered = DATE_OPTIONS.filter((d) =>
    !query || d.label.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 60);

  const selectedOption = DATE_OPTIONS.find((d) => d.value === value);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Scroll to selected on open
  const listRef = useRef(null);
  useEffect(() => {
    if (open && listRef.current && value) {
      const idx = filtered.findIndex((d) => d.value === value);
      if (idx > 0) listRef.current.scrollTop = Math.max(0, idx - 2) * 40;
    }
  }, [open]);

  const inputStyle = {
    background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "8px",
    color: "#c8d8e8", padding: "9px 12px", fontSize: "13px", outline: "none",
    width: "100%", fontFamily: "inherit", cursor: "pointer",
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <div
        style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}
        onClick={() => setOpen(!open)}
      >
        {selectedOption ? (
          <span style={{ color: "#fff" }}>📅 {selectedOption.label}</span>
        ) : (
          <span style={{ color: "#2a4060" }}>{placeholder}</span>
        )}
        <span style={{ color: "#2a5080", fontSize: "10px" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "#0d1f35", border: "1px solid #1e3a5f", borderRadius: "10px",
          overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <div style={{ padding: "8px" }}>
            <input
              autoFocus
              style={{ ...inputStyle, fontSize: "12px" }}
              placeholder="Search date (e.g. Apr, Mon)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div ref={listRef} style={{ maxHeight: "240px", overflowY: "auto" }}>
            {filtered.map((d) => (
              <div
                key={d.value}
                onClick={() => { onChange(d.value); setOpen(false); setQuery(""); }}
                style={{
                  padding: "10px 16px", cursor: "pointer", fontSize: "13px",
                  color: value === d.value ? "#00e5ff" : "#c8d8e8",
                  background: value === d.value ? "#1a3a5f" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#1a2a4f"}
                onMouseLeave={(e) => e.currentTarget.style.background = value === d.value ? "#1a3a5f" : "transparent"}
              >
                {d.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADD ROUTE PANEL ──────────────────────────────────────────────────────────
function AddRoutePanel({ onAdd, onCancel }) {
  const [fromCity,   setFromCity]   = useState(null);
  const [toCity,     setToCity]     = useState(null);
  const [tripType,   setTripType]   = useState("oneway");
  const [departDate, setDepartDate] = useState(getFutureDate(30));
  const [returnDate, setReturnDate] = useState(getFutureDate(37));
  const [error,      setError]      = useState("");

  function handleAdd() {
    if (!fromCity) return setError("Please select a departure city");
    if (!toCity)   return setError("Please select a destination city");
    if (fromCity.code === toCity.code) return setError("Origin and destination must be different");
    if (tripType === "round" && returnDate <= departDate) return setError("Return date must be after departure");
    setError("");
    onAdd({ fromCity, toCity, departDate, returnDate: tripType === "round" ? returnDate : null, tripType });
  }

  const tabBtn = (active) => ({
    flex: 1, padding: "7px", borderRadius: "6px", border: "none", cursor: "pointer",
    fontFamily: "inherit", fontSize: "11px", fontWeight: "600", letterSpacing: "0.5px",
    background: active ? "#00e5ff" : "transparent",
    color: active ? "#0a1628" : "#4a6080",
    transition: "all 0.15s",
  });

  return (
    <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ fontSize: "10px", color: "#2a5080", letterSpacing: "2px" }}>NEW ROUTE</div>

      {/* Trip type toggle */}
      <div style={{ display: "flex", gap: "4px", background: "#060e1a", padding: "4px", borderRadius: "8px", border: "1px solid #0d1f35" }}>
        <button onClick={() => setTripType("oneway")} style={tabBtn(tripType === "oneway")}>✈ One Way</button>
        <button onClick={() => setTripType("round")}  style={tabBtn(tripType === "round")}>🔄 Round Trip</button>
      </div>

      <div>
        <div style={{ fontSize: "10px", color: "#2a5080", marginBottom: "4px", letterSpacing: "1px" }}>FROM</div>
        <CityDropdown value={fromCity} onChange={setFromCity} placeholder="Select departure city" exclude={toCity} />
      </div>

      <div>
        <div style={{ fontSize: "10px", color: "#2a5080", marginBottom: "4px", letterSpacing: "1px" }}>TO</div>
        <CityDropdown value={toCity} onChange={setToCity} placeholder="Select destination city" exclude={fromCity} />
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "10px", color: "#2a5080", marginBottom: "4px", letterSpacing: "1px" }}>DEPART</div>
          <DateDropdown value={departDate} onChange={setDepartDate} placeholder="Departure date" />
        </div>
        {tripType === "round" && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "10px", color: "#00e5ff", marginBottom: "4px", letterSpacing: "1px" }}>RETURN</div>
            <DateDropdown value={returnDate} onChange={setReturnDate} placeholder="Return date" />
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: "11px", color: "#ff6b35" }}>⚠ {error}</div>}

      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
        <button onClick={handleAdd} style={{ flex: 1, padding: "9px", borderRadius: "8px", border: "none", cursor: "pointer", background: "#00e5ff", color: "#0a1628", fontWeight: "700", fontSize: "12px", fontFamily: "inherit" }}>
          Track Route
        </button>
        <button onClick={onCancel} style={{ flex: 1, padding: "9px", borderRadius: "8px", border: "1px solid #ff6b3544", cursor: "pointer", background: "transparent", color: "#ff6b35", fontWeight: "600", fontSize: "12px", fontFamily: "inherit" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function MiniSparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const w = 100, h = 32;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.price - min) / (max - min + 1)) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.8" points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── PRICE CHART ──────────────────────────────────────────────────────────────
function PriceChart({ data, alertPrice }) {
  const [hover, setHover] = useState(null);
  if (!data || data.length < 2) return null;
  const w = 600, h = 200, padL = 52, padB = 30, padT = 20, padR = 24;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices) - 30, max = Math.max(...prices) + 30;
  const xScale = (i) => padL + (i / (data.length - 1)) * (w - padL - padR);
  const yScale = (p) => padT + (1 - (p - min) / (max - min)) * (h - padT - padB);
  const pts = data.map((d, i) => `${xScale(i)},${yScale(d.price)}`).join(" ");
  const alertY = yScale(Math.max(min + 1, Math.min(alertPrice, max - 1)));
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
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
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
      {alertPrice > min && alertPrice < max && (
        <>
          <line x1={padL} x2={w - padR} y1={alertY} y2={alertY} stroke="#ff6b35" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.8" />
          <text x={w - padR + 4} y={alertY + 4} fill="#ff6b35" fontSize="9">Alert</text>
        </>
      )}
      <polygon fill="url(#lg)" points={`${padL},${h - padB} ${pts} ${w - padR},${h - padB}`} />
      <polyline fill="none" stroke="#00e5ff" strokeWidth="2.5" points={pts} strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
      {data.filter((_, i) => i % 5 === 0).map((d, i) => (
        <text key={i} x={xScale(i * 5)} y={h - 5} fill="#4a6080" fontSize="9" textAnchor="middle">{d.date}</text>
      ))}
      {hover !== null && (
        <g>
          <line x1={xScale(hover)} x2={xScale(hover)} y1={padT} y2={h - padB} stroke="#00e5ff" strokeWidth="1" opacity="0.3" />
          <circle cx={xScale(hover)} cy={yScale(data[hover].price)} r="5" fill="#00e5ff" stroke="#0a1628" strokeWidth="2" />
          <rect x={xScale(hover) - 35} y={yScale(data[hover].price) - 28} width="70" height="22" rx="4" fill="#0d1f35" stroke="#00e5ff" strokeWidth="1" opacity="0.95" />
          <text x={xScale(hover)} y={yScale(data[hover].price) - 13} fill="#00e5ff" fontSize="11" textAnchor="middle" fontWeight="bold">${data[hover].price}</text>
        </g>
      )}
    </svg>
  );
}

function AlertBadge({ prediction, confidence }) {
  const isRise = prediction === "rise";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", background: isRise ? "rgba(255,107,53,0.12)" : "rgba(0,229,108,0.12)", border: `1px solid ${isRise ? "#ff6b35" : "#00e56c"}`, fontSize: "12px", fontWeight: "600", color: isRise ? "#ff6b35" : "#00e56c" }}>
      {isRise ? "▲" : "▼"} Likely to {isRise ? "RISE" : "DROP"} · {confidence}%
    </div>
  );
}


// ─── FLIGHT INFO CARD ─────────────────────────────────────────────────────────
function FlightInfoCard({ flightInfo, tripType, label = "OUTBOUND" }) {
  if (!flightInfo) return null;
  const stops = flightInfo.stops === 0 ? "Direct" : `${flightInfo.stops} stop${flightInfo.stops > 1 ? "s" : ""}`;
  return (
    <div style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "16px", flex: 1 }}>
      <div style={{ fontSize: "9px", color: "#2a5080", letterSpacing: "2px", marginBottom: "12px" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span style={{ fontSize: "22px" }}>{flightInfo.logo}</span>
        <div>
          <div style={{ fontSize: "13px", color: "#fff", fontWeight: "600" }}>{flightInfo.airline}</div>
          <div style={{ fontSize: "11px", color: "#2a5080" }}>{flightInfo.flight}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: "600", color: "#fff" }}>{flightInfo.departs}</div>
          <div style={{ fontSize: "9px", color: "#2a5080", letterSpacing: "1px" }}>DEPARTS</div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#2a5080", marginBottom: "2px" }}>{flightInfo.duration}</div>
          <div style={{ height: "1px", background: "linear-gradient(90deg, #1e3a5f, #00e5ff, #1e3a5f)", position: "relative" }}>
            <div style={{ position: "absolute", right: "0", top: "-4px", color: "#00e5ff", fontSize: "8px" }}>▶</div>
          </div>
          <div style={{ fontSize: "9px", color: flightInfo.stops === 0 ? "#00e56c" : "#ff6b35", marginTop: "2px" }}>{stops}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: "600", color: "#fff" }}>{flightInfo.arrives}</div>
          <div style={{ fontSize: "9px", color: "#2a5080", letterSpacing: "1px" }}>ARRIVES</div>
        </div>
      </div>
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
  const [routes,        setRoutes]        = useState(DEMO_ROUTES);
  const [routeData,     setRouteData]     = useState({});
  const [loadingRoutes, setLoadingRoutes] = useState({});
  const [errorRoutes,   setErrorRoutes]   = useState({});
  const [selectedRoute, setSelectedRoute] = useState(1);
  const [alerts,        setAlerts]        = useState({});
  const [alertInput,    setAlertInput]    = useState("");
  const [addingRoute,   setAddingRoute]   = useState(false);
  const [tab,           setTab]           = useState("chart");

  const loadRouteData = useCallback(async (route) => {
    setLoadingRoutes((l) => ({ ...l, [route.id]: true }));
    setErrorRoutes((e)   => ({ ...e, [route.id]: null }));
    try {
      let history, prediction, confidence, avg, flightInfo = null;
      if (hasApiKeys) {
        const result = await buildPriceHistory(route.fromCity.code, route.toCity.code, route.departDate, route.returnDate || null);
        history    = result.history;
        flightInfo = result.flightInfo;
        ({ prediction, confidence, avg } = buildPrediction(history));
      } else {
        const base = Math.round(150 + Math.random() * 1000);
        history    = generatePriceHistory(base);
        prediction = Math.random() > 0.5 ? "rise" : "drop";
        confidence = Math.round(55 + Math.random() * 30);
        avg        = Math.round(history.reduce((a, b) => a + b.price, 0) / history.length);
        // Demo flight info
        const demoAirlines = ["AF", "TK", "LH", "PC", "KC"];
        const dc = demoAirlines[Math.floor(Math.random() * demoAirlines.length)];
        const da = AIRLINES[dc] || { name: dc, logo: "✈" };
        flightInfo = {
          airline: da.name, logo: da.logo, code: dc,
          flight: `${dc}${Math.floor(100 + Math.random()*900)}`,
          departs: `${Math.floor(6+Math.random()*14).toString().padStart(2,"0")}:${["00","15","30","45"][Math.floor(Math.random()*4)]}`,
          arrives: `${Math.floor(6+Math.random()*14).toString().padStart(2,"0")}:${["00","15","30","45"][Math.floor(Math.random()*4)]}`,
          duration: `${Math.floor(3+Math.random()*9)}h ${["00","15","30","45"][Math.floor(Math.random()*4)]}m`,
          stops: Math.random() > 0.6 ? 1 : 0,
          returnInfo: route.tripType === "round" ? {
            airline: da.name, logo: da.logo, code: dc,
            flight: `${dc}${Math.floor(100 + Math.random()*900)}`,
            departs: `${Math.floor(6+Math.random()*14).toString().padStart(2,"0")}:${["00","15","30","45"][Math.floor(Math.random()*4)]}`,
            arrives: `${Math.floor(6+Math.random()*14).toString().padStart(2,"0")}:${["00","15","30","45"][Math.floor(Math.random()*4)]}`,
            duration: `${Math.floor(3+Math.random()*9)}h ${["00","15","30","45"][Math.floor(Math.random()*4)]}m`,
            stops: Math.random() > 0.6 ? 1 : 0,
          } : null,
        };
      }
      const currentPrice = history[history.length - 1].price;
      setRouteData((d) => ({ ...d, [route.id]: { history, prediction, confidence, avg, flightInfo } }));
      setAlerts((a) => ({ ...a, [route.id]: a[route.id] ?? Math.round(currentPrice * 0.92) }));
    } catch (err) {
      setErrorRoutes((e) => ({ ...e, [route.id]: err.message }));
    } finally {
      setLoadingRoutes((l) => ({ ...l, [route.id]: false }));
    }
  }, []);

  useEffect(() => { DEMO_ROUTES.forEach(loadRouteData); }, [loadRouteData]);


  function handleDeleteRoute(id) {
    const remaining = routes.filter((r) => r.id !== id);
    setRoutes(remaining);
    if (selectedRoute === id) {
      setSelectedRoute(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  function handleAddRoute({ fromCity, toCity, departDate, returnDate, tripType }) {
    const id = Date.now();
    const newRoute = { id, fromCity, toCity, departDate, returnDate, tripType };
    setRoutes((r) => [...r, newRoute]);
    setSelectedRoute(id);
    setAddingRoute(false);
    loadRouteData(newRoute);
  }

  function handleSetAlert() {
    const val = parseInt(alertInput);
    if (!isNaN(val) && val > 0) {
      setAlerts((a) => ({ ...a, [selectedRoute]: val }));
      setAlertInput("");
    }
  }

  const data         = routeData[selectedRoute];
  const isLoading    = loadingRoutes[selectedRoute];
  const error        = errorRoutes[selectedRoute];
  const currentRoute = routes.find((r) => r.id === selectedRoute);
  const currentPrice = data?.history[data.history.length - 1]?.price ?? 0;
  const prevPrice    = data?.history[data.history.length - 2]?.price ?? currentPrice;
  const change       = currentPrice - prevPrice;
  const alertPrice   = alerts[selectedRoute] ?? (currentPrice ? Math.round(currentPrice * 0.92) : 0);
  const triggered    = currentPrice > 0 && alertPrice > 0 && currentPrice <= alertPrice;
  const h7           = data?.history.slice(-7) ?? [];
  const minWeek      = h7.length ? Math.min(...h7.map((d) => d.price)) : 0;
  const maxWeek      = h7.length ? Math.max(...h7.map((d) => d.price)) : 0;

  const btnStyle = (active, color = "#00e5ff") => ({
    padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: "600", fontSize: "13px", fontFamily: "inherit",
    background: active ? color : "transparent",
    color: active ? "#0a1628" : color,
    boxShadow: active ? `0 0 14px ${color}55` : "none",
    outline: active ? "none" : `1px solid ${color}44`,
    transition: "all 0.2s",
  });

  const inputStyle = {
    background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "8px",
    color: "#c8d8e8", padding: "8px 12px", fontSize: "13px", outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", fontFamily: "'DM Mono','Fira Code',monospace", color: "#c8d8e8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #060e1a; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
        input::placeholder { color: #2a4060; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
        .fade-in { animation: fadeIn 0.35s ease; }
        .route-card:hover { background: #0d2040 !important; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #0d1f35", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#080f1e,transparent)" }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "22px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" }}>✈ FLIGHTWATCH</div>
          <div style={{ fontSize: "10px", color: "#2a5080", letterSpacing: "2px", marginTop: "2px" }}>PERSONAL PRICE TRACKER</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {!hasApiKeys && (
            <div style={{ fontSize: "11px", color: "#ff6b35", background: "rgba(255,107,53,0.1)", border: "1px solid #ff6b3533", padding: "4px 10px", borderRadius: "6px" }}>
              ⚠ DEMO MODE
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: hasApiKeys ? "#00e56c" : "#ff6b35", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "11px", color: hasApiKeys ? "#00e56c" : "#ff6b35", letterSpacing: "1px" }}>{hasApiKeys ? "LIVE" : "DEMO"}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 69px)" }}>

        {/* Sidebar */}
        <div style={{ width: "270px", flexShrink: 0, borderRight: "1px solid #0d1f35", padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "10px", color: "#2a5080", letterSpacing: "2px", marginBottom: "4px", paddingLeft: "2px" }}>TRACKED ROUTES</div>

          {routes.map((r) => {
            const rd    = routeData[r.id];
            const cp    = rd?.history[rd.history.length - 1]?.price ?? 0;
            const al    = alerts[r.id];
            const trig  = cp > 0 && al && cp <= al;
            const load  = loadingRoutes[r.id];
            const err   = errorRoutes[r.id];
            return (
              <div key={r.id} className="route-card" onClick={() => setSelectedRoute(r.id)} style={{ padding: "12px", borderRadius: "10px", cursor: "pointer", border: selectedRoute === r.id ? "1px solid #00e5ff44" : "1px solid #0d1f35", background: selectedRoute === r.id ? "#0b1e38" : "#080f1e", transition: "all 0.15s", position: "relative" }}>
                {trig && <div style={{ position: "absolute", top: "8px", right: "8px", width: "7px", height: "7px", borderRadius: "50%", background: "#ff6b35", animation: "pulse 1s infinite" }} />}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteRoute(r.id); }}
                  title="Remove route"
                  style={{ position: "absolute", bottom: "10px", right: "10px", background: "none", border: "none", cursor: "pointer", color: "#2a5080", fontSize: "14px", lineHeight: 1, padding: "2px 4px", borderRadius: "4px", opacity: 0.6 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ff6b35"; e.currentTarget.style.opacity = 1; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#2a5080"; e.currentTarget.style.opacity = 0.6; }}
                >✕</button>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px" }}>{r.fromCity.flag}</span>
                  <span style={{ fontSize: "11px", color: "#00e5ff", fontWeight: "600" }}>{r.fromCity.code}</span>
                  <span style={{ color: "#2a5080" }}>→</span>
                  <span style={{ fontSize: "14px" }}>{r.toCity.flag}</span>
                  <span style={{ fontSize: "11px", color: "#00e5ff", fontWeight: "600" }}>{r.toCity.code}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <span style={{ fontSize: "10px", color: "#2a5080" }}>{r.departDate}</span>
                  {r.tripType === "round" && r.returnDate && (
                    <span style={{ fontSize: "9px", color: "#00e5ff", background: "rgba(0,229,255,0.08)", border: "1px solid #00e5ff33", padding: "1px 5px", borderRadius: "3px" }}>
                      → {r.returnDate}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: "2px" }}>
                  <span style={{ fontSize: "9px", letterSpacing: "1px", color: r.tripType === "round" ? "#00e56c" : "#4a6080" }}>
                    {r.tripType === "round" ? "🔄 ROUND TRIP" : "✈ ONE WAY"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  {load ? <span style={{ fontSize: "11px", color: "#2a5080" }}>Loading…</span>
                    : err ? <span style={{ fontSize: "11px", color: "#ff6b35" }}>Error</span>
                    : <>
                        <span style={{ fontSize: "17px", fontWeight: "500", color: "#fff" }}>{cp ? `$${cp}` : "—"}</span>
                        <MiniSparkline data={rd?.history.slice(-12) ?? []} color={trig ? "#ff6b35" : "#00e5ff"} />
                      </>
                  }
                </div>
              </div>
            );
          })}

          {addingRoute
            ? <AddRoutePanel onAdd={handleAddRoute} onCancel={() => setAddingRoute(false)} />
            : <button onClick={() => setAddingRoute(true)} style={{ ...btnStyle(false), marginTop: "4px", padding: "10px", borderRadius: "10px", fontSize: "12px", width: "100%" }}>+ Track New Route</button>
          }
        </div>

        {/* Main Panel */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }} className="fade-in">

          {isLoading && <LoadingSpinner />}

          {error && !isLoading && (
            <div style={{ background: "rgba(255,107,53,0.07)", border: "1px solid #ff6b3530", borderRadius: "12px", padding: "20px" }}>
              <div style={{ color: "#ff6b35", fontWeight: "600", marginBottom: "8px" }}>⚠ Could not fetch prices</div>
              <div style={{ color: "#8aabcc", fontSize: "13px", marginBottom: "12px" }}>{error}</div>
              <button onClick={() => loadRouteData(currentRoute)} style={{ ...btnStyle(true, "#ff6b35"), fontSize: "12px" }}>Retry</button>
            </div>
          )}

          {data && !isLoading && currentRoute && (
            <>
              {/* Route header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "22px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>{currentRoute.fromCity.flag} {currentRoute.fromCity.city}</span>
                    <span style={{ color: "#2a5080" }}>→</span>
                    <span>{currentRoute.toCity.flag} {currentRoute.toCity.city}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#2a5080", marginTop: "5px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span>✈ {currentRoute.departDate}</span>
                    {currentRoute.tripType === "round" && currentRoute.returnDate && (
                      <span style={{ color: "#00e5ff" }}>🔄 Return {currentRoute.returnDate}</span>
                    )}
                    <span>· {hasApiKeys ? "Live Amadeus data" : "Demo mode"}</span>
                    <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "4px", border: currentRoute.tripType === "round" ? "1px solid #00e56c44" : "1px solid #4a608044", color: currentRoute.tripType === "round" ? "#00e56c" : "#4a6080" }}>
                      {currentRoute.tripType === "round" ? "ROUND TRIP" : "ONE WAY"}
                    </span>
                  </div>
                </div>
                <AlertBadge prediction={data.prediction} confidence={data.confidence} />
              </div>

              {/* Stats cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "24px" }}>
                {[
                  { label: "CURRENT PRICE", value: `$${currentPrice}`, sub: `${change >= 0 ? "+" : ""}$${change} vs yesterday`, color: change > 0 ? "#ff6b35" : "#00e56c" },
                  { label: "ALERT SET AT",  value: alertPrice ? `$${alertPrice}` : "—", sub: triggered ? "🔔 TRIGGERED!" : "Watching…", color: triggered ? "#ff6b35" : "#8aabcc" },
                  { label: "7D RANGE",      value: `$${minWeek}–$${maxWeek}`, sub: "Low / High", color: "#8aabcc" },
                  { label: "BEST TIME",     value: data.prediction === "drop" ? "Wait 1–2w" : "Book now", sub: `${data.confidence}% confidence`, color: data.prediction === "drop" ? "#00e56c" : "#ff6b35" },
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
                {[["chart","Price History"],["flights","Flights"],["alert","Set Alert"],["predict","Prediction"]].map(([t, label]) => (
                  <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 16px", fontSize: "12px", letterSpacing: "1px", fontFamily: "inherit", color: tab === t ? "#00e5ff" : "#2a5080", borderBottom: tab === t ? "2px solid #00e5ff" : "2px solid transparent", marginBottom: "-1px", transition: "color 0.15s" }}>{label}</button>
                ))}
              </div>

              {tab === "chart" && (
                <div style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "1px", marginBottom: "12px" }}>30-DAY PRICE HISTORY · Hover for details</div>
                  <PriceChart data={data.history} alertPrice={alertPrice} />
                </div>
              )}

              {tab === "flights" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {data.flightInfo ? (
                    <>
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <FlightInfoCard flightInfo={data.flightInfo} tripType={currentRoute.tripType} label={currentRoute.tripType === "round" ? "OUTBOUND FLIGHT" : "FLIGHT"} />
                        {currentRoute.tripType === "round" && data.flightInfo.returnInfo && (
                          <FlightInfoCard flightInfo={data.flightInfo.returnInfo} tripType="oneway" label="RETURN FLIGHT" />
                        )}
                      </div>
                      <div style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "16px" }}>
                        <div style={{ fontSize: "9px", color: "#2a5080", letterSpacing: "2px", marginBottom: "12px" }}>PRICE BREAKDOWN</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {currentRoute.tripType === "round" ? (
                            <>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "12px", color: "#8aabcc" }}>Outbound ({data.flightInfo.flight})</span>
                                <span style={{ fontSize: "12px", color: "#c8d8e8" }}>included</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "12px", color: "#8aabcc" }}>Return ({data.flightInfo.returnInfo?.flight ?? "—"})</span>
                                <span style={{ fontSize: "12px", color: "#c8d8e8" }}>included</span>
                              </div>
                              <div style={{ borderTop: "1px solid #0d1f35", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "13px", color: "#fff", fontWeight: "600" }}>Total Round Trip</span>
                                <span style={{ fontSize: "18px", color: "#00e5ff", fontWeight: "700" }}>${currentPrice}</span>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "13px", color: "#fff", fontWeight: "600" }}>One Way ({data.flightInfo.flight})</span>
                              <span style={{ fontSize: "18px", color: "#00e5ff", fontWeight: "700" }}>${currentPrice}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#2a5080", textAlign: "center" }}>
                        Cheapest available offer · Prices update on page refresh · {hasApiKeys ? "Live from Amadeus" : "Demo data"}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "#4a6080", fontSize: "13px", padding: "20px" }}>No flight info available.</div>
                  )}
                </div>
              )}

              {tab === "alert" && (
                <div style={{ background: "#080f1e", border: "1px solid #0d1f35", borderRadius: "12px", padding: "24px", maxWidth: "420px" }}>
                  <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "2px", marginBottom: "16px" }}>PRICE DROP ALERT</div>
                  <div style={{ fontSize: "13px", color: "#8aabcc", marginBottom: "16px" }}>
                    Notify when price drops below target. Current: <strong style={{ color: "#fff" }}>${currentPrice}</strong>
                  </div>
                  {triggered && (
                    <div style={{ background: "rgba(255,107,53,0.1)", border: "1px solid #ff6b3544", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "#ff6b35", fontSize: "13px" }}>
                      🔔 Alert triggered! Price hit ${currentPrice} — below your target of ${alertPrice}.
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder={`Current alert: $${alertPrice}`} value={alertInput} onChange={(e) => setAlertInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSetAlert()} />
                    <button onClick={handleSetAlert} style={{ ...btnStyle(true), whiteSpace: "nowrap" }}>Set Alert</button>
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
                        <div style={{ width: `${data.confidence}%`, height: "100%", background: data.prediction === "drop" ? "#00e56c" : "#ff6b35", borderRadius: "2px", transition: "width 0.6s" }} />
                      </div>
                      <span style={{ fontSize: "14px", color: "#fff" }}>{data.confidence}%</span>
                    </div>
                    <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "8px", padding: "16px", marginTop: "4px" }}>
                      <div style={{ fontSize: "11px", color: "#2a5080", letterSpacing: "1px", marginBottom: "8px" }}>METHODOLOGY</div>
                      <div style={{ fontSize: "12px", color: "#4a6080", lineHeight: "1.7" }}>
                        Based on 7-day momentum vs 30-day average. Confidence reflects trend strength relative to recent volatility.
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
