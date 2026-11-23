# Single image: Express API + built React app served from the same origin.

FROM node:24-alpine AS build
WORKDIR /app
COPY server/package.json server/package-lock.json server/
COPY client/package.json client/package-lock.json client/
RUN npm ci --prefix server && npm ci --prefix client
COPY server server
COPY client client
RUN npm run build --prefix server \
 && npm run build --prefix client \
 && npm prune --omit=dev --prefix server

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/salary.db \
    CLIENT_DIST=/app/client/dist \
    SEED_ON_EMPTY=true
WORKDIR /app/server
COPY --from=build /app/server/package.json ./
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/client/dist /app/client/dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3001/api/health || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "dist/server.js"]
