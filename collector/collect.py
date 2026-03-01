"""
FlightWatch Daily Price Collector
Runs via GitHub Actions every day — fetches prices from Amadeus and stores in Supabase.
Supports both one-way and round trip routes.
"""

import os
import sys
import time
import requests
from datetime import datetime, timedelta

# ── CONFIG ────────────────────────────────────────────────────────────────────
AMADEUS_KEY    = os.environ["AMADEUS_KEY"]
AMADEUS_SECRET = os.environ["AMADEUS_SECRET"]
SUPABASE_URL   = os.environ["SUPABASE_URL"]
SUPABASE_KEY   = os.environ["SUPABASE_ANON_KEY"]

# ── ROUTES ────────────────────────────────────────────────────────────────────
# Format: (origin, destination, days_ahead, return_days_ahead_or_None, trip_type)
#
# days_ahead        = departure is this many days from today
# return_days_ahead = return leg is this many days from today (None = one-way)
# trip_type         = "round" or "oneway"
#
# The script runs daily, so "45 days ahead" always means 45 days from TODAY.
# This lets you track how the price evolves as the trip gets closer.

ROUTES = [
    # ── Paris CDG → Almaty (round trip, depart in 45d, return in 52d = 1 week trip)
    ("CDG", "ALA", 30, 52,   "round"),

    # ── Paris Orly → Almaty (round trip)
    ("ORY", "ALA", 30, 52,   "round"),

    # ── Paris CDG → Ankara (round trip)
    ("CDG", "ESB", 30, 52,   "round"),

    # ── Paris Orly → Ankara (round trip)
    ("ORY", "ESB", 30, 52,   "round"),

]

# ── AMADEUS AUTH ──────────────────────────────────────────────────────────────
def get_amadeus_token():
    res = requests.post(
        "https://test.api.amadeus.com/v1/security/oauth2/token",
        data={
            "grant_type":    "client_credentials",
            "client_id":     AMADEUS_KEY,
            "client_secret": AMADEUS_SECRET,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    res.raise_for_status()
    return res.json()["access_token"]


# ── FETCH CHEAPEST PRICE ──────────────────────────────────────────────────────
def fetch_price(token, origin, destination, depart_date, return_date=None):
    """
    Fetches the cheapest available flight price from Amadeus.

    For one-way:   searches outbound leg only
    For round trip: passes returnDate → Amadeus returns combined price for both legs
    """
    params = {
        "originLocationCode":      origin,
        "destinationLocationCode": destination,
        "departureDate":           depart_date,
        "adults":                  1,
        "max":                     5,
        "currencyCode":            "USD",
    }

    # Add return date only for round trips
    if return_date:
        params["returnDate"] = return_date

    url = "https://test.api.amadeus.com/v2/shopping/flight-offers"
    res = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params)

    # Handle rate limiting gracefully
    if res.status_code == 429:
        print(f"  ⏳ Rate limited — waiting 15s...")
        time.sleep(15)
        res = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params)

    if res.status_code != 200:
        print(f"  ✗ API error {res.status_code}: {res.text[:200]}")
        return None

    data = res.json()
    if not data.get("data"):
        return None

    prices = [float(offer["price"]["total"]) for offer in data["data"]]
    return round(min(prices))


# ── SAVE TO SUPABASE ──────────────────────────────────────────────────────────
def save_to_supabase(records):
    """
    Inserts all collected records into the price_history table in Supabase.
    Uses batch insert — sends all records in one HTTP request.
    """
    url = f"{SUPABASE_URL}/rest/v1/price_history"
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }
    res = requests.post(url, headers=headers, json=records)
    if res.status_code not in (200, 201):
        print(f"  ✗ Supabase error {res.status_code}: {res.text}")
        return False
    return True


# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    today = datetime.utcnow()

    print(f"\n{'='*55}")
    print(f"FlightWatch Collector — {today.strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'='*55}\n")

    print("Authenticating with Amadeus...")
    token = get_amadeus_token()
    print("✓ Token obtained\n")

    records = []
    errors  = 0

    for route_def in ROUTES:
        origin, destination, days_ahead, return_days_ahead, trip_type = route_def

        depart_date = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        return_date = (today + timedelta(days=return_days_ahead)).strftime("%Y-%m-%d") if return_days_ahead else None
        route_key   = f"{origin}-{destination}"
        trip_label  = "round" if trip_type == "round" else "oneway"

        if return_date:
            print(f"Fetching {route_key} [{trip_label}] depart {depart_date} → return {return_date}...")
        else:
            print(f"Fetching {route_key} [{trip_label}] depart {depart_date}...")

        price = fetch_price(token, origin, destination, depart_date, return_date)

        if price:
            print(f"  ✓ ${price}")
            records.append({
                "route":        route_key,
                "origin":       origin,
                "destination":  destination,
                "trip_type":    trip_type,
                "price":        price,
                "currency":     "USD",
                "depart_date":  depart_date,
                "return_date":  return_date,   # NULL for one-way routes
                "days_ahead":   days_ahead,
            })
        else:
            print(f"  ✗ No price found")
            errors += 1

        time.sleep(1.5)  # be polite to the API

    print(f"\nSaving {len(records)} records to Supabase...")
    if records:
        ok = save_to_supabase(records)
        if ok:
            print(f"✓ Saved successfully")
        else:
            print("✗ Save failed")
            sys.exit(1)
    else:
        print("⚠ No records to save")

    print(f"\n{'='*55}")
    print(f"Done. {len(records)} saved, {errors} errors.")
    print(f"{'='*55}\n")

    if errors > 0 and len(records) == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()