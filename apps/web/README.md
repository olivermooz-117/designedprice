# DesignedPrice Web

The DesignedPrice web application is built with Next.js, React, TypeScript, and Tailwind CSS. It connects to the DesignedPrice API for authentication, garment image analysis, price estimates, and scan history.

## Requirements

- Node.js 22 or a compatible supported Node.js release
- npm
- The DesignedPrice API running locally or deployed
- Valid API/database/AI provider configuration on the API server

## Configure the API URL

Create a local environment file:

```bash
cp .env.example .env.local
```

If `.env.example` does not exist yet, create `.env.local` with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Set `NEXT_PUBLIC_API_URL` to your deployed HTTPS API origin in production. This variable is public and must not contain secrets.

## Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Checks

```bash
npm run lint
npm run build
```

Run these checks before opening a pull request or deploying.

## Production notes

- Configure `NEXT_PUBLIC_API_URL` in your hosting provider.
- Configure the API's `CORS_ORIGINS` to include the exact deployed web origin.
- Use HTTPS for public endpoints.
- Keep API keys, database credentials, and JWT secrets on the API server only.
- Test registration, login, image analysis, valuation results, and scan history against the deployed API.

See the repository root README for the complete project architecture and API/mobile setup.
