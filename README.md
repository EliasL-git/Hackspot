# Hackspot

Hackspot is a social coding app built with Next.js 16, Better Auth, MongoDB, and a command/mention feed.

## Features

- Hack Club OAuth via `better-auth`
- GitHub OAuth for syncing lines of code
- @mentions (`@username`) with profile links
- #hashtags for trending discovery
- $commands: `$lines`, `$repo`, `$help`, `$github`
- Orpheus bot onboarding with mention notification
- Public profiles at `/u/[handle]`
- Notifications at `/notifications`
- Post detail view at `/post/[id]`
- Media & GIF Uploads (via AWS S3 or compatible providers)
- OpenGraph Link Previews
- Cursor-based Pagination
- Admin Dashboard & Moderation
- GitHub Stats Integration via OAuth

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
GITHUB_CLIENT_ID=<github-client-id>
GITHUB_CLIENT_SECRET=<github-client-secret>
BETTER_AUTH_SECRET=<secret>
BETTER_AUTH_URL=http://localhost:3000

# GitHub OAuth App (for fetching stats)
GITHUB_CLIENT_ID=<github-client-id>
GITHUB_CLIENT_SECRET=<github-client-secret>

# S3 Compatible Storage for Media Uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_S3_BUCKET_NAME=hackspot-uploads
# Optional: For custom S3 providers (Cloudflare R2, MinIO, etc.)
AWS_ENDPOINT_URL_S3=https://your-custom-endpoint.com
AWS_FORCE_PATH_STYLE=false
# Optional: Explicit public URL for serving files (e.g., CDN or custom domain)
AWS_S3_PUBLIC_URL=https://storageperk.s3.fra.databucket.eu/hackspot-uploads
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
docker run -p 4555:3000 hackspot
```

## Promoting an Admin

You can promote a user to admin using the built-in CLI script. This works both locally and inside the Docker container:

```bash
npm run promote -- user@example.com
```

If you are running the app via Docker Compose, you can execute the script inside the running container:
```bash
docker compose exec web npm run promote -- user@example.com
```

Alternatively, you can manually add the `"admin"` string to the `tags` array for a specific user directly in your MongoDB database.

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
- `GET /api/admin/stats` for admin dashboard metrics

## Quick commands

- `npm run lint`
- `npm run build`
- `npm run start`
