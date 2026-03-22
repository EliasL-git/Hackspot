# Use official Node.js lts image
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time args (for Next.js to generate proper runtime config)
ARG MONGODB_URI
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG HACKCLUB_CLIENT_ID
ARG HACKCLUB_CLIENT_SECRET
ARG GITHUB_TOKEN

ENV MONGODB_URI=${MONGODB_URI}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV HACKCLUB_CLIENT_ID=${HACKCLUB_CLIENT_ID}
ENV HACKCLUB_CLIENT_SECRET=${HACKCLUB_CLIENT_SECRET}
ENV GITHUB_TOKEN=${GITHUB_TOKEN}

# Copy package files and install dependencies
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src
COPY public ./public

RUN npm ci
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

ARG MONGODB_URI
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG HACKCLUB_CLIENT_ID
ARG HACKCLUB_CLIENT_SECRET
ARG GITHUB_TOKEN

# Re-propagate runtime env from build args when running container
ENV MONGODB_URI=${MONGODB_URI}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV HACKCLUB_CLIENT_ID=${HACKCLUB_CLIENT_ID}
ENV HACKCLUB_CLIENT_SECRET=${HACKCLUB_CLIENT_SECRET}
ENV GITHUB_TOKEN=${GITHUB_TOKEN}

# Copy built files and deps from builder stage
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 4555

CMD ["npx", "next", "start", "-p", "4555"]
