FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM alpine:3.20

WORKDIR /app

COPY --from=build /app/dist /dist

CMD ["sh", "-c", "rm -rf /static/* && cp -r /dist/* /static/ && tail -f /dev/null"]
