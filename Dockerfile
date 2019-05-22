FROM node:alpine
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node

COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . ./

COPY crontabs /var/spool/cron/crontabs/node
RUN chmod 0600 /var/spool/cron/crontabs/node

USER root

# start crond with log level 8 in foreground, output to stderr
CMD ["crond", "-f", "-d", "8"]
