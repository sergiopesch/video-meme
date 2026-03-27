FROM node:22-bookworm AS build

WORKDIR /app

COPY client/package.json client/package-lock.json ./client/
COPY server/package.json server/package-lock.json ./server/

RUN npm --prefix client ci
RUN npm --prefix server ci

COPY . .

RUN npm --prefix client run build

FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000
ENV FONT_PATH=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf

COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server ci --omit=dev

COPY --from=build /app/server/index.js ./server/index.js
COPY --from=build /app/server/src ./server/src
COPY --from=build /app/server/public ./server/public
COPY --from=build /app/server/uploads ./server/uploads
COPY --from=build /app/client/dist ./client/dist

EXPOSE 10000

CMD ["node", "server/index.js"]
