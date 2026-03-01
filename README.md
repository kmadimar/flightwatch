# ✈ FlightWatch – Personal Flight Price Tracker

Track flight prices, set drop alerts, and get booking predictions. Free, personal use, no backend required.

---

## 🚀 Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Run locally
npm start
# Opens at http://localhost:3000
```

---

## ☁️ Deploy to Vercel (Free, Recommended)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → sign in with GitHub
3. Click **"Add New Project"** → select your repo
4. Click **Deploy** — done!

Your app will be live at `https://flightwatch-yourname.vercel.app`

---

## 📄 Deploy to GitHub Pages (Free)

```bash
# 1. Add your repo URL to package.json "homepage" field:
#    "homepage": "https://yourusername.github.io/flightwatch"

# 2. Install gh-pages
npm install

# 3. Deploy
npm run deploy
```

---

## 🔌 Connect Real Flight Data (Optional)

To get real prices instead of simulated data:

1. Sign up free at [developers.amadeus.com](https://developers.amadeus.com)
2. Create an app → get your `API_KEY` and `API_SECRET`
3. Create a `.env` file:
```
REACT_APP_AMADEUS_KEY=your_key_here
REACT_APP_AMADEUS_SECRET=your_secret_here
```
4. Replace `generatePriceHistory()` in `App.js` with real Amadeus API calls

Free tier: **2,000 API calls/month** — plenty for personal use.

---

## 📁 Project Structure

```
flightwatch/
├── public/
│   └── index.html
├── src/
│   ├── index.js      ← Entry point
│   └── App.js        ← Main app (all components)
├── package.json
└── README.md
```

---

## ✨ Features

- 📈 30-day interactive price history chart
- 🔔 Custom price drop alerts per route
- 🔮 Buy now vs wait prediction with confidence score
- ➕ Add unlimited custom routes
- 💾 No backend needed — runs entirely in browser
