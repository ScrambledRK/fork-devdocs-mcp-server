FROM node:20-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./
COPY src/ ./src/

RUN npm ci
RUN npm run build

EXPOSE 9999

ENV PORT=9999 \
    NODE_ENV=production

CMD ["node", "build/index.js"]
