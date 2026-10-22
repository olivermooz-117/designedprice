# DesignedPrice

DesignedPrice is an AI-assisted clothing valuation application that analyzes garment images and estimates market value using comparable online listings.

## Features

- User registration and login
- AI garment identification using Google Gemini
- Estimated garment brand, type, and era
- Low, median, and high price estimates
- Comparable listing search using SerpAPI
- PostgreSQL persistence using Prisma
- Web application built with Next.js, React, and TypeScript
- Mobile application built with Expo and React Native
- Express and TypeScript API
- Image validation and authenticated API routes

Valuations are estimates and are not guarantees of resale value or proof of authenticity.

## Architecture

- `apps/web` — Next.js web application
- `apps/mobile` — Expo / React Native application
- `apps/api` — Express API, Prisma schema, database migrations, AI services, and tests

The API connects to PostgreSQL, Google Gemini, and SerpAPI. Image storage can be configured to use S3.

## Requirements

- Node.js and npm
- PostgreSQL
- Google Gemini API key
- SerpAPI API key
- Optional AWS S3 configuration for image storage

## Backend setup

```bash
cd apps/api
npm install
cp .env.example .env
```

Edit `apps/api/.env` and configure:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `SERPAPI_API_KEY`
- `JWT_SECRET`
- `ALLOWED_IMAGE_HOSTS`
- `CORS_ORIGINS` for production
- `PUBLIC_BASE_URL` where required
- Optional S3 settings

Never commit real credentials or `.env` files.

Prepare the database:

```bash
npx prisma generate
npx prisma migrate deploy
```

Start the API:

```bash
npm run dev
```

The default local API URL is `http://localhost:4000`. Its health endpoint is `/health`.

## Web setup

```bash
cd apps/web
npm install
npm run dev
```

The web application runs at `http://localhost:3000`.

Configure `NEXT_PUBLIC_API_URL` if the API is hosted at a different address.

Check the web app:

```bash
npm run lint
npm run build
```

## Mobile setup

```bash
cd apps/mobile
npm install
npx expo start
```

Configure `EXPO_PUBLIC_API_URL` to point to the API. For a physical device, use an address reachable from that device; for production, use the deployed HTTPS API URL.

## API tests

```bash
cd apps/api
npm test
```

The test command builds the API and runs its Node.js test suite.

## Deployment checklist

- Configure environment variables in the hosting platform.
- Use a managed PostgreSQL database and apply Prisma migrations.
- Set production CORS origins explicitly.
- Use HTTPS for public endpoints.
- Configure persistent image storage for production.
- Set the web and mobile API URLs correctly.
- Test registration, login, image analysis, valuations, and history.
- Run tests and production builds before releasing.

## Limitations

AI identification and price comparisons may be inaccurate. Comparable listings can differ in condition, size, rarity, authenticity, and seller circumstances. Results should be treated as estimates.

## License

Review the license files included with the individual applications before redistribution.
