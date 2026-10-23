# DesignedPrice

DesignedPrice is an AI-assisted clothing valuation application. Users submit a garment photo, receive an AI-assisted identification, and get an estimated market-value range based on comparable marketplace listings.

Valuations are estimates, not guarantees of resale value, authentication, or professional appraisal.

## Features

- Account registration and login
- Garment image analysis with Google Gemini
- Identification of visible brand evidence, garment type, and estimated era
- Estimated low, median, and high prices based on comparable listings
- Marketplace search through SerpAPI
- Saved scan history in PostgreSQL using Prisma
- Web interface built with Next.js, React, and TypeScript
- Mobile interface built with Expo and React Native
- Image input validation, authenticated routes, and API rate limiting
- Automated API tests and GitHub Actions checks

## Architecture

| Path | Purpose |
| --- | --- |
| `apps/api` | Express/TypeScript API, Prisma schema/migrations, authentication, image analysis, pricing, and tests |
| `apps/web` | Next.js web application |
| `apps/mobile` | Expo/React Native mobile application |
| `.github/workflows/ci.yml` | Automated API, web, and mobile checks |

The API uses PostgreSQL, Google Gemini, and SerpAPI. Production image uploads require S3-backed storage.

## Requirements

- Node.js 22 and npm
- PostgreSQL database
- Google Gemini API key
- SerpAPI API key
- AWS S3 bucket and public image base URL for production image storage

## API setup

```bash
cd apps/api
npm install
cp .env.example .env
```

Edit `apps/api/.env` and provide real values for:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `SERPAPI_API_KEY`
- `JWT_SECRET`
- `ALLOWED_IMAGE_HOSTS`

For production, also configure:

- `NODE_ENV=production`
- `CORS_ORIGINS` with the exact web origin(s) allowed to call the API
- `S3_BUCKET`
- `S3_REGION`
- `S3_PUBLIC_BASE_URL`
- `PUBLIC_BASE_URL` if required by your deployment and local image URLs

Never commit `.env` files or real credentials.

Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Start the API:

```bash
npm run dev
```

The default local API address is http://localhost:4000. The health endpoint is `/health`.

## Web setup

```bash
cd apps/web
npm install
```

Create `apps/web/.env.local` with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Then run:

```bash
npm run dev
```

Open http://localhost:3000.

For production, set `NEXT_PUBLIC_API_URL` to the deployed HTTPS API origin and add the web origin to the API's `CORS_ORIGINS`.

## Mobile setup

```bash
cd apps/mobile
npm install
```

Set `EXPO_PUBLIC_API_URL` to an API address reachable from the device before starting Expo.

Examples:

- iOS simulator: `http://localhost:4000` may work.
- Android emulator: `http://10.0.2.2:4000` is commonly used to reach the host machine.
- Physical phone: use your computer's reachable LAN address, such as `http://192.168.1.20:4000`, with both devices on the same network.
- Production: use the deployed HTTPS API origin.

Start Expo:

```bash
npx expo start
```

Do not use the examples above as your production API URL. Use your actual deployed API origin.

## Automated checks

API build and tests:

```bash
cd apps/api
npm install
npm test
```

Web lint and production build:

```bash
cd apps/web
npm install
npm run lint
npm run build
```

Mobile TypeScript check:

```bash
cd apps/mobile
npm install
npx tsc --noEmit
```

The GitHub Actions workflow runs the API tests, web lint/build, and mobile TypeScript check for pushes and pull requests targeting `main`.

## Deployment checklist

- [ ] Use a managed PostgreSQL database and apply Prisma migrations.
- [ ] Set strong production secrets and real provider API keys.
- [ ] Set `NODE_ENV=production`.
- [ ] Configure `CORS_ORIGINS` with only the intended web origins.
- [ ] Configure S3 bucket and public image base URL for durable production images.
- [ ] Confirm uploaded image URLs are accessible to authorized application users as intended.
- [ ] Configure the web and mobile API URLs.
- [ ] Use HTTPS for all public endpoints.
- [ ] Test registration, login, invalid/expired tokens, image uploads, pricing, and scan history.
- [ ] Run all local checks and confirm GitHub Actions is green.

## Limitations

AI identification can be wrong. Marketplace listings may differ in condition, size, rarity, authenticity, currency, and seller circumstances. An estimate should be interpreted alongside the returned comparables and available evidence.

## License

Review the license files included with the individual applications before redistribution.
