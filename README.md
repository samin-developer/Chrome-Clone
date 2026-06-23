# Chrome Clone — Omnibox Redirector

A Google Chrome-inspired web app with real-world API integrations.

## Features
- Email/password signup & login (JWT auth)
- Omnibox: type a URL → opens site | type text → searches Google
- Live weather (Open-Meteo API)
- Live crypto prices (CoinGecko API)
- Search history saved per user
- Knowledge panels for "weather" and "bitcoin" searches

## Setup

```bash
pip install flask flask-jwt-extended werkzeug
python app.py
```

Open: http://127.0.0.1:5000

## Free APIs Used
- Open-Meteo: https://open-meteo.com (no key needed)
- CoinGecko: https://coingecko.com/api (free tier, no key needed)
