FROM node:alpine
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

# RUN apk add --no-cache curl

USER node

COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . ./

COPY crontabs /home/node/crontabs

# start crond with log level 8 in foreground, output to stderr
# CMD ["crond", "-f", "-d", "8"]
CMD ["crond", "-c", "/home/node/crontabs", "-l", "0", "-d", "0", "-f"]
