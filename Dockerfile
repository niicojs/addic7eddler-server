FROM node:alpine
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v0.1.9/supercronic-linux-amd64 \
    SUPERCRONIC=supercronic-linux-amd64 \
    SUPERCRONIC_SHA1SUM=5ddf8ea26b56d4a7ff6faecdd8966610d5cb9d85

RUN apk add --no-cache curl \
 && curl -fsSLO "$SUPERCRONIC_URL" \
 && echo "${SUPERCRONIC_SHA1SUM}  ${SUPERCRONIC}" | sha1sum -c - \
 && chmod +x "$SUPERCRONIC" \
 && mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" \
 && ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic

USER node

COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . ./

# COPY --chown=node:node crontabs /var/spool/cron/crontabs/node

# USER root

# start crond with log level 8 in foreground, output to stderr
# CMD ["crond", "-f", "-d", "8"]

CMD ["supercronic", "/home/node/app/crontabs"]
