# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && \
    npx playwright install --with-deps

COPY --from=builder /app/dist ./dist

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/app.js"]
