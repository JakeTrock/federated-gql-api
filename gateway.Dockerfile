FROM ghcr.io/movio/bramble:v1.4.2

ARG VERSION=SNAPSHOT
ENV GO111MODULE=on

COPY config.json .

EXPOSE 8082
EXPOSE 8083
EXPOSE 8084

CMD [ "/bramble", "-conf", "/config.json" ]