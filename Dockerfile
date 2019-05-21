FROM node:alpine
WORKDIR app

# RUN apk add --no-cache curl

USER node

COPY package*.json ./
RUN npm install
COPY . ./

COPY crontabs /home/node/crontabs

# start crond with log level 8 in foreground, output to stderr
# CMD ["crond", "-f", "-d", "8"]
CMD ["crond", "-c", "/home/node/crontabs", "-l", "0", "-d", "0", "-f"]
