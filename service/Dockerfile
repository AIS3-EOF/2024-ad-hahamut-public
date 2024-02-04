FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /app
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY src/ src/
COPY views/ views/
COPY public/ public/

ENTRYPOINT ["tini", "--"]
CMD ["yarn", "start"]
