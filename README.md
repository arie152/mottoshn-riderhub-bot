# MottoSHN Rider Hub (MVP)

Reserve Rider Numbers (1–88), show a countdown, and provide PayNow instructions to lock each slot.

## Stack
- Node.js built-in HTTP server (no external dependencies)
- JSON file storage (`db/reservations.json`)
- Mobile-first vanilla frontend

## Features
- Public slot board (`available`, `pending`, `confirmed`)
- Reservation form with validation + sanitization
- PayNow reference generation (`RIDER-<number>`)
- Countdown timer to campaign deadline
- Admin APIs protected by `x-admin-token`
- Basic IP rate limiting

## API
- `GET /api/config`
- `GET /api/slots`
- `POST /api/reservations`
- `GET /api/admin/reservations` (requires `x-admin-token`)
- `POST /api/admin/reservations/:id/confirm` (requires `x-admin-token`)

## Local run
```bash
cp .env.example .env
set -a && source .env && set +a
npm run dev
```

Open: `http://localhost:3000`

## Test
```bash
npm test
```

## Deploy (Railway quick path)
1. Push this repo to GitHub.
2. New Railway project → Deploy from GitHub.
3. Set environment variables from `.env.example`.
4. Start command: `npm start`.

## Cost snapshot
- Railway starter: low double-digits USD/month when always-on.
- Cheapest alternative: Render free spin-down or Fly.io shared VM.

## Notes
- File storage is okay for MVP and single-instance deploy.
- For scale: migrate to Supabase Postgres + Redis rate limits + automated payment reconciliation webhook.
