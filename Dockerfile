FROM node:alpine
WORKDIR app

COPY package*.json ./
RUN npm install
COPY . ./

COPY crontab /etc/crontabs/node

# start crond with log level 8 in foreground, output to stderr
CMD ["crond", "-f", "-d", "8"]
