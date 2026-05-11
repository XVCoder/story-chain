FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY server/ ./server/

WORKDIR /app/server
RUN npx tsc -p tsconfig.build.json

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/server/dist ./server/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/story_chain.db

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
