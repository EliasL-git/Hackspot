# Use official Node.js lts image
FROM node:20-alpine AS builder

WORKDIR /app

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

# Copy built files and deps from builder stage
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/app ./app

EXPOSE 4555

CMD ["npx", "next", "start", "-p", "4555"]
