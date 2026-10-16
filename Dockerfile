FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY scripts ./scripts
COPY web ./web
COPY Media/Badges/Star-Struck/PNG/StarStruck_Gold.png ./Media/Badges/Star-Struck/PNG/StarStruck_Gold.png
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node api ./api
COPY --chown=node:node server ./server
RUN apk add --no-cache su-exec && mkdir -p /data && chown node:node /data
ENTRYPOINT ["sh", "-c", "chown node:node /data && exec su-exec node \"$@\"", "--"]
EXPOSE 8080
CMD ["node", "server/http.mjs"]
