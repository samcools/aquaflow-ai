FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=8000

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

COPY backend ./backend
COPY frontend ./frontend
COPY database ./database
COPY docs ./docs
COPY .env.example ./

RUN addgroup -S aquaflow && adduser -S aquaflow -G aquaflow \
    && mkdir -p /app/data /app/storage/private \
    && chown -R aquaflow:aquaflow /app

USER aquaflow

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "backend/server.js"]
