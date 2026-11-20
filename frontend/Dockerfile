FROM node:24-alpine AS build

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY src ./src
COPY index.html ./
COPY public ./public
RUN npm run build

FROM nginx:1.28-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 0555 /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1

