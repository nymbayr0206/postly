# Postly Phase 1 (Image Generation)

Phase 1 ships a minimal production-ready Postly app where authenticated users generate NanoBanana images using a credit wallet.

## Stack

- Next.js (App Router)
- Next.js Route Handlers (`/api/generate-image`)
- Supabase (Auth + Postgres + RLS)
- Tailwind CSS

## Features Included

- Email/password sign up + login
- User dashboard
- Current credit balance
- Image generation form
  - Prompt
  - Aspect ratio (`1:1`, `4:5`, `16:9`)
  - Up to 3 reference images
- NanoBanana API integration
- Credit deduction only after successful generation
- Generation history with download buttons
- Credit request submission
- Admin panel
  - View users
  - View generation stats
  - Approve/reject credit requests
  - Edit tariff multipliers
  - Edit model base costs

## Supabase Setup

Run the SQL migration in your Supabase SQL editor:

- `supabase/migrations/202603060001_phase1.sql`

This migration creates:

- `users`
- `wallets`
- `tariffs`
- `models`
- `generations`
- `credit_requests`
- RLS policies
- helper RPCs for safe wallet deduction and credit request processing
- auth trigger to create `users` + `wallets` rows on signup

After migration, promote one account to admin manually in Supabase:

```sql
update public.users
set role = 'admin'
where email = 'admin@example.com';
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NANOBANANA_API_URL`
- `NANOBANANA_API_KEY`
- `NANOBANANA_MODEL_NAME` (default: `nanobanana`)
- `NANOBANANA_TIMEOUT_MS` (default: `60000`)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

### `POST /api/generate-image`

Body:

```json
{
  "prompt": "cinematic portrait of an astronaut in neon rain",
  "aspect_ratio": "1:1",
  "reference_images": []
}
```

Behavior:

1. Authenticates user
2. Loads tariff + model pricing
3. Checks wallet credits
4. Calls NanoBanana API
5. Deducts credits and inserts generation record atomically
6. Returns image URL and remaining credits

