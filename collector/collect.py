"""
FlightWatch Daily Price Collector
Runs via GitHub Actions every day — fetches prices from Amadeus and stores in Supabase.
"""

import os
import sys
import json
import time
import requests
from datetime import datetime, timedelta

# ── CONFIG ────────────────────────────────────────────────────────────────────
AMADEUS_KEY    = os.environ["AMADEUS_KEY"]
AMADEUS_SECRET = os.environ["AMADEUS_SECRET"]
SUPABASE_URL   = os.environ["SUPABASE_URL"]
SUPABASE_KEY   = os.environ["SUPABASE_ANON_KEY"]

# Routes to track: (origin, destination, days_ahead)
# days_ahead = how far in the future to check prices
ROUTES = [
    ("CDG", "ALA", 45),
    ("ORY", "ALA", 45),
    ("ALA", "CDG", 45),
    ("ALA", "ORY", 45),
    ("CDG", "ESB", 45),
    ("ORY", "ESB", 45),
    ("ESB", "ORY", 45),
    ("ESB", "CDG", 45),
    # Add more routes here
]

# ── AMADEUS AUTH ──────────────────────────────────────────────────────────────
def get_amadeus_token():
    res = requests.post(
        "https://test.api.amadeus.com/v1/security/oauth2/token",
        data={
            "grant_type": "client_credentials",
            "client_id": AMADEUS_KEY,
            "client_secret": AMADEUS_SECRET,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    res.raise_for_status()
    return res.json()["access_token"]


# ── FETCH CHEAPEST PRICE ──────────────────────────────────────────────────────
def fetch_price(token, origin, destination, depart_date):
    url = "https://test.api.amadeus.com/v2/shopping/flight-offers"
    params = {
        "originLocationCode": origin,
        "destinationLocationCode": destination,
        "departureDate": depart_date,
        "adults": 1,
        "max": 5,
        "currencyCode": "USD",
    }
    res = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params)

    if res.status_code == 429:
        print(f"  Rate limited, waiting 10s...")
        time.sleep(10)
        res = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params)

    if res.status_code != 200:
        print(f"  API error {res.status_code}: {res.text[:200]}")
        return None

    data = res.json()
    if not data.get("data"):
        return None

    prices = [float(offer["price"]["total"]) for offer in data["data"]]
    return round(min(prices))


# ── SAVE TO SUPABASE ──────────────────────────────────────────────────────────
def save_to_supabase(records):
    url = f"{SUPABASE_URL}/rest/v1/price_history"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    res = requests.post(url, headers=headers, json=records)
    if res.status_code not in (200, 201):
        print(f"  Supabase error {res.status_code}: {res.text}")
        return False
    return True


# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{'='*50}")
    print(f"FlightWatch Collector — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'='*50}\n")

    print("Authenticating with Amadeus...")
    token = get_amadeus_token()
    print("✓ Token obtained\n")

    records = []
    errors  = 0

    for origin, destination, days_ahead in ROUTES:
        depart_date = (datetime.utcnow() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        route_key   = f"{origin}-{destination}"
        print(f"Fetching {route_key} → depart {depart_date} ({days_ahead}d ahead)...")

        price = fetch_price(token, origin, destination, depart_date)

        if price:
            print(f"  ✓ ${price}")
            records.append({
                "route":       route_key,
                "origin":      origin,
                "destination": destination,
                "price":       price,
                "currency":    "USD",
                "depart_date": depart_date,
            })
        else:
            print(f"  ✗ No price found")
            errors += 1

        time.sleep(1)  # be polite to the API

    print(f"\nSaving {len(records)} records to Supabase...")
    if records:
        ok = save_to_supabase(records)
        if ok:
            print(f"✓ Saved successfully")
        else:
            print("✗ Save failed")
            sys.exit(1)

    print(f"\n{'='*50}")
    print(f"Done. {len(records)} saved, {errors} errors.")
    print(f"{'='*50}\n")

    if errors > 0 and len(records) == 0:
        sys.exit(1)  # fail the GitHub Action if nothing was collected


if __name__ == "__main__":
    main()
