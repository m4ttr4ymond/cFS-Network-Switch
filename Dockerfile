FROM alpine

RUN mkdir -p /srv/webapp

WORKDIR /srv/webapp

ADD ./test_server /srv/webapp

RUN apk add npm

RUN npm update
RUN npm install

RUN npm install pm2 -g

# http
EXPOSE 8080

CMD pm2 --name "cFS Server" --cwd /srv/webapp start npm  -- start && pm2 log