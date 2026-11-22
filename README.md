# Prime Wash invitation-only registration and ERP API

A minimal Node.js + Express + PostgreSQL authentication service where only a database-verified `boss` can invite members. There is no public signup route.

## Setup

```bash
npm install
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, and APP_URL in .env
psql "$DATABASE_URL" -f sql/schema.sql
psql "$DATABASE_URL" -f sql/erp_state.sql
```

Create the initial boss account once from a trusted administration environment:

```bash
npm run seed:boss
```

The seed script refuses to overwrite an existing account and hashes passwords with Argon2id. Do not pass passwords on the command line in production; use a secret manager or hidden prompt.

Start the service:

```bash
npm start
```

## Flow

1. The boss logs in at `POST /auth/login` and receives a short-lived access token.
2. The boss calls `POST /admin/invitations` with `Authorization: Bearer <token>` and `{ "email": "member@example.com" }`.
3. The service generates a 256-bit random invitation token, stores only its SHA-256 hash, and expires it after `INVITATION_TTL_HOURS`.
4. Replace `sendInvitationEmail` in `src/server.js` with your email provider. The raw registration URL is passed to that adapter and is never stored.
5. The invited person submits the token and a password to `POST /auth/register`. Registration always creates a `member` role, marks the invitation used in the same transaction, and rejects expired, revoked, or reused invitations.

The ERP frontend uses the authenticated API routes below. ERP records are stored in the shared `erp_state` JSONB row in Supabase; the browser does not store accounts, passwords, ERP records, or local backups.

- `GET /api/auth/me` validates the current access token.
- `GET /api/erp/state` loads the shared ERP state for an authenticated user.
- `PUT /api/erp/state` saves the shared ERP state for an authenticated user.
- `GET /api/admin/users` lists users for the boss only.

The static `index.html` is served at the same origin as `api/index.js` on Vercel, so the frontend calls `/api/*` without exposing database credentials.

Example login:

```bash
curl -s http://localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"boss@example.com","password":"replace-with-a-local-test-password"}'
```

Example boss-only invite:

```bash
curl -s http://localhost:3000/admin/invitations \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"email":"member@example.com"}'
```

Example registration request:

```bash
curl -s http://localhost:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{"token":"token-from-email","password":"a-strong-member-password"}'
```

## Security notes

- Authorization is checked server-side against the current database role, not only the JWT claim.
- Invitation token hashes, not raw tokens, are stored.
- Registration uses `SELECT ... FOR UPDATE` and a transaction to prevent concurrent token reuse.
- User emails are unique and registration never accepts a caller-supplied role.
- Put the API behind HTTPS, configure a real email provider, add audit logging, and use secure HttpOnly cookies instead of bearer tokens when appropriate for your client.
- Set `DATABASE_URL` and a long random `JWT_SECRET` as Vercel Production and Preview secrets. Never commit either value.
- Run `npm run seed:boss` once from a trusted terminal against the intended Supabase database; the frontend has no public signup or first-account setup.
