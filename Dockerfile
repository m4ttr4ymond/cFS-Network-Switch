FROM alpine

RUN mkdir -p /srv/webapp

WORKDIR /srv/webapp

RUN apk install npm

# http
EXPOSE 8080
# udp
EXPOSE 8082