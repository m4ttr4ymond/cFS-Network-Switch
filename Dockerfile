FROM alpine

RUN mkdir -p /srv/webapp

WORKDIR /srv/webapp

RUN apk install npm

EXPOSE 8080