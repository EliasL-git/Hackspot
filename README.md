# Hackspot

Hackspot is a social coding app built with Next.js 16, Better Auth, MongoDB, and a command/mention feed.

## Features

- Hack Club OAuth via `better-auth`
- @mentions (`@username`) with profile links
- #hashtags for trending discovery
- $commands: `$lines`, `$repo`, `$help`, `$github`
- Orpheus bot onboarding with mention notification
- Public profiles at `/u/[handle]`
- Notifications at `/notifications`
- Post detail view at `/post/[id]`
- Media & GIF Uploads (via AWS S3)
- OpenGraph Link Previews
- Cursor-based Pagination

## Local Development

1) Install dependencies:

```bash
npm ci
```

2) Create `.env` (you can copy from `.env.example`):

```dotenv
MONGODB_URI=mongodb://mongo:password@host:port
HACKCLUB_CLIENT_ID=<client-id>
HACKCLUB_CLIENT_SECRET=<client-secret>
BETTER_AUTH_SECRET=<secret>
BETTER_AUTH_URL=http://localhost:3000
GITHUB_TOKEN=<github-token>

# AWS S3 for Media Uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_S3_BUCKET_NAME=hackspot-uploads
```

3) Start dev server:

```bash
npm run dev
```

4) Open `http://localhost:3000`

## Docker

Build and run container (app listens on 4555 in container):

```bash
docker build -t hackspot .
docker run -p 4555:4555 hackspot
```

## API Routes

- `GET /api/posts`
- `POST /api/posts`
- `GET /api/notifications`
- `PUT /api/notifications`
- `GET /api/user/welcome`
- `GET /api/users/search?q=` for mentions
- `GET /api/hashtags/search?q=` for hashtags
- `GET /api/users/profile/[handle]` for profile data
- `POST /api/upload` for S3 media uploads

## Data Model Notes

- Users store `tags` (e.g., `bot`, `owner`) for badge rendering.
- Posts store `author` object and are enriched with gravatar fallback.
- Mention notification creation occurs in `POST /api/posts` and in Orpheus help handler.

## Production Setup

- Set `BETTER_AUTH_URL=https://hackspot.el4s.dev`
- Add OAuth redirect to Hack Club: `https://hackspot.el4s.dev/api/auth/oauth2/callback/hackclub`
- Ensure MongoDB is reachable by `MONGODB_URI`

## Quick commands

- `npm run lint`
- `npm run build`
- `npm run start`
