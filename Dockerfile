FROM node:16-alpine3.15
COPY dist /app
RUN apk add --no-cache tini && adduser -u 1069 -H -D bot
ENV TZ=Asia/Taipei
USER bot
WORKDIR /app
ENTRYPOINT [ "tini", "--", "node", "index.js" ]
