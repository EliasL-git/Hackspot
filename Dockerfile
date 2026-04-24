FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

ARG MONGODB_URI
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG HACKCLUB_CLIENT_ID
ARG HACKCLUB_CLIENT_SECRET
ARG GITHUB_TOKEN
ARG AWS_REGION
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_S3_BUCKET_NAME
ARG AWS_ENDPOINT_URL_S3
ARG AWS_FORCE_PATH_STYLE
ARG AWS_S3_PUBLIC_URL

ENV MONGODB_URI=$MONGODB_URI
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV HACKCLUB_CLIENT_ID=$HACKCLUB_CLIENT_ID
ENV HACKCLUB_CLIENT_SECRET=$HACKCLUB_CLIENT_SECRET
ENV GITHUB_TOKEN=$GITHUB_TOKEN
ENV AWS_REGION=$AWS_REGION
ENV AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
ENV AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
ENV AWS_S3_BUCKET_NAME=$AWS_S3_BUCKET_NAME
ENV AWS_ENDPOINT_URL_S3=$AWS_ENDPOINT_URL_S3
ENV AWS_FORCE_PATH_STYLE=$AWS_FORCE_PATH_STYLE
ENV AWS_S3_PUBLIC_URL=$AWS_S3_PUBLIC_URL

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install tsx globally so npm run promote works in the container
RUN npm install -g tsx

COPY --from=builder /app/public ./public
# Copy scripts and config needed for CLI tools
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/src/models ./src/models
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/package.json ./

# Install production dependencies so scripts have access to dotenv, mongoose, etc.
RUN npm install --omit=dev

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
