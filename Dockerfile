FROM --platform=linux/amd64 synthetixio/docker-e2e:18.16-ubuntu as base

RUN mkdir /app
WORKDIR /app

RUN apt update && apt install -y nginx

COPY ui/test/e2e/nginx.conf /etc/nginx/sites-available/default

COPY . .

RUN yarn install --frozen-lockfile