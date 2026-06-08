# HERA Arquiteto worker — deploy Railway/Contabo
# Root directory no Railway: apps/worker

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY CLAUDE.md ./
COPY .claude ./.claude

RUN npm run build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/CLAUDE.md ./
COPY --from=build /app/.claude ./.claude

CMD ["node", "dist/index.js"]
